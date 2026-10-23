/**
 * API de datos que usan las pantallas. Todas las escrituras: rellenan id (uuid), updated_at
 * (ISO, siempre posterior a la versión previa) y deleted:false, escriben en Dexie, encolan en el
 * outbox y piden una sincronización con debounce. Los borrados son lógicos.
 */
import type {
  Activity,
  BodyLog,
  FoodFavorite,
  FoodLog,
  ImportRecord,
  ISODate,
  Session,
  SessionSet,
  Settings,
  Shift,
  SyncMeta,
  TableMap,
  TableName,
} from '../domain/types'
import { GARMIN_NOTE_PREFIX } from '../lib/garmin'
import { db, enqueue, newId, nowISO, stampAfter, TABLE_NAMES, tbl } from './local'
import { applyIncoming } from './merge'
import { requestSync } from './sync'
import type {
  AnyRow,
  BodyLogPatch,
  ExportFile,
  FavoriteInput,
  FoodLogPatch,
  ImportOpenGymOptions,
  ImportGarminResult,
  ImportOpenGymResult,
  NewActivity,
  NewFoodLog,
  ParsedOpenGym,
  SettingsPatch,
} from './types'

// ───────────────────────── Utilidades internas ─────────────────────────

const OUTBOX = 'outbox'

/** Transacción de escritura sobre esas tablas (+ outbox) y petición de sync al confirmar. */
async function write<T>(tables: TableName[], fn: () => Promise<T>): Promise<T> {
  const result = await db.transaction('rw', [...new Set<string>([...tables, OUTBOX])], fn)
  requestSync()
  return result
}

/** Guarda filas y las encola. */
async function putRows<K extends TableName>(name: K, rows: TableMap[K][]): Promise<void> {
  if (rows.length === 0) return
  await tbl(name).bulkPut(rows)
  await enqueue(name, rows.map((r) => r.id))
}

/** Borrado lógico de una fila; devuelve true si había algo que borrar. */
async function softDelete<K extends TableName>(name: K, id: string): Promise<boolean> {
  return write([name], async () => {
    const row = await tbl(name).get(id)
    if (!row || row.deleted) return false
    await putRows(name, [{ ...row, deleted: true, updated_at: stampAfter(row) } as TableMap[K]])
    return true
  })
}

const live = <T extends SyncMeta>(r: T): boolean => !r.deleted

/** Pesada vacía de una fecha (base sobre la que se fusionan los campos). */
function blankBodyLog(date: ISODate): BodyLog {
  return {
    id: '',
    updated_at: '',
    deleted: false,
    user_id: null,
    date,
    weight: null,
    waist: null,
    knee_pain: null,
    note: null,
    source: 'app',
  }
}

function assertRange(label: string, v: number | null | undefined, min: number, max: number): void {
  if (v === null || v === undefined) return
  if (!Number.isFinite(v) || v < min || v > max) {
    throw new RangeError(`${label} fuera de rango (${min}-${max}): ${v}`)
  }
}

// ───────────────────────── Ajustes ─────────────────────────

export const DEFAULT_SETTINGS: Settings = {
  id: 'settings-default',
  updated_at: '1970-01-01T00:00:00.000Z',
  deleted: false,
  user_id: null,
  start_date: '2026-10-05',
  goal_date: '2027-09-18',
  // Valores de ejemplo: los reales se ponen en Ajustes y viven en la base de datos, no en el código.
  goal_weight: 75,
  height_cm: 175,
  protein_min: 120,
  protein_max: 150,
  kcal_maintenance_manual: null,
  deficit_kcal: 400,
}

async function currentSettingsRow(): Promise<Settings | undefined> {
  const rows = (await db.settings.toArray()).filter(live)
  return rows.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
}

/** Fila única de ajustes; si aún no existe devuelve los valores por defecto (sin guardarlos). */
export async function getSettings(): Promise<Settings> {
  return (await currentSettingsRow()) ?? { ...DEFAULT_SETTINGS }
}

export async function saveSettings(patch: SettingsPatch): Promise<Settings> {
  return write(['settings'], async () => {
    const existing = await currentSettingsRow()
    const base = existing ?? DEFAULT_SETTINGS
    const row: Settings = {
      ...base,
      ...patch,
      id: existing?.id ?? newId(),
      updated_at: stampAfter(existing),
      deleted: false,
    }
    await putRows('settings', [row])
    return row
  })
}

// ───────────────────────── Cuerpo ─────────────────────────

