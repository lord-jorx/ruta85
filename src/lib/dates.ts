import type { ISODate } from '../domain/types'

/**
 * Utilidades de fecha para fechas locales 'YYYY-MM-DD'. Toda la aritmética se hace con
 * `Date.UTC` sobre números de día para evitar saltos por cambio de hora (DST) y por zona.
 */

const MS_DAY = 86_400_000
const MONTHS_ES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function pad(n: number, len = 2): string {
  return String(n).padStart(len, '0')
}

/** 'YYYY-MM-DD' → número de días desde 1970-01-01 (puede ser negativo). */
function toDayNumber(d: ISODate): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d)
  if (!m) return Number.NaN
  return Math.floor(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / MS_DAY)
}

function fromDayNumber(n: number): ISODate {
  const dt = new Date(n * MS_DAY)
  return `${pad(dt.getUTCFullYear(), 4)}-${pad(dt.getUTCMonth() + 1)}-${pad(dt.getUTCDate())}`
}

/** Comprueba que es un 'YYYY-MM-DD' que existe en el calendario. */
export function isISODate(d: unknown): d is ISODate {
  if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false
  const n = toDayNumber(d)
  return Number.isFinite(n) && fromDayNumber(n) === d
}

/** Fecha de hoy en hora local. */
export function todayISO(): ISODate {
  const now = new Date()
  return `${pad(now.getFullYear(), 4)}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Suma `n` días (puede ser negativo). */
export function addDays(d: ISODate, n: number): ISODate {
  return fromDayNumber(toDayNumber(d) + Math.trunc(n))
}

/** b − a en días enteros. */
export function diffDays(a: ISODate, b: ISODate): number {
  return toDayNumber(b) - toDayNumber(a)
}

/** Día de la semana: 0 = lunes … 6 = domingo. */
export function weekdayIndex(d: ISODate): number {
  const dow = new Date(toDayNumber(d) * MS_DAY).getUTCDay() // 0 = domingo
  return (dow + 6) % 7
}

/** Lunes de la semana a la que pertenece `d`. */
export function mondayOf(d: ISODate): ISODate {
  return addDays(d, -weekdayIndex(d))
}

function parts(d: ISODate): { y: number; m: number; day: number } {
  const dt = new Date(toDayNumber(d) * MS_DAY)
  return { y: dt.getUTCFullYear(), m: dt.getUTCMonth(), day: dt.getUTCDate() }
}

/** "5 oct" (es-ES). */
export function fmtShort(d: ISODate): string {
  const { m, day } = parts(d)
  return `${day} ${MONTHS_ES[m]}`
}

/** "5 oct 2026" (es-ES). */
export function fmtLong(d: ISODate): string {
  const { y, m, day } = parts(d)
  return `${day} ${MONTHS_ES[m]} ${y}`
}
