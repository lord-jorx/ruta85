/**
 * Hooks de lectura reactiva (liveQuery de Dexie). Todos excluyen filas borradas y se
 * actualizan solos cuando cambian los datos (también tras una sincronización).
 * Mientras carga devuelven el valor inicial (listas vacías / ajustes por defecto).
 */
import { liveQuery } from 'dexie'
import { useEffect, useState, useSyncExternalStore } from 'react'
import type {
  Activity,
  BodyLog,
  FoodFavorite,
  FoodLog,
  ImportRecord,
  ISODate,
  Settings,
  Shift,
} from '../domain/types'
import { authStore } from './auth'
import { db } from './local'
import { DEFAULT_SETTINGS } from './repo'
import { startDb } from './start'
import { syncStore } from './sync'
import type { ActivityRange, AuthState, SessionWithSets, SyncStatus } from './types'

/** Suscribe un componente a una consulta viva. `deps` identifica la consulta (como en useEffect). */
function useLive<T>(query: () => Promise<T>, deps: readonly unknown[], initial: T): T {
  const [value, setValue] = useState<T>(initial)
  useEffect(() => {
    startDb()
    const sub = liveQuery(query).subscribe({
      next: setValue,
      error: (e) => console.error('[db] consulta fallida', e),
    })
    return () => sub.unsubscribe()
    // `query` queda descrita por `deps`
  }, deps)
  return value
}

const byDate = <T extends { date: ISODate }>(a: T, b: T): number => a.date.localeCompare(b.date)

const EMPTY_SETTINGS: Settings = { ...DEFAULT_SETTINGS }
const EMPTY: never[] = []

export function useSettings(): Settings {
  return useLive(
    async () => {
      const rows = (await db.settings.toArray()).filter((r) => !r.deleted)
      rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at))
      return rows[0] ?? { ...DEFAULT_SETTINGS }
    },
    [],
    EMPTY_SETTINGS,
  )
}

/** Pesadas ordenadas por fecha ascendente. */
export function useBodyLogs(): BodyLog[] {
  return useLive(
    async () => (await db.body_logs.orderBy('date').toArray()).filter((r) => !r.deleted),
    [],
    EMPTY as BodyLog[],
  )
}

/** Sesiones por fecha ascendente, cada una con sus series vivas ordenadas por set_index. */
export function useSessionsWithSets(): SessionWithSets[] {
  return useLive(
    async () => {
      const [sessions, sets] = await Promise.all([db.sessions.orderBy('date').toArray(), db.session_sets.toArray()])
      const bySession = new Map<string, SessionWithSets['sets']>()
      for (const s of sets) {
        if (s.deleted) continue
        const list = bySession.get(s.session_id)
        if (list) list.push(s)
        else bySession.set(s.session_id, [s])
      }
      return sessions
        .filter((s) => !s.deleted)
        .map((s) => ({ ...s, sets: (bySession.get(s.id) ?? []).sort((a, b) => a.set_index - b.set_index) }))
    },
    [],
    EMPTY as SessionWithSets[],
  )
}

/** Actividades por fecha ascendente; `range` (inclusivo) es opcional. */
export function useActivities(range?: ActivityRange): Activity[] {
  const from = range?.from
  const to = range?.to
  return useLive(
    async () => {
      const col =
        from !== undefined || to !== undefined
          ? db.activities.where('date').between(from ?? '', to ?? '￿', true, true)
          : db.activities.toCollection()
      return (await col.toArray()).filter((r) => !r.deleted).sort(byDate)
    },
    [from, to],
    EMPTY as Activity[],
  )
}

export function useShifts(): Shift[] {
  return useLive(
    async () => (await db.shifts.orderBy('date').toArray()).filter((r) => !r.deleted),
    [],
    EMPTY as Shift[],
  )
}

export function useFoodLogs(date: ISODate): FoodLog[] {
  return useLive(
    async () =>
      (await db.food_logs.where('date').equals(date).toArray())
        .filter((r) => !r.deleted)
        .sort((a, b) => a.updated_at.localeCompare(b.updated_at)),
    [date],
    EMPTY as FoodLog[],
  )
}

/** Registros de comida entre dos fechas (inclusivo), por fecha ascendente. */
export function useFoodLogsRange(from: ISODate, to: ISODate): FoodLog[] {
  return useLive(
    async () =>
      (await db.food_logs.where('date').between(from, to, true, true).toArray())
        .filter((r) => !r.deleted)
        .sort(byDate),
    [from, to],
    EMPTY as FoodLog[],
  )
}

export function useFavorites(): FoodFavorite[] {
  return useLive(
    async () =>
      (await db.food_favorites.toArray()).filter((r) => !r.deleted).sort((a, b) => a.label.localeCompare(b.label)),
    [],
    EMPTY as FoodFavorite[],
  )
}

/** Copias de OpenGym importadas, la más reciente primero. */
export function useImports(): ImportRecord[] {
  return useLive(
    async () =>
      (await db.imports.toArray()).filter((r) => !r.deleted).sort((a, b) => b.imported_at.localeCompare(a.imported_at)),
    [],
    EMPTY as ImportRecord[],
  )
}

export function useSyncStatus(): SyncStatus {
  useEffect(() => {
    startDb()
  }, [])
  return useSyncExternalStore(syncStore.subscribe, syncStore.get, syncStore.get)
}

export function useAuth(): AuthState {
  useEffect(() => {
    startDb()
  }, [])
  return useSyncExternalStore(authStore.subscribe, authStore.get, authStore.get)
}