/** Crea o fusiona la pesada de esa fecha (una por fecha). Los campos undefined no se tocan; null sí borra. */
export async function upsertBodyLog(date: ISODate, patch: BodyLogPatch): Promise<BodyLog> {
  assertRange('Peso', patch.weight, 30, 250)
  assertRange('Cintura', patch.waist, 40, 200)
  assertRange('Dolor de rodilla', patch.knee_pain, 0, 10)
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as BodyLogPatch
  if (defined.knee_pain != null) defined.knee_pain = Math.round(defined.knee_pain)

  return write(['body_logs'], async () => {
    const all = await db.body_logs.where('date').equals(date).toArray()
    const current = all.find(live)
    // Si solo hay una fila borrada de esa fecha, se reutiliza su id (no se acumulan tombstones).
    const prev = current ?? all.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
    const row: BodyLog = {
      ...(current ?? blankBodyLog(date)),
      ...defined,
      id: prev?.id ?? newId(),
      date,
      source: 'app',
      updated_at: stampAfter(prev),
      deleted: false,
      user_id: prev?.user_id ?? null,
    }
    await putRows('body_logs', [row])
    return row
  })
}

export async function deleteBodyLog(id: string): Promise<boolean> {
  return softDelete('body_logs', id)
}

// ───────────────────────── Actividades ─────────────────────────

export async function addActivity(input: NewActivity): Promise<Activity> {
  return write(['activities'], async () => {
    const row: Activity = {
      id: newId(),
      updated_at: nowISO(),
      deleted: false,
      user_id: null,
      date: input.date,
      kind: input.kind,
      minutes: input.minutes,
      note: input.note ?? null,
    }
    await putRows('activities', [row])
    return row
  })
}

export async function deleteActivity(id: string): Promise<boolean> {
  return softDelete('activities', id)
}

/**
 * Importa actividades de Garmin de una vez. Idempotente: una fila es repetida si ya hay una actividad viva
 * con la misma fecha, tipo y minutos cuya nota empieza por «Garmin · », o si se repite dentro del propio lote.
 */
export async function importGarminActivities(rows: NewActivity[]): Promise<ImportGarminResult> {
  return write(['activities'], async () => {
    const key = (r: { date: string; kind: string; minutes: number }) => `${r.date}|${r.kind}|${r.minutes}`
    const seen = new Set<string>()
    for (const a of await db.activities.toArray()) {
      if (live(a) && a.note?.startsWith(GARMIN_NOTE_PREFIX)) seen.add(key(a))
    }
    const fresh: Activity[] = []
    let duplicates = 0
    for (const r of rows) {
      const k = key(r)
      if (seen.has(k)) {
        duplicates++
        continue
      }
      seen.add(k)
      fresh.push({
        id: newId(),
        updated_at: nowISO(),
        deleted: false,
        user_id: null,
        date: r.date,
        kind: r.kind,
        minutes: r.minutes,
        note: r.note ?? null,
      })
    }
    await putRows('activities', fresh)
    return { added: fresh.length, duplicates }
  })
}

// ───────────────────────── Guardias ─────────────────────────

/** Marca/desmarca la guardia de esa fecha. Devuelve true si el día queda como guardia. */
export async function toggleShift(date: ISODate): Promise<boolean> {
  return write(['shifts'], async () => {
    const all = await db.shifts.where('date').equals(date).toArray()
    const current = all.find(live)
    if (current) {
      await putRows('shifts', [{ ...current, deleted: true, updated_at: stampAfter(current) }])
      return false
    }
    const old = all.sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0]
    const row: Shift = old
      ? { ...old, deleted: false, updated_at: stampAfter(old) }
      : { id: newId(), updated_at: nowISO(), deleted: false, user_id: null, date }
    await putRows('shifts', [row])
    return true
  })
}

// ───────────────────────── Dieta ─────────────────────────

export async function addFoodLog(input: NewFoodLog): Promise<FoodLog> {
  return write(['food_logs'], async () => {
    const row: FoodLog = {
      id: newId(),
      updated_at: nowISO(),
      deleted: false,
      user_id: null,
      date: input.date,
      meal: input.meal,
      label: input.label,
      kcal: input.kcal,
      protein_g: input.protein_g,
      favorite_id: input.favorite_id ?? null,
    }
    await putRows('food_logs', [row])
    return row
  })
}

export async function updateFoodLog(id: string, patch: FoodLogPatch): Promise<FoodLog | undefined> {
  const defined = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined)) as FoodLogPatch
  return write(['food_logs'], async () => {
    const row = await db.food_logs.get(id)
    if (!row || row.deleted) return undefined
    const next: FoodLog = { ...row, ...defined, id: row.id, updated_at: stampAfter(row), deleted: false }
    await putRows('food_logs', [next])
    return next
  })
}

export async function deleteFoodLog(id: string): Promise<boolean> {
  return softDelete('food_logs', id)
}

