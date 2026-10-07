import type { ISODate, PacePoint } from '../domain/types'
import { addDays, diffDays } from './dates'
import { TOTAL_WEEKS, expectedLossAt, maintenanceForWeek, weekNumber } from './calendar'

function sorted(points: PacePoint[]): PacePoint[] {
  return [...points].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** Media de la ventana de 7 días (el día del punto y los 6 anteriores) que termina en cada punto. */
export function rolling7(points: PacePoint[]): PacePoint[] {
  const pts = sorted(points)
  return pts.map((p) => {
    const from = addDays(p.date, -6)
    const win = pts.filter((q) => q.date >= from && q.date <= p.date)
    const avg = win.reduce((s, q) => s + q.value, 0) / win.length
    return { date: p.date, value: avg }
  })
}

/**
 * Pendiente en kg/semana por regresión lineal sobre las últimas 4 semanas
 * (port de slope() de tracker.html). null si hay <3 puntos o el rango es <10 días.
 */
export function slopeKgPerWeek(points: PacePoint[]): number | null {
  const pts = sorted(points)
  if (pts.length < 3) return null
  const end = pts[pts.length - 1].date
  const q = pts.filter((p) => diffDays(p.date, end) <= 28)
  if (q.length < 3 || diffDays(q[0].date, q[q.length - 1].date) < 10) return null
  const xs = q.map((p) => diffDays(q[0].date, p.date))
  const n = q.length
  const mx = xs.reduce((s, x) => s + x, 0) / n
  const my = q.reduce((s, p) => s + p.value, 0) / n
  let sxy = 0
  let sxx = 0
  q.forEach((p, i) => {
    sxy += (xs[i] - mx) * (p.value - my)
    sxx += (xs[i] - mx) * (xs[i] - mx)
  })
  return sxx ? (sxy / sxx) * 7 : null
}

export type PaceStatus = 'done' | 'ok' | 'tight' | 'too-fast'

export interface RequiredPace {
  remainingKg: number
  weeksLeft: number
  deficitWeeksLeft: number
  kgPerDeficitWeek: number
  status: PaceStatus
}

/**
 * Ritmo necesario para llegar al peso objetivo, descontando las semanas de mantenimiento
 * que quedan. ok ≤ 0,45 kg/sem; tight ≤ 0,6; too-fast > 0,6.
 */
export function requiredPace(args: {
  currentAvg: number
  goalWeight: number
  today: ISODate
  startDate: ISODate
  goalDate: ISODate
}): RequiredPace {
  const { currentAvg, goalWeight, today, startDate, goalDate } = args
  const remainingKg = Math.max(0, currentAvg - goalWeight)
  const totalDays = Math.max(0, diffDays(today, goalDate))
  const weeks = totalDays / 7

  // Días de déficit restantes: cada día cuenta según la semana del plan en la que cae.
  let deficitDays = 0
  for (let i = 0; i < totalDays; i++) {
    const w = weekNumber(startDate, addDays(today, i))
    if (!maintenanceForWeek(w)) deficitDays++
  }
  const deficitWeeksLeft = deficitDays / 7

  if (remainingKg <= 0) {
    return { remainingKg: 0, weeksLeft: weeks, deficitWeeksLeft, kgPerDeficitWeek: 0, status: 'done' }
  }
  const rate = deficitWeeksLeft > 0 ? remainingKg / deficitWeeksLeft : Number.POSITIVE_INFINITY
  const status: PaceStatus = rate <= 0.45 ? 'ok' : rate <= 0.6 ? 'tight' : 'too-fast'
  return { remainingKg, weeksLeft: weeks, deficitWeeksLeft, kgPerDeficitWeek: rate, status }
}

/**
 * Línea del plan (dos puntos): desde (startDate, firstAvg) hasta `until` (acotado a
 * [startDate, goalDate]) sobre la recta que une el peso inicial con el peso objetivo en goalDate.
 */
export function planLine(
  firstAvg: number,
  goalWeight: number,
  startDate: ISODate,
  goalDate: ISODate,
  until: ISODate,
): PacePoint[] {
  const total = diffDays(startDate, goalDate)
  const end = until < startDate ? startDate : until > goalDate ? goalDate : until
  const frac = total > 0 ? diffDays(startDate, end) / total : 1
  return [
    { date: startDate, value: firstAvg },
    { date: end, value: firstAvg + (goalWeight - firstAvg) * frac },
  ]
}

/** Peso esperado al final de la semana `week` según el reparto por semanas de déficit. */
export function expectedWeightAt(firstAvg: number, goalWeight: number, week: number): number {
  const w = Math.min(Math.max(week, 0), TOTAL_WEEKS)
  return firstAvg - expectedLossAt(firstAvg - goalWeight, w)
}

