import { describe, expect, it } from 'vitest'
import type { PacePoint } from '../domain/types'
import { addDays } from './dates'
import { expectedWeightAt, planLine, requiredPace, rolling7, slopeKgPerWeek } from './pace'

const START = '2026-10-05'
const GOAL = '2027-09-18'

function series(from: string, n: number, f: (i: number) => number): PacePoint[] {
  return Array.from({ length: n }, (_, i) => ({ date: addDays(from, i), value: f(i) }))
}

describe('rolling7', () => {
  it('media de la ventana de 7 días, ordenando por fecha', () => {
    const pts = series('2026-10-05', 8, (i) => 100 - i)
    const shuffled = [...pts].reverse()
    const out = rolling7(shuffled)
    expect(out.map((p) => p.date)).toEqual(pts.map((p) => p.date))
    expect(out[0].value).toBe(100)
    expect(out[1].value).toBeCloseTo(99.5)
    expect(out[6].value).toBeCloseTo(97) // media de 100..94
    expect(out[7].value).toBeCloseTo(96) // ventana 99..93
  })

  it('con huecos solo promedia lo que cae en la ventana', () => {
    const out = rolling7([
      { date: '2026-10-05', value: 100 },
      { date: '2026-10-20', value: 90 },
    ])
    expect(out[1].value).toBe(90)
  })
})

describe('slopeKgPerWeek', () => {
  it('null con pocos puntos o rango corto', () => {
    expect(slopeKgPerWeek([])).toBeNull()
    expect(slopeKgPerWeek(series('2026-10-05', 2, () => 90))).toBeNull()
    expect(slopeKgPerWeek(series('2026-10-05', 9, (i) => 90 - i * 0.1))).toBeNull() // rango 8 días
    expect(slopeKgPerWeek(series('2026-10-05', 11, (i) => 90 - i * 0.1))).not.toBeNull() // rango 10 días
  })

  it('regresión lineal: −0,35 kg/semana', () => {
    const pts = series('2026-10-05', 28, (i) => 95 - (0.35 / 7) * i)
    expect(slopeKgPerWeek(pts)).toBeCloseTo(-0.35, 6)
  })

  it('solo usa las últimas 4 semanas', () => {
    const old = series('2026-08-01', 30, () => 100) // plano antiguo
    const recent = series('2026-10-05', 28, (i) => 95 - (0.5 / 7) * i)
    expect(slopeKgPerWeek([...old, ...recent])).toBeCloseTo(-0.5, 6)
  })
})

describe('requiredPace', () => {
  it('done si ya está en el objetivo', () => {
    const r = requiredPace({ currentAvg: 84.5, goalWeight: 85, today: '2027-03-01', startDate: START, goalDate: GOAL })
    expect(r.status).toBe('done')
    expect(r.remainingKg).toBe(0)
  })

  it('descuenta las semanas de mantenimiento que quedan', () => {
    // hoy = inicio del plan: 50 semanas calendario menos 6 de mantenimiento = 44 semanas de déficit
    const r = requiredPace({ currentAvg: 100, goalWeight: 85, today: START, goalDate: '2027-09-20', startDate: START })
    expect(r.deficitWeeksLeft).toBeCloseTo(44, 5)
    expect(r.weeksLeft).toBeCloseTo(50, 5)
    expect(r.kgPerDeficitWeek).toBeCloseTo(15 / 44, 5)
    expect(r.status).toBe('ok')
  })

  it('pasada la Navidad ya no cuenta ese mantenimiento', () => {
    const r = requiredPace({ currentAvg: 90, goalWeight: 85, today: '2027-01-04', startDate: START, goalDate: '2027-09-19' })
    // semanas 14..50 = 37 semanas, de ellas 2 (26-27) + 2 (49-50) de mantenimiento = 33
    expect(r.deficitWeeksLeft).toBeCloseTo(33, 5)
    expect(r.kgPerDeficitWeek).toBeCloseTo(5 / 33, 5)
  })

  it('umbrales ok / tight / too-fast', () => {
    const base = { goalWeight: 85, today: '2027-08-23', startDate: START, goalDate: '2027-09-19' }
    // semanas 47-48 son déficit (2 semanas); 49-50 mantenimiento
    const mk = (kg: number) => requiredPace({ ...base, currentAvg: 85 + kg })
    expect(mk(0.8).status).toBe('ok') // 0,4/sem
    expect(mk(1.1).status).toBe('tight') // 0,55/sem
    expect(mk(1.4).status).toBe('too-fast') // 0,7/sem
  })

  it('sin semanas de déficit restantes con kilos por perder → too-fast', () => {
    const r = requiredPace({ currentAvg: 87, goalWeight: 85, today: '2027-09-10', startDate: START, goalDate: '2027-09-19' })
    expect(r.deficitWeeksLeft).toBe(0)
    expect(r.status).toBe('too-fast')
  })
})

describe('planLine', () => {
  it('dos puntos sobre la recta inicio → objetivo', () => {
    const line = planLine(95, 85, START, GOAL, GOAL)
    expect(line).toEqual([
      { date: START, value: 95 },
      { date: GOAL, value: 85 },
    ])
    const mid = planLine(95, 85, '2026-10-05', '2026-10-25', '2026-10-15')
    expect(mid[1].value).toBeCloseTo(90)
  })

  it('acota `until` al rango', () => {
    expect(planLine(95, 85, START, GOAL, '2030-01-01')[1]).toEqual({ date: GOAL, value: 85 })
    expect(planLine(95, 85, START, GOAL, '2020-01-01')[1]).toEqual({ date: START, value: 95 })
  })
})

describe('expectedWeightAt', () => {
  it('resta la pérdida esperada', () => {
    expect(expectedWeightAt(100, 85, 11)).toBeCloseTo(96.25, 2)
    expect(expectedWeightAt(100, 85, 48)).toBeCloseTo(85, 5)
  })
})