/** Crea el favorito, o lo actualiza si `input.id` ya existe. */
export async function saveFavorite(input: FavoriteInput): Promise<FoodFavorite> {
  return write(['food_favorites'], async () => {
    const existing = input.id ? await db.food_favorites.get(input.id) : undefined
    const row: FoodFavorite = {
      id: existing?.id ?? input.id ?? newId(),
      updated_at: stampAfter(existing),
      deleted: false,
      user_id: existing?.user_id ?? null,
      label: input.label,
      kcal: input.kcal,
      protein_g: input.protein_g,
      default_meal: input.default_meal,
    }
    await putRows('food_favorites', [row])
    return row
  })
}

export async function deleteFavorite(id: string): Promise<boolean> {
  return softDelete('food_favorites', id)
}

// ───────────────────────── Importación de OpenGym ─────────────────────────

/**
 * Importa una copia de OpenGym ya analizada. Idempotente y atómica (una transacción Dexie):
 *  - mismo file_hash → { skipped: true };
 *  - sesiones: upsert por source_ref; si existía, se actualiza y sus series se REEMPLAZAN
 *    (borrado lógico de las viejas + series nuevas);
 *  - pesadas: solo se crean en fechas sin pesada de la app (nunca se pisa un registro de la app;
 *    si la fecha tiene un registro de la app sin peso, se rellena el peso sin cambiar su origen).
 */
export async function importOpenGym(
  parsed: ParsedOpenGym,
  { filename, fileHash }: ImportOpenGymOptions,
): Promise<ImportOpenGymResult> {
  const result = await write(['imports', 'sessions', 'session_sets', 'body_logs'], async () => {
    const prevImports = await db.imports.where('file_hash').equals(fileHash).toArray()
    if (prevImports.some(live)) return { skipped: true } as const

    const warnings = [...parsed.warnings]
    const unit = parsed.unit.trim().toLowerCase()
    if (unit && unit !== 'kg' && unit !== 'kgs') {
      warnings.push(`Unidad "${parsed.unit}": los pesos se guardan tal cual, sin convertir a kg.`)
    }
    const counts = { sessions: 0, sets: 0, bodyweights: 0, skippedBodyweights: 0 }

    // Sesiones y series (en serie: cada upsert debe ver lo escrito por el anterior).
    for (const s of parsed.sessions) {
      const existing = (await db.sessions.where('source_ref').equals(s.source_ref).toArray()).find(live)
      const session: Session = {
        id: existing?.id ?? newId(),
        updated_at: stampAfter(existing),
        deleted: false,
        user_id: existing?.user_id ?? null,
        date: s.date,
        routine_code: s.routine_code,
        source: 'opengym',
        source_ref: s.source_ref,
        duration_min: s.duration_min,
        excluded: s.excluded,
      }
      await putRows('sessions', [session])

      if (existing) {
        const old = (await db.session_sets.where('session_id').equals(session.id).toArray()).filter(live)
        await putRows(
          'session_sets',
          old.map((o) => ({ ...o, deleted: true, updated_at: stampAfter(o) })),
        )
      }
      const stamp = nowISO()
      const sets: SessionSet[] = s.sets.map((x) => ({
        id: newId(),
        updated_at: stamp,
        deleted: false,
        user_id: null,
        session_id: session.id,
        exercise_id: x.exercise_id,
        set_index: x.set_index,
        weight: x.weight,
        reps: x.reps,
        sec: x.sec,
        rir: x.rir,
        is_warmup: x.is_warmup,
      }))
      await putRows('session_sets', sets)
      counts.sessions++
      counts.sets += sets.length
    }

    // Pesadas: nunca pisan las de la app.
    for (const b of parsed.bodyweights) {
      if (!Number.isFinite(b.weight) || b.weight < 30 || b.weight > 250) {
        counts.skippedBodyweights++
        warnings.push(`Peso fuera de rango ignorado (${b.date}: ${b.weight}).`)
        continue
      }
      const all = await db.body_logs.where('date').equals(b.date).toArray()
      const current = all.find(live)
      if (!current) {
        const old = all.sort((a, c) => c.updated_at.localeCompare(a.updated_at))[0]
        await putRows('body_logs', [
          {
            ...blankBodyLog(b.date),
            id: old?.id ?? newId(),
            weight: b.weight,
            source: 'opengym',
            updated_at: stampAfter(old),
            user_id: old?.user_id ?? null,
          },
        ])
        counts.bodyweights++
      } else if (current.source === 'opengym' && current.weight !== b.weight) {
        await putRows('body_logs', [{ ...current, weight: b.weight, updated_at: stampAfter(current) }])
        counts.bodyweights++
      } else if (current.source === 'app' && current.weight === null) {
        await putRows('body_logs', [{ ...current, weight: b.weight, updated_at: stampAfter(current) }])
        counts.bodyweights++
      } else {
        counts.skippedBodyweights++
      }
    }

    const stale = prevImports[0]
    const record: ImportRecord = {
      id: stale?.id ?? newId(),
      updated_at: stampAfter(stale),
      deleted: false,
      user_id: stale?.user_id ?? null,
      source: 'opengym',
      filename,
      file_hash: fileHash,
      imported_at: nowISO(),
      counts: { ...counts },
    }
    await putRows('imports', [record])
    return { skipped: false, importId: record.id, counts, warnings } as const
  })
  return result
}

