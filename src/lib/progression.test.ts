import { describe, expect, it } from 'vitest'
import type { PlanExercise } from '../domain/types'
import { bestE1rm, epley, stallCount, suggestLoad, type HistorySession } from './progression'

const linear: PlanExercise = { id: '3281', sets: 3, mode: 'reps', reps: 5, prog: 'linear', inc: 2.5 }
const double: PlanExercise = { id: '0579', sets: 3, mode: 'reps', reps: 12, repsMin: 8, prog: 'double', inc: 2.5 }

const sess = (date: string, weight: number, reps: number[], extra: Partial<HistorySession> = {}): HistorySession => ({
  date,
  sets: reps.map((r) => ({ weight, reps: r })),
  ...extra,
})

describe('epley / bestE1rm', () => {
  it('epley', () => {
    expect(epley(100, 5)).toBeCloseTo(116.67, 2)
    expect(epley(100, 0)).toBe(0)
    expect(epley(0, 5)).toBe(0)
  })
  it('bestE1rm ignora calentamientos', () => {
    expect(
      bestE1rm([
        { weight: 200, reps: 10, is_warmup: true },
        { weight: 100, reps: 5 },
        { weight: 90, reps: 8 },
      ]),
    ).toBeCloseTo(116.67, 2) // 100×(1+5/30) > 90×(1+8/30)=114
    expect(bestE1rm([])).toBe(0)
  })
})

