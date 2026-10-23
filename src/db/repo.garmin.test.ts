import 'fake-indexeddb/auto'
import { beforeEach, describe, expect, it } from 'vitest'
import { parseGarminCsv } from '../lib/garmin'
import { db } from './local'
import { addActivity, deleteActivity, importGarminActivities } from './repo'

const CSV = [
  'Activity Type,Date,Title,Distance,Time',
  'Walking,2026-10-05 18:00:00,Paseo,4.2,00:45:00',
  'Running,2026-10-06 07:00:00,Carrera,5.0,00:30:00',
  'Walking,2026-10-05 20:00:00,Otro paseo,4.2,00:45:00',
].join('\n')

describe('importGarminActivities', () => {
  beforeEach(async () => {
    await db.activities.clear()
  })

  it('añade las filas y reimportar el mismo CSV no duplica', async () => {
    const rows = parseGarminCsv(CSV).activities
    // La tercera fila repite fecha, tipo y minutos de la primera: duplicada dentro del archivo.
    expect(await importGarminActivities(rows)).toEqual({ added: 2, duplicates: 1 })
    expect(await importGarminActivities(rows)).toEqual({ added: 0, duplicates: 3 })
    expect(await db.activities.count()).toBe(2)
  })

  it('una actividad manual igual (sin prefijo Garmin) no cuenta como repetida', async () => {
    await addActivity({ date: '2026-10-06', kind: 'run', minutes: 30, note: 'a mano' })
    expect(await importGarminActivities(parseGarminCsv(CSV).activities)).toEqual({ added: 2, duplicates: 1 })
  })

  it('una actividad Garmin borrada se puede volver a importar', async () => {
    const rows = parseGarminCsv(CSV).activities
    await importGarminActivities(rows)
    const first = (await db.activities.toArray()).find((a) => a.date === '2026-10-06')!
    await deleteActivity(first.id)
    expect(await importGarminActivities(rows)).toEqual({ added: 1, duplicates: 2 })
  })
})
