import type { ISODate, MaintenanceBlock, Phase } from '../domain/types'
import { addDays, diffDays } from './dates'

/** Fases del año (semana 1 = lunes 5 oct 2026). */
export const PHASES: Phase[] = [
  {
    key: 'F0',
    name: 'Reentrada',
    fromWeek: 1,
    toWeek: 2,
    summary: '2 series por ejercicio (omite la última), RIR 3-4 y cargas ligeras.',
  },
  {
    key: 'F1',
    name: 'Base',
    fromWeek: 3,
    toWeek: 13,
    summary: 'Series completas, RIR 1-3. Lineal en básicos, doble en el resto.',
  },
  {
    key: 'F2',
    name: 'Construcción',
    fromWeek: 14,
    toWeek: 40,
    summary: 'Con ≥2,5 sesiones/semana y rodilla <3/10: +1 serie en básicos y 2 accesorios.',
  },
  {
    key: 'F3',
    name: 'Afinado y llegada',
    fromWeek: 41,
    toWeek: 50,
    summary: 'Mismo entrenamiento. Déficit hasta la semana 48; semanas 49-50 a mantenimiento.',
  },
]

/** Bloques de mantenimiento (comes lo que gastas). */
export const MAINTENANCE: MaintenanceBlock[] = [
  { fromWeek: 12, toWeek: 13, label: 'Navidad' },
  { fromWeek: 26, toWeek: 27, label: 'Semana Santa' },
  { fromWeek: 49, toWeek: 50, label: 'Llegada' },
]

export const TOTAL_WEEKS = 50

/** Semanas de déficit del plan completo (50 − 6 de mantenimiento = 44). */
export const TOTAL_DEFICIT_WEEKS = (() => {
  let n = 0
  for (let w = 1; w <= TOTAL_WEEKS; w++) if (!maintenanceForWeek(w)) n++
  return n
})()

export const MILESTONES: { date: ISODate; week: number }[] = [
  { date: '2026-12-20', week: 11 },
  { date: '2027-03-28', week: 25 },
  { date: '2027-06-27', week: 38 },
  { date: '2027-09-05', week: 48 },
]

/** Número de semana del plan: 1 = la semana que empieza en `start`; antes de `start` → ≤ 0. */
export function weekNumber(start: ISODate, date: ISODate): number {
  return Math.floor(diffDays(start, date) / 7) + 1
}

export function phaseForWeek(w: number): Phase | null {
  return PHASES.find((p) => w >= p.fromWeek && w <= p.toWeek) ?? null
}

export function maintenanceForWeek(w: number): MaintenanceBlock | null {
  return MAINTENANCE.find((b) => w >= b.fromWeek && w <= b.toWeek) ?? null
}

/** [lunes, domingo] de la semana `w` del plan (empezando en `start`). */
export function weekRange(start: ISODate, w: number): [ISODate, ISODate] {
  const from = addDays(start, (w - 1) * 7)
  return [from, addDays(from, 6)]
}

/** Semanas (fraccional, ≥ 0) entre hoy y la fecha objetivo. */
export function weeksLeft(today: ISODate, goalDate: ISODate): number {
  return Math.max(0, diffDays(today, goalDate) / 7)
}

/**
 * Semanas que no son de mantenimiento en el intervalo [fromWeek, toWeek] (ambas incluidas).
 * `_start` no interviene (el calendario se indexa por semana); se mantiene por simetría de API.
 */
export function deficitWeeksBetween(_start: ISODate, fromWeek: number, toWeek: number): number {
  let n = 0
  for (let w = Math.max(1, Math.ceil(fromWeek)); w <= Math.min(TOTAL_WEEKS, Math.floor(toWeek)); w++) {
    if (!maintenanceForWeek(w)) n++
  }
  return n
}

/** Pérdida esperada acumulada al final de la semana `week` (reparto uniforme por semana de déficit). */
export function expectedLossAt(totalLoss: number, week: number): number {
  const done = deficitWeeksBetween('', 1, week)
  return (totalLoss * done) / TOTAL_DEFICIT_WEEKS
}