// ───────────────────────── Exportar / importar copia propia ─────────────────────────

export const EXPORT_VERSION = 1

/** Todas las tablas sin filas borradas (ni sus series huérfanas) y sin user_id. */
export async function exportAll(): Promise<ExportFile> {
  const tables = {} as ExportFile['tables']
  const liveSessions = new Set<string>()
  for (const name of TABLE_NAMES) {
    const rows = ((await db.table(name).toArray()) as AnyRow[]).filter(live)
    if (name === 'sessions') for (const r of rows) liveSessions.add(r.id)
    tables[name] = rows
      .filter((r) => name !== 'session_sets' || liveSessions.has(String(r.session_id)))
      .map(({ user_id: _userId, ...rest }) => rest)
  }
  return { app: 'ruta85', version: EXPORT_VERSION, exported_at: nowISO(), tables }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Columnas de cada tabla (sin user_id): lo demás de un archivo importado se descarta. */
const COLUMNS: Record<TableName, readonly string[]> = {
  settings: ['start_date', 'goal_date', 'goal_weight', 'height_cm', 'protein_min', 'protein_max', 'kcal_maintenance_manual', 'deficit_kcal'],
  body_logs: ['date', 'weight', 'waist', 'knee_pain', 'note', 'source'],
  sessions: ['date', 'routine_code', 'source', 'source_ref', 'duration_min', 'excluded'],
  session_sets: ['session_id', 'exercise_id', 'set_index', 'weight', 'reps', 'sec', 'rir', 'is_warmup'],
  activities: ['date', 'kind', 'minutes', 'note'],
  shifts: ['date'],
  food_logs: ['date', 'meal', 'label', 'kcal', 'protein_g', 'favorite_id'],
  food_favorites: ['label', 'kcal', 'protein_g', 'default_meal'],
  imports: ['source', 'filename', 'file_hash', 'imported_at', 'counts'],
}

function isRow(x: unknown): x is AnyRow {
  if (typeof x !== 'object' || x === null) return false
  const r = x as Record<string, unknown>
  return typeof r.id === 'string' && UUID_RE.test(r.id) && typeof r.updated_at === 'string' && Number.isFinite(Date.parse(r.updated_at))
}

/** Copia solo las columnas conocidas: un archivo editado a mano no puede colar campos que Supabase rechace. */
function pickColumns(name: TableName, r: AnyRow): AnyRow {
  const out: Record<string, unknown> = { id: r.id, updated_at: r.updated_at, deleted: r.deleted === true }
  for (const c of COLUMNS[name]) if (c in r) out[c] = (r as Record<string, unknown>)[c]
  return out as AnyRow
}

/**
 * Importa una copia generada por exportAll() fusionando con "último cambio gana" (nunca borra
 * lo local salvo que el archivo traiga una versión más reciente). Devuelve filas aplicadas por tabla.
 */
export async function importAll(obj: unknown): Promise<Partial<Record<TableName, number>>> {
  const file = obj as Partial<ExportFile> | null
  if (!file || typeof file !== 'object' || file.app !== 'ruta85' || typeof file.tables !== 'object' || !file.tables) {
    throw new Error('El archivo no es una copia de Ruta 85.')
  }
  if (typeof file.version !== 'number' || file.version > EXPORT_VERSION) {
    throw new Error('Versión de copia no soportada: actualiza la app.')
  }
  const tables = file.tables
  const applied: Partial<Record<TableName, number>> = {}
  const rejectedSessions = new Set<string>()

  await db.transaction('rw', [...db.tables], async () => {
    for (const name of TABLE_NAMES) {
      const raw = tables[name]
      if (!Array.isArray(raw)) continue
      let rows = raw.filter(isRow).map((r) => pickColumns(name, r))
      if (name === 'session_sets') rows = rows.filter((r) => !rejectedSessions.has(String(r.session_id)))
      const res = await applyIncoming(name, rows, 'file')
      applied[name] = res.applied
      if (name === 'sessions') for (const id of res.rejected) rejectedSessions.add(id)
    }
  })
  requestSync()
  return applied
}
