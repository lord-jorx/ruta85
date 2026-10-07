import type { ISODate, PacePoint } from '../domain/types'
import { addDays, diffDays } from './dates'
import { rolling7 } from './pace'

export const MIN_KCAL = 1500
/** kcal por kg de peso corporal (aproximación habitual). */
export const KCAL_PER_KG = 7700

export interface DailyTargets {
  kcal: number
  proteinMin: number
  proteinMax: number
}

/** Objetivos del día: en semana de mantenimiento no hay déficit; nunca menos de 1500 kcal. */
export function dailyTargets(args: {
  maintenanceKcal: number
  deficitKcal: number
  isMaintenanceWeek: boolean
  proteinMin: number
  proteinMax: number
}): DailyTargets {
  const { maintenanceKcal, deficitKcal, isMaintenanceWeek, proteinMin, proteinMax } = args
  const raw = isMaintenanceWeek ? maintenanceKcal : maintenanceKcal - deficitKcal
  return { kcal: Math.max(MIN_KCAL, Math.round(raw)), proteinMin, proteinMax }
}

export interface AdaptiveMaintenance {
  kcal: number | null
  /** Días con registro de comida dentro de la ventana. */
  days: number
  confidence: 'none' | 'low' | 'ok'
}

/**
 * Mantenimiento estimado: kcal medias ingeridas − (Δ media móvil de 7 días del peso × 7700) / días.
 * Los registros del mismo día se suman. Necesita ≥14 días con registro y ≥6 pesadas en la ventana.
 * "Días" del cociente = días entre la primera y la última media móvil dentro de la ventana
 * (la pérdida se acumuló en ese tiempo, no en los días que tienen comida registrada).
 */
export function adaptiveMaintenance(args: {
  intake: { date: ISODate; kcal: number }[]
  weights: PacePoint[]
  today: ISODate
  windowDays?: number
}): AdaptiveMaintenance {
  const { intake, weights, today, windowDays = 21 } = args
  const from = addDays(today, -(windowDays - 1))

  const perDay = new Map<ISODate, number>()
  for (const r of intake) {
    if (r.date < from || r.date > today || !Number.isFinite(r.kcal)) continue
    perDay.set(r.date, (perDay.get(r.date) ?? 0) + r.kcal)
  }
  const days = perDay.size

  const inWindow = weights.filter((w) => w.date >= from && w.date <= today)
  if (days < 14 || inWindow.length < 6) return { kcal: null, days, confidence: 'none' }

  const avgs = rolling7(weights).filter((w) => w.date >= from && w.date <= today)
  const first = avgs[0]
  const last = avgs[avgs.length - 1]
  const span = diffDays(first.date, last.date)
  if (span <= 0) return { kcal: null, days, confidence: 'none' }

  const avgIntake = [...perDay.values()].reduce((s, k) => s + k, 0) / days
  const delta = last.value - first.value
  const kcal = Math.round(avgIntake - (delta * KCAL_PER_KG) / span)
  return { kcal, days, confidence: days >= 21 ? 'ok' : 'low' }
}
