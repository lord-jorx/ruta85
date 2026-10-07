import type { ISODate } from '../../domain/types'

/**
 * CSV de peso corporal para "Import from another app" de OpenGym (dd_DATA_IMPORTS.md):
 * cabeceras `date` y `weight kg`, una fila por día con peso, ordenado por fecha.
 * Si un día se repite, gana la última entrada recibida.
 */
export function bodyweightCsv(logs: { date: ISODate; weight: number | null }[]): string {
  const byDate = new Map<ISODate, number>()
  for (const l of logs) {
    if (l.weight != null && Number.isFinite(l.weight) && l.weight > 0) byDate.set(l.date, l.weight)
  }
  const rows = [...byDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([date, weight]) => `${date},${Math.round(weight * 100) / 100}`)
  return ['date,weight kg', ...rows].join('\n') + '\n'
}
