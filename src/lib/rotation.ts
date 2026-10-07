import type { ISODate, RoutineCode, RoutineSuggestion } from '../domain/types'
import { addDays } from './dates'

type GymCode = 'A' | 'B' | 'C'
const ROTATION: GymCode[] = ['A', 'B', 'C']

const isGym = (c: RoutineCode | null): c is GymCode => c === 'A' || c === 'B' || c === 'C'

export interface RotationInput {
  sessions: { date: ISODate; routine_code: RoutineCode | null }[]
  /** Días de guardia de 24 h (la guardia del día X termina la mañana de X+1). */
  shifts: ISODate[]
  today: ISODate
  fallback?: RoutineCode
}

/**
 * Sugiere la rutina de hoy (plan_entrenamiento.md §2):
 * rotación A→B→C→A tras la última A/B/C hecha; A y C nunca en días seguidos (se intercala B);
 * guardia hoy o ayer → descanso / Casa 2; tercer día seguido → RIR 3 y una serie menos.
 */
export function suggestRoutine({ sessions, shifts, today, fallback = 'A' }: RotationInput): RoutineSuggestion {
  const yesterday = addDays(today, -1)
  const twoAgo = addDays(today, -2)

  // Guardias: tienen prioridad sobre la rotación.
  if (shifts.includes(today)) {
    return { code: 'H2', reason: 'Hoy tienes guardia', restAdvised: true }
  }
  if (shifts.includes(yesterday)) {
    return { code: 'H2', reason: 'Sales de guardia: caminar suave + core o descanso', restAdvised: true }
  }

  const gym = sessions.filter((s) => isGym(s.routine_code) && s.date <= today)
  const gymDates = new Set(gym.map((s) => s.date))
  const trainedToday = gymDates.has(today)

  let last: { date: ISODate; code: GymCode } | null = null
  for (const s of gym) {
    if (!isGym(s.routine_code)) continue
    if (!last || s.date >= last.date) last = { date: s.date, code: s.routine_code }
  }

  let code: RoutineCode
  let reason: string
  if (!last) {
    code = fallback
    reason = `Primera sesión: empieza por ${fallback}`
  } else {
    const next = ROTATION[(ROTATION.indexOf(last.code) + 1) % ROTATION.length]
    const yesterdayCodes = gym.filter((s) => s.date === yesterday).map((s) => s.routine_code)
    const yesterdayHeavy = yesterdayCodes.find((c) => c === 'A' || c === 'C')
    if ((next === 'A' || next === 'C') && yesterdayHeavy) {
      code = 'B'
      reason = `Toca ${next}, pero ayer hiciste ${yesterdayHeavy}: haz B y sigue la rotación`
    } else {
      code = next
      reason = `Toca ${next} (última: ${last.code})`
    }
    if (trainedToday) reason = `Hoy ya has entrenado. ${reason}`
  }

  if (gymDates.has(yesterday) && gymDates.has(twoAgo)) {
    reason += '. Tercer día seguido: RIR 3 y una serie menos'
  }

  return { code, reason, restAdvised: false }
}
