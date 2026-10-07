/**
 * Sincronización Dexie ⇄ Supabase (local-first).
 *
 * Orden de cada ciclo: adoptar filas locales sin dueño → DESCARGAR cambios del servidor y
 * fusionarlos con "último cambio gana" → SUBIR el outbox. Se descarga antes de subir para que
 * un cambio local más antiguo nunca pise uno más reciente del servidor (y para detectar
 * colisiones de claves naturales antes de violar un índice único). Además el trigger SQL
 * ruta85_lww descarta en el servidor las escrituras con updated_at más antiguo.
 *
 * Sin Supabase, sin sesión o sin conexión: no falla; el outbox queda a la espera.
 */
import { liveQuery } from 'dexie'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { TableName } from '../domain/types'
import { authStore } from './auth'
import { supabase } from './client'
import { countPending, db, getMeta, nowISO, setMeta, TABLE_NAMES, enqueue } from './local'
import { applyIncoming } from './merge'
import { createStore } from './store'
import type { AnyRow, OutboxItem, SyncStatus } from './types'

export { mergeLww } from './merge'

const PAGE_SIZE = 1000
const PUSH_CHUNK = 200
const DEBOUNCE_MS = 2000
const INTERVAL_MS = 5 * 60 * 1000

function isOnline(): boolean {
  return typeof navigator === 'undefined' || navigator.onLine !== false
}

export const syncStore = createStore<SyncStatus>({
  mode: 'local',
  online: isOnline(),
  syncing: false,
  lastSyncAt: null,
  pending: 0,
  error: null,
})

function messageOf(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}

export async function refreshPending(): Promise<void> {
  try {
    syncStore.set({ pending: await countPending() })
  } catch {
    /* base cerrada o sin IndexedDB */
  }
}

// ───────────────────────── Normalización ─────────────────────────

const TIMESTAMP_FIELDS = ['updated_at', 'imported_at'] as const

/** Fila de Supabase → fila local (sin synced_at y con marcas de tiempo en ISO canónico). */
function fromRemote(raw: Record<string, unknown>): AnyRow {
  const { synced_at: _syncedAt, ...rest } = raw
  for (const k of TIMESTAMP_FIELDS) {
    const v = rest[k]
    if (typeof v === 'string') {
      const t = Date.parse(v)
      if (Number.isFinite(t)) rest[k] = new Date(t).toISOString()
    }
  }
  return rest as AnyRow
}

// ───────────────────────── Adopción de filas locales ─────────────────────────

/**
 * Al iniciar sesión, las filas locales sin user_id pasan a ser del usuario. Si entra una cuenta
 * distinta de la anterior se reinician los cursores y se vuelve a encolar todo.
 */
async function adoptLocalRows(userId: string): Promise<void> {
  const prev = await getMeta<string>('userId')
  if (prev === userId) return
  const reenqueue = prev !== undefined
  for (const table of TABLE_NAMES) {
    const t = db.table(table)
    await t.toCollection().modify({ user_id: userId })
    if (reenqueue) {
      await setMeta(`lastPulledAt:${table}`, null)
      await enqueue(table, (await t.toCollection().primaryKeys()) as string[])
    }
  }
  await setMeta('userId', userId)
}

// ───────────────────────── Descarga ─────────────────────────

