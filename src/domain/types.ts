/**
 * Contrato de dominio de Ruta 85. Lo comparten todos los módulos (datos del plan, lógica,
 * base de datos y pantallas). Cambiarlo es una decisión de arquitectura: no lo edites desde
 * un módulo concreto; si falta algo, añádelo aquí sin romper lo existente.
 */

/** Fecha local en formato YYYY-MM-DD. */
export type ISODate = string

// ───────────────────────── Plan (datos estáticos, src/data) ─────────────────────────

export type RoutineCode = 'A' | 'B' | 'C' | 'H1' | 'H2' | 'Z2' | 'DL'
export type ProgModel = 'linear' | 'double' | 'time' | 'off'
export type ExerciseMode = 'reps' | 'time' | 'cardio'

export interface PlanExercise {
  /** ID de OpenGym (4 cifras) o ID propio que empieza por "c-". */
  id: string
  sets: number
  mode: ExerciseMode
  /** Techo del rango (o repeticiones fijas). */
  reps?: number
  /** Suelo del rango en doble progresión. */
  repsMin?: number
  sec?: number
  /** Minutos (cardio). */
  min?: number
  prog: ProgModel
  /** Incremento en kg al progresar. */
  inc?: number
  /** Descanso orientativo, p. ej. "2-3 min". */
  rest?: string
  /** Nota de ejecución en español (tempo, profundidad…). */
  cue?: string
}

export interface Routine {
  code: RoutineCode
  name: string
  emoji: string
  place: 'gym' | 'home' | 'any'
  /** Carga sobre la rodilla: A y C 'high', B 'low'. Gobierna la regla de días seguidos. */
  kneeLoad: 'high' | 'low' | 'none'
  /** Duración estimada en minutos [mín, máx]. */
  estMinutes: [number, number]
  excludeFromProgression?: boolean
  exercises: PlanExercise[]
}

export interface ExerciseInfo {
  id: string
  /** Nombre en español para la interfaz. */
  nameEs: string
  /** Nombre en la biblioteca de OpenGym (inglés) o el nombre del ejercicio propio. */
  nameOg: string
  custom: boolean
  desc?: string
}

export interface Alternative {
  id: string
  nameEs: string
  note: string
}

// ───────────────────────── Registros sincronizados (Dexie ⇄ Supabase) ─────────────────────────

export interface SyncMeta {
  /** uuid v4 generado en el cliente. */
  id: string
  /** ISO 8601 con zona; el último cambio gana. */
  updated_at: string
  /** Borrado lógico. */
  deleted: boolean
  /** Lo rellena la capa de sincronización; null mientras no hay sesión. */
  user_id?: string | null
}

export interface Settings extends SyncMeta {
  start_date: ISODate // 2026-10-05
  goal_date: ISODate // 2027-09-18
  goal_weight: number
  height_cm: number
  protein_min: number
  protein_max: number
  /** Mantenimiento fijado a mano (kcal/día); si es null se usa el estimado adaptativo. */
  kcal_maintenance_manual: number | null
  deficit_kcal: number // 400
}

export interface BodyLog extends SyncMeta {
  date: ISODate
  weight: number | null
  waist: number | null
  /** 0-10. */
  knee_pain: number | null
  note: string | null
  source: 'app' | 'opengym'
}

export interface Session extends SyncMeta {
  date: ISODate
  routine_code: RoutineCode | null
  source: 'opengym' | 'app'
  /** Identificador estable del workout en OpenGym, para no duplicar al reimportar. */
  source_ref: string | null
  duration_min: number | null
  /** Sesión de deload o excluida de la progresión. */
  excluded: boolean
}

export interface SessionSet extends SyncMeta {
  session_id: string
  exercise_id: string
  set_index: number
  weight: number | null
  reps: number | null
  sec: number | null
  rir: number | null
  is_warmup: boolean
}

export type ActivityKind = 'walk' | 'run' | 'bike' | 'elliptical' | 'other'

export interface Activity extends SyncMeta {
  date: ISODate
  kind: ActivityKind
  minutes: number
  note: string | null
}

/** Día de guardia (turno largo). */
export interface Shift extends SyncMeta {
  date: ISODate
}

export type Meal = 'desayuno' | 'comida' | 'merienda' | 'cena' | 'snack'

export interface FoodLog extends SyncMeta {
  date: ISODate
  meal: Meal
  label: string
  kcal: number
  protein_g: number
  favorite_id: string | null
}

export interface FoodFavorite extends SyncMeta {
  label: string
  kcal: number
  protein_g: number
  default_meal: Meal
}

export interface ImportRecord extends SyncMeta {
  source: 'opengym'
  filename: string
  file_hash: string
  imported_at: string
  counts: Record<string, number>
}

export interface TableMap {
  settings: Settings
  body_logs: BodyLog
  sessions: Session
  session_sets: SessionSet
  activities: Activity
  shifts: Shift
  food_logs: FoodLog
  food_favorites: FoodFavorite
  imports: ImportRecord
}
export type TableName = keyof TableMap

// ───────────────────────── Resultados de la lógica (src/lib) ─────────────────────────

export interface Phase {
  key: 'F0' | 'F1' | 'F2' | 'F3'
  name: string
  fromWeek: number
  toWeek: number
  summary: string
}

export interface MaintenanceBlock {
  fromWeek: number
  toWeek: number
  label: string
}

export interface RoutineSuggestion {
  code: RoutineCode
  /** Explicación corta en español, p. ej. "Toca C, pero ayer hiciste A: haz B". */
  reason: string
  /** true si conviene no entrenar fuerte (salida de guardia). */
  restAdvised: boolean
}

export interface LoadSuggestion {
  kind: 'first' | 'increase' | 'hold' | 'deload' | 'repeat-rir0'
  weight: number | null
  reps: number
  text: string
}

export interface PacePoint {
  date: ISODate
  value: number
}
