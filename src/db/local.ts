/**
 * Base local (IndexedDB vía Dexie): una tabla por TableName del contrato + `outbox`
 * (cola de cambios pendientes de subir) + `meta` (cursores de sincronización, userId…).
 */
import Dexie, { type Table } from 'dexie'
import type {
  Activity,
  BodyLog,
  FoodFavorite,
  FoodLog,
  ImportRecord,
  Session,
  SessionSet,
  Settings,
  Shift,
  SyncMeta,
  TableMap,
  TableName,
} from '../domain/types'
import type { MetaItem, OutboxItem } from './types'

export class RutaDB extends Dexie {
  declare settings: Table<Settings, string>
  declare body_logs: Table<BodyLog, string>
  declare sessions: Table<Session, string>
  declare session_sets: Table<SessionSet, string>
  declare activities: Table<Activity, string>
  declare shifts: Table<Shift, string>
  declare food_logs: Table<FoodLog, string>
  declare food_favorites: Table<FoodFavorite, string>
  declare imports: Table<ImportRecord, string>
  declare outbox: Table<OutboxItem, number>
  declare meta: Table<MetaItem, string>

  constructor(name = 'ruta85') {
    super(name)
    this.version(1).stores({
      settings: 'id, updated_at',
      body_logs: 'id, date, updated_at',
      sessions: 'id, date, source_ref, updated_at',
      session_sets: 'id, session_id, updated_at',
      activities: 'id, date, updated_at',
      shifts: 'id, date, updated_at',
      food_logs: 'id, date, updated_at',
      food_favorites: 'id, updated_at',
      imports: 'id, file_hash, updated_at',
      outbox: '++seq, table, id',
      meta: 'key',
    })
  }
}

export const db = new RutaDB()

/**
 * Tablas sincronizadas, en orden seguro para claves foráneas (sessions antes que session_sets).
 * El Record obliga a que no falte ninguna clave de TableMap.
 */
const ALL_TABLES: Record<TableName, true> = {
  settings: true,
  body_logs: true,
  sessions: true,
  session_sets: true,
  activities: true,
  shifts: true,
  food_logs: true,
  food_favorites: true,
  imports: true,
}
export const TABLE_NAMES = Object.keys(ALL_TABLES) as TableName[]

/** Acceso tipado a una tabla por nombre. */
export function tbl<K extends TableName>(name: K): Table<TableMap[K], string> {
  return db.table(name) as Table<TableMap[K], string>
}

// ───────────────────────── Utilidades ─────────────────────────

export function nowISO(): string {
  return new Date().toISOString()
}

/**
 * Marca de tiempo para un cambio local: ahora, pero nunca anterior (ni igual) a la de la
 * versión previa de la fila, aunque el reloj local vaya atrasado respecto a otro dispositivo.
 */
export function stampAfter(prev?: Pick<SyncMeta, 'updated_at'> | null): string {
  const now = Date.now()
  const before = prev ? Date.parse(prev.updated_at) : NaN
  return new Date(Number.isFinite(before) && before >= now ? before + 1 : now).toISOString()
}

/** uuid v4; crypto.randomUUID solo existe en contextos seguros, de ahí el respaldo. */
export function newId(): string {
  const c = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID()
  const b = new Uint8Array(16)
  if (c && typeof c.getRandomValues === 'function') c.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = (b[6]! & 0x0f) | 0x40
  b[8] = (b[8]! & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0'))
  return `${h.slice(0, 4).join('')}-${h.slice(4, 6).join('')}-${h.slice(6, 8).join('')}-${h.slice(8, 10).join('')}-${h.slice(10).join('')}`
}

// ───────────────────────── Outbox ─────────────────────────

/** Encola cambios para la próxima sincronización (el push lee el estado actual de la fila). */
export async function enqueue(table: TableName, ids: string | string[]): Promise<void> {
  const list = Array.isArray(ids) ? ids : [ids]
  if (list.length === 0) return
  const at = nowISO()
  await db.outbox.bulkAdd(list.map((id) => ({ table, id, at })))
}

/** Elimina del outbox las entradas de esas filas (p. ej. si la fila local se descarta). */
export async function purgeOutbox(table: TableName, ids: string[]): Promise<void> {
  if (ids.length === 0) return
  await db.outbox
    .where('id')
    .anyOf(ids)
    .and((o) => o.table === table)
    .delete()
}

/** Número de filas distintas pendientes de subir. */
export async function countPending(): Promise<number> {
  const keys = new Set<string>()
  await db.outbox.each((o) => {
    keys.add(`${o.table}:${o.id}`)
  })
  return keys.size
}

// ───────────────────────── Meta ─────────────────────────

export async function getMeta<T>(key: string): Promise<T | undefined> {
  return (await db.meta.get(key))?.value as T | undefined
}

export async function setMeta(key: string, value: unknown): Promise<void> {
  await db.meta.put({ key, value })
}

/** Borra todos los datos locales (tablas, outbox y meta). Útil para pruebas y "olvidar este dispositivo". */
export async function clearLocalData(): Promise<void> {
  await db.transaction('rw', [...db.tables], async () => {
    for (const t of db.tables) await t.clear()
  })
}