async function pullTable(client: SupabaseClient, userId: string, table: TableName): Promise<number> {
  const cursorKey = `lastPulledAt:${table}`
  const cursor = (await getMeta<string | null>(cursorKey)) ?? null
  let maxRaw = cursor
  let maxMs = cursor ? Date.parse(cursor) : -Infinity
  let offset = 0
  let applied = 0

  for (;;) {
    let q = client.from(table).select('*').eq('user_id', userId)
    // gte (no gt): se repiten las filas del límite; fusionar es idempotente.
    if (cursor) q = q.gte('synced_at', cursor)
    const { data, error } = await q
      .order('synced_at', { ascending: true })
      .order('id', { ascending: true })
      .range(offset, offset + PAGE_SIZE - 1)
    if (error) throw new Error(`${table}: ${error.message}`)
    const rows = (data ?? []) as Record<string, unknown>[]

    if (rows.length > 0) {
      const res = await applyIncoming(table, rows.map(fromRemote), 'remote')
      applied += res.applied
      for (const r of rows) {
        const raw = r.synced_at
        if (typeof raw !== 'string') continue
        const ms = Date.parse(raw)
        if (Number.isFinite(ms) && ms > maxMs) {
          maxMs = ms
          maxRaw = raw
        }
      }
    }
    if (rows.length < PAGE_SIZE) break
    offset += PAGE_SIZE
  }

  if (maxRaw !== cursor) await setMeta(cursorKey, maxRaw)
  return applied
}

// ───────────────────────── Subida ─────────────────────────

interface PushResult {
  pushed: number
  error: string | null
}

/** Errores de red/servidor/sesión: se abortan; los de datos (constraint) se aíslan fila a fila. */
function isTransient(error: { code?: string }, status: number): boolean {
  return !error.code || status >= 500 || status === 401 || status === 429
}

async function pushOutbox(client: SupabaseClient, userId: string): Promise<PushResult> {
  const entries = await db.outbox.orderBy('seq').toArray()
  if (entries.length === 0) return { pushed: 0, error: null }

  const byTable = new Map<TableName, OutboxItem[]>()
  for (const e of entries) {
    const list = byTable.get(e.table)
    if (list) list.push(e)
    else byTable.set(e.table, [e])
  }

  let pushed = 0
  let firstError: string | null = null

  for (const table of TABLE_NAMES) {
    const items = byTable.get(table)
    if (!items) continue
    const ids = [...new Set(items.map((i) => i.id))]
    const found = (await db.table(table).bulkGet(ids)) as (AnyRow | undefined)[]
    const rows = found.filter((r): r is AnyRow => r !== undefined)
    const present = new Set(rows.map((r) => r.id))
    const payload = rows.map((r) => ({ ...r, user_id: userId }))
    // Los borrados primero: liberan los índices únicos parciales antes de insertar la fila que los reemplaza.
    const ordered = [...payload.filter((r) => r.deleted), ...payload.filter((r) => !r.deleted)]
    const okIds = new Set<string>()

    for (let i = 0; i < ordered.length; i += PUSH_CHUNK) {
      const chunk = ordered.slice(i, i + PUSH_CHUNK)
      const res = await client.from(table).upsert(chunk, { onConflict: 'id' })
      if (!res.error) {
        for (const r of chunk) okIds.add(r.id)
        continue
      }
      if (isTransient(res.error, res.status)) throw new Error(`${table}: ${res.error.message}`)
      // Un dato inválido no debe bloquear al resto: se reintenta fila a fila.
      for (const row of chunk) {
        const one = await client.from(table).upsert(row, { onConflict: 'id' })
        if (!one.error) okIds.add(row.id)
        else if (isTransient(one.error, one.status)) throw new Error(`${table}: ${one.error.message}`)
        else firstError ??= `${table}: ${one.error.message}`
      }
    }

    // Se limpian solo las entradas que ya viajaron (o cuya fila ya no existe).
    const doneSeqs = items.filter((i) => okIds.has(i.id) || !present.has(i.id)).map((i) => i.seq as number)
    if (doneSeqs.length > 0) await db.outbox.bulkDelete(doneSeqs)
    if (okIds.size > 0) {
      await db.table(table).where('id').anyOf([...okIds]).modify({ user_id: userId })
    }
    pushed += okIds.size
  }
  return { pushed, error: firstError }
}

// ───────────────────────── Ciclo completo ─────────────────────────

