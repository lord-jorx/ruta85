// Utilidades de formato de la interfaz (español de España). Puras y sin dependencias.

export const DAY = 86_400_000

export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}

/** Número con coma decimal. */
export function num(v: number | null | undefined, decimals = 0): string {
  if (v == null || Number.isNaN(v)) return '—'
  return v.toLocaleString('es-ES', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** "+0,3" / "−0,3" con signo menos tipográfico. */
export function signed(v: number | null | undefined, decimals = 1): string {
  if (v == null || Number.isNaN(v)) return '—'
  const s = num(Math.abs(v), decimals)
  if (v > 0) return `+${s}`
  if (v < 0) return `−${s}`
  return s
}

/** YYYY-MM-DD → milisegundos UTC a medianoche. */
export function isoToMs(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return Date.UTC(y, m - 1, d)
}

export function msToIso(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** Fecha local de hoy (YYYY-MM-DD) sin saltos por zona horaria. */
export function todayIso(): string {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

/** "5 oct" */
export function fmtDate(ms: number): string {
  return new Date(ms)
    .toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' })
    .replace('.', '')
}

/** "5 oct 2026" */
export function fmtDateLong(ms: number): string {
  return new Date(ms)
    .toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
    .replace('.', '')
}

/** "lunes, 5 de octubre" */
export function fmtWeekdayLong(ms: number): string {
  return new Date(ms).toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  })
}

/** Parsea "84,5" o "84.5" a número; devuelve null si no es válido. */
export function parseDecimal(text: string): number | null {
  const t = text.trim().replace(',', '.')
  if (t === '' || t === '-' || t === '.') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}
