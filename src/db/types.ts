/**
 * Tipos propios de la capa de datos (src/db). El contrato de dominio vive en
 * src/domain/types.ts; aquí solo hay lo que es específico de Dexie/sincronización.
 */
import type {
  ActivityKind,
  BodyLog,
  FoodLog,
  ISODate,
  Meal,
  RoutineCode,
  Session,
  SessionSet,
  Settings,
  SyncMeta,
  TableName,
} from '../domain/types'

// ───────────────────────── Entrada del importador de OpenGym ─────────────────────────
// Tipo ESTRUCTURAL de lo que produce src/lib/opengym/parseBackup.ts (no se importa de allí).

export interface ParsedOpenGymSet {
  exercise_id: string
  set_index: number
  weight: number | null
  reps: number | null
  sec: number | null
  rir: number | null
  is_warmup: boolean
}

export interface ParsedOpenGymSession {
  source_ref: string
  date: ISODate
  routine_code: RoutineCode | null
  duration_min: number | null
  excluded: boolean
  sets: ParsedOpenGymSet[]
}

export interface ParsedOpenGym {
  unit: string
  targetW: number | null
  sessions: ParsedOpenGymSession[]
  bodyweights: { date: ISODate; weight: number }[]
  warnings: string[]
}

export interface ImportOpenGymOptions {
  filename: string
  fileHash: string
}

export type ImportOpenGymResult =
  | { skipped: true }
  | {
      skipped: false
      /** Id del ImportRecord creado. */
      importId: string
      counts: { sessions: number; sets: number; bodyweights: number; skippedBodyweights: number }
      /** Avisos del parser más los generados al importar. */
      warnings: string[]
    }

export interface ImportGarminResult {
  added: number
  duplicates: number
}

// ───────────────────────── Entradas de escritura ─────────────────────────

export type SettingsPatch = Partial<Omit<Settings, keyof SyncMeta>>

export type BodyLogPatch = Partial<Pick<BodyLog, 'weight' | 'waist' | 'knee_pain' | 'note'>>

export interface NewActivity {
  date: ISODate
  kind: ActivityKind
  minutes: number
  note?: string | null
}

export interface NewFoodLog {
  date: ISODate
  meal: Meal
  label: string
  kcal: number
  protein_g: number
  favorite_id?: string | null
}

export type FoodLogPatch = Partial<Omit<FoodLog, keyof SyncMeta>>

export interface FavoriteInput {
  /** Si se indica y existe, se actualiza; si no, se crea. */
  id?: string
  label: string
  kcal: number
  protein_g: number
  default_meal: Meal
}

// ───────────────────────── Lecturas compuestas ─────────────────────────

export interface SessionWithSets extends Session {
  /** Series no borradas, ordenadas por set_index. */
  sets: SessionSet[]
}

export interface ActivityRange {
  from?: ISODate
  to?: ISODate
}

// ───────────────────────── Dexie internos ─────────────────────────

export interface OutboxItem {
  seq?: number
  table: TableName
  id: string
  at: string
}

export interface MetaItem {
  key: string
  value: unknown
}

/** Fila genérica usada por la sincronización (cualquier tabla del contrato). */
export type AnyRow = SyncMeta & Record<string, unknown>

// ───────────────────────── Exportación ─────────────────────────

export interface ExportFile {
  app: 'ruta85'
  version: 1
  exported_at: string
  tables: Record<TableName, Record<string, unknown>[]>
}

// ───────────────────────── Estado de sincronización y sesión ─────────────────────────

export interface SyncStatus {
  /** 'cloud' = Supabase configurado y con sesión; 'local' = solo IndexedDB. */
  mode: 'local' | 'cloud'
  online: boolean
  syncing: boolean
  /** ISO de la última sincronización completada con éxito. */
  lastSyncAt: string | null
  /** Escrituras locales pendientes de subir (filas distintas). */
  pending: number
  error: string | null
}

export interface AuthUser {
  id: string
  email: string | null
}

export interface AuthState {
  user: AuthUser | null
  /** false hasta que se ha leído la sesión guardada (evita parpadeos de "sin sesión"). */
  ready: boolean
}