async function runOnce(): Promise<void> {
  const client = supabase
  if (!client) {
    syncStore.set({ mode: 'local' })
    await refreshPending()
    return
  }
  const online = isOnline()
  syncStore.set({ online })
  if (!online) return

  let userId: string | undefined
  try {
    userId = (await client.auth.getSession()).data.session?.user.id
  } catch {
    userId = undefined
  }
  if (!userId) {
    syncStore.set({ mode: 'local' })
    await refreshPending()
    return
  }

  syncStore.set({ mode: 'cloud', syncing: true })
  try {
    await adoptLocalRows(userId)
    for (const table of TABLE_NAMES) await pullTable(client, userId, table)
    const push = await pushOutbox(client, userId)
    if (push.error) {
      syncStore.set({ error: push.error })
    } else {
      const at = nowISO()
      await setMeta('lastSyncAt', at)
      syncStore.set({ lastSyncAt: at, error: null })
    }
  } catch (e) {
    syncStore.set({ error: messageOf(e) })
  } finally {
    syncStore.set({ syncing: false })
    await refreshPending()
  }
}

let running: Promise<SyncStatus> | null = null
let again = false

/** Sincroniza ahora. Nunca rechaza; el resultado queda en syncStore. Las llamadas solapadas se agrupan. */
export function syncNow(): Promise<SyncStatus> {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    try {
      do {
        again = false
        await runOnce()
      } while (again)
    } catch (e) {
      syncStore.set({ syncing: false, error: messageOf(e) })
    } finally {
      running = null
    }
    return syncStore.get()
  })()
  return running
}

// ───────────────────────── Disparadores ─────────────────────────

let started = false
let timer: ReturnType<typeof setTimeout> | null = null
let teardown: (() => void)[] = []

/** Pide una sincronización con debounce (2 s). Solo actúa si hay Supabase y startSync() está activo. */
export function requestSync(delayMs: number = DEBOUNCE_MS): void {
  if (!supabase || !started) return
  if (timer) clearTimeout(timer)
  timer = setTimeout(() => {
    timer = null
    void syncNow()
  }, delayMs)
}

/** Activa los disparadores (sesión, online, visibilidad, intervalo de 5 min). Idempotente; devuelve stop. */
export function startSync(): () => void {
  if (started) return stopSync
  started = true

  void getMeta<string>('lastSyncAt')
    .then((v) => {
      if (v) syncStore.set({ lastSyncAt: v })
    })
    .catch(() => {})

  const pendingSub = liveQuery(countPending).subscribe({
    next: (n) => syncStore.set({ pending: n }),
    error: () => {},
  })
  teardown.push(() => pendingSub.unsubscribe())

  // Cambios de sesión. Se difiere para no llamar a supabase desde dentro de onAuthStateChange.
  let lastUserId: string | null = null
  const onAuth = () => {
    const user = authStore.get().user
    syncStore.set({ mode: supabase && user ? 'cloud' : 'local' })
    if (user && user.id !== lastUserId) setTimeout(() => void syncNow(), 0)
    lastUserId = user?.id ?? null
  }
  teardown.push(authStore.subscribe(onAuth))
  onAuth()

  if (typeof window !== 'undefined') {
    const onOnline = () => {
      syncStore.set({ online: true })
      void syncNow()
    }
    const onOffline = () => syncStore.set({ online: false })
    const onVisible = () => {
      if (document.visibilityState === 'visible') void syncNow()
    }
    window.addEventListener('online', onOnline)
    window.addEventListener('offline', onOffline)
    document.addEventListener('visibilitychange', onVisible)
    const iv = setInterval(() => void syncNow(), INTERVAL_MS)
    teardown.push(() => {
      window.removeEventListener('online', onOnline)
      window.removeEventListener('offline', onOffline)
      document.removeEventListener('visibilitychange', onVisible)
      clearInterval(iv)
    })
  }
  return stopSync
}

export function stopSync(): void {
  for (const fn of teardown) fn()
  teardown = []
  if (timer) clearTimeout(timer)
  timer = null
  started = false
}