describe('suggestLoad', () => {
  it('primera vez', () => {
    const r = suggestLoad(linear, [])
    expect(r.kind).toBe('first')
    expect(r.weight).toBeNull()
    expect(r.reps).toBe(5)
    expect(r.text).toBe('Primera vez: elige un peso con el que te sobren 3-4 repeticiones (RIR 3-4)')
    expect(suggestLoad(double, []).reps).toBe(8)
  })

  it('solo calentamientos, solo excluidas → primera vez', () => {
    const warm: HistorySession = { date: '2026-10-06', sets: [{ weight: 30, reps: 5, is_warmup: true }] }
    expect(suggestLoad(linear, [warm]).kind).toBe('first')
    expect(suggestLoad(linear, [sess('2026-10-06', 60, [5, 5, 5], { excluded: true })]).kind).toBe('first')
  })

  it('lineal: todo hecho → sube inc', () => {
    const r = suggestLoad(linear, [sess('2026-10-06', 60, [5, 5, 5])])
    expect(r.kind).toBe('increase')
    expect(r.weight).toBe(62.5)
    expect(r.reps).toBe(5)
    expect(r.text).toContain('sube a 62,5 kg × 5')
    expect(r.text).toContain('6 oct')
  })

  it('lineal: falta una serie o repeticiones → mantiene', () => {
    const miss = suggestLoad(linear, [sess('2026-10-06', 60, [5, 5, 4])])
    expect(miss.kind).toBe('hold')
    expect(miss.weight).toBe(60)
    const short = suggestLoad(linear, [sess('2026-10-06', 60, [5, 5])])
    expect(short.kind).toBe('hold')
  })

  it('ignora calentamientos al evaluar y usa el peso de trabajo', () => {
    const h: HistorySession = {
      date: '2026-10-06',
      sets: [
        { weight: 20, reps: 5, is_warmup: true },
        { weight: 60, reps: 5 },
        { weight: 60, reps: 5 },
        { weight: 60, reps: 5 },
      ],
    }
    const r = suggestLoad(linear, [h])
    expect(r.weight).toBe(62.5)
  })

  it('RIR 0 en la última serie de una sesión lineal completa → repeat-rir0', () => {
    const h: HistorySession = {
      date: '2026-10-06',
      sets: [
        { weight: 60, reps: 5, rir: 2 },
        { weight: 60, reps: 5, rir: 1 },
        { weight: 60, reps: 5, rir: 0 },
      ],
    }
    const r = suggestLoad(linear, [h])
    expect(r.kind).toBe('repeat-rir0')
    expect(r.weight).toBe(60)
    expect(r.text).toContain('RIR 0')
  })

  it('doble: techo en todas las series → sube y vuelve a repsMin', () => {
    const r = suggestLoad(double, [sess('2026-10-06', 40, [12, 12, 12])])
    expect(r.kind).toBe('increase')
    expect(r.weight).toBe(42.5)
    expect(r.reps).toBe(8)
  })

  it('doble: sin techo → mismo peso y apunta a la repetición más baja + 1', () => {
    const r = suggestLoad(double, [sess('2026-10-06', 40, [10, 9, 9])])
    expect(r.kind).toBe('hold')
    expect(r.weight).toBe(40)
    expect(r.reps).toBe(10)
    const capped = suggestLoad({ ...double, reps: 10, repsMin: 8 }, [sess('2026-10-06', 40, [10, 10, 9])])
    expect(capped.reps).toBe(10)
  })

  it('deload tras 3 sesiones sin progresar (×0,9 al incremento)', () => {
    const h = [
      sess('2026-10-06', 100, [5, 5, 4]),
      sess('2026-10-09', 100, [5, 4, 4]),
      sess('2026-10-13', 100, [5, 5, 3]),
    ]
    expect(stallCount(linear, h)).toBe(3)
    const r = suggestLoad(linear, h)
    expect(r.kind).toBe('deload')
    expect(r.weight).toBe(90)
    expect(r.reps).toBe(5)
    expect(r.text).toContain('3 sesiones sin progresar')
  })

  it('dos sesiones sin progresar aún no hace deload', () => {
    const h = [sess('2026-10-06', 100, [5, 5, 4]), sess('2026-10-09', 100, [5, 4, 4])]
    expect(stallCount(linear, h)).toBe(2)
    expect(suggestLoad(linear, h).kind).toBe('hold')
  })

  it('una sesión completa corta la racha y un cambio de peso también', () => {
    const h = [
      sess('2026-10-06', 100, [5, 5, 4]),
      sess('2026-10-09', 100, [5, 5, 5]),
      sess('2026-10-13', 102.5, [5, 4, 4]),
    ]
    expect(stallCount(linear, h)).toBe(1)
    const h2 = [sess('2026-10-06', 100, [4, 4, 4]), sess('2026-10-09', 100, [4, 4, 4]), sess('2026-10-13', 90, [4, 4, 4])]
    expect(stallCount(linear, h2)).toBe(1)
  })

  it('el deload redondea al incremento y baja siempre', () => {
    const h = [sess('2026-10-06', 20, [4, 4, 4]), sess('2026-10-09', 20, [4, 4, 4]), sess('2026-10-13', 20, [4, 4, 4])]
    const r = suggestLoad(linear, h)
    expect(r.weight).toBe(17.5) // 18 → 17,5
    const tiny = [sess('2026-10-06', 2.5, [1]), sess('2026-10-09', 2.5, [1]), sess('2026-10-13', 2.5, [1])]
    expect(suggestLoad({ ...linear, sets: 1 }, tiny).weight).toBe(2.5)
  })

  it('doble: superar la mejor marca al mismo peso no cuenta como estancamiento', () => {
    const h = [sess('2026-10-06', 40, [8, 8, 8]), sess('2026-10-09', 40, [9, 9, 9]), sess('2026-10-13', 40, [10, 10, 10])]
    expect(stallCount(double, h)).toBe(0)
    expect(suggestLoad(double, h).kind).toBe('hold')
    expect(suggestLoad(double, h).reps).toBe(11)
  })

  it('doble: deload vuelve a repsMin', () => {
    const h = [sess('2026-10-06', 40, [9, 8, 8]), sess('2026-10-09', 40, [8, 8, 8]), sess('2026-10-13', 40, [8, 8, 8])]
    const r = suggestLoad(double, h)
    expect(r.kind).toBe('deload')
    expect(r.weight).toBe(35)
    expect(r.reps).toBe(8)
  })

  it('ignora sesiones excluidas (deload planificado) y ordena por fecha', () => {
    const h = [
      sess('2026-10-13', 60, [5, 5, 5], { excluded: true }),
      sess('2026-10-09', 80, [5, 5, 5]),
      sess('2026-10-06', 70, [5, 5, 5]),
    ]
    const r = suggestLoad(linear, h)
    expect(r.weight).toBe(82.5)
  })

  it('peso corporal: sube repeticiones sin peso', () => {
    const ex: PlanExercise = { id: '0001', sets: 3, mode: 'reps', reps: 10, prog: 'linear' }
    const r = suggestLoad(ex, [{ date: '2026-10-06', sets: [10, 10, 10].map((reps) => ({ weight: 0, reps })) }])
    expect(r.kind).toBe('increase')
    expect(r.weight).toBeNull()
    expect(r.reps).toBe(11)
  })

  it('prog time/off o mode distinto de reps → hold', () => {
    const plank: PlanExercise = { id: 'c-plank', sets: 3, mode: 'time', sec: 30, prog: 'time' }
    const r = suggestLoad(plank, [])
    expect(r.kind).toBe('hold')
    expect(r.text).toMatch(/tiempo/i)
    const off: PlanExercise = { ...linear, prog: 'off' }
    expect(suggestLoad(off, [sess('2026-10-06', 60, [5, 5, 5])])).toMatchObject({ kind: 'hold', weight: 60 })
    const cardio: PlanExercise = { id: 'c-cardio', sets: 1, mode: 'cardio', min: 10, prog: 'off' }
    expect(suggestLoad(cardio, []).kind).toBe('hold')
    expect(stallCount(plank, [])).toBe(0)
  })
})
