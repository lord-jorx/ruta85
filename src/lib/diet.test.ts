import { describe, expect, it } from 'vitest'
import type { PacePoint } from '../domain/types'
import { addDays } from './dates'
import { adaptiveMaintenance, dailyTargets } from './diet'

const prot = { proteinMin: 140, proteinMax: 170 }

describe('dailyTargets', () => {
  it('semana de déficit y de mantenimiento', () => {
    expect(dailyTargets({ maintenanceKcal: 2600, deficitKcal: 400, isMaintenanceWeek: false, ...prot })).toEqual({
      kcal: 2200,
      ...prot,
    })
    expect(dailyTargets({ maintenanceKcal: 2600, deficitKcal: 400, isMaintenanceWeek: true, ...prot }).kcal).toBe(2600)
  })
  it('nunca menos de 1500 kcal', () => {
    expect(dailyTargets({ maintenanceKcal: 1800, deficitKcal: 500, isMaintenanceWeek: false, ...prot }).kcal).toBe(1500)
    expect(dailyTargets({ maintenanceKcal: 1200, deficitKcal: 0, isMaintenanceWeek: true, ...prot }).kcal).toBe(1500)
  })
})

const today = '2026-11-15'
const days = (n: number, kcal = 2400) =>
  Array.from({ length: n }, (_, i) => ({ date: addDays(today, -i), kcal }))
const weights = (n: number, f: (i: number) => number): PacePoint[] =>
  Array.from({ length: n }, (_, i) => ({ date: addDays(today, -(n - 1) + i), value: f(i) }))

describe('adaptiveMaintenance', () => {
  it('sin datos', () => {
    expect(adaptiveMaintenance({ intake: [], weights: [], today })).toEqual({ kcal: null, days: 0, confidence: 'none' })
  })

  it('menos de 14 días con registro → null', () => {
    const r = adaptiveMaintenance({ intake: days(13), weights: weights(21, () => 90), today })
    expect(r.kcal).toBeNull()
    expect(r.days).toBe(13)
    expect(r.confidence).toBe('none')
  })

  it('menos de 6 pesadas → null', () => {
    const w = weights(21, () => 90).filter((_, i) => i % 5 === 0)
    expect(w.length).toBeLessThan(6)
    expect(adaptiveMaintenance({ intake: days(21), weights: w, today }).kcal).toBeNull()
  })

  it('14 días: confianza baja; peso estable → mantenimiento = ingesta', () => {
    const r = adaptiveMaintenance({ intake: days(14), weights: weights(21, () => 90), today })
    expect(r.kcal).toBe(2400)
    expect(r.days).toBe(14)
    expect(r.confidence).toBe('low')
  })

  it('21 días: confianza ok; peso bajando → mantenimiento mayor que la ingesta', () => {
    // 0,35 kg/semana de bajada = 0,05 kg/día; 7700 × 0,05 = 385 kcal/día
    const r = adaptiveMaintenance({ intake: days(21), weights: weights(21, (i) => 90 - 0.05 * i), today })
    expect(r.confidence).toBe('ok')
    expect(r.kcal).not.toBeNull()
    // la media móvil retrasa el primer punto, pero el déficit medido ronda 385 kcal
    expect(r.kcal!).toBeGreaterThan(2400 + 300)
    expect(r.kcal!).toBeLessThan(2400 + 450)
  })

  it('peso subiendo → mantenimiento menor que la ingesta', () => {
    const r = adaptiveMaintenance({ intake: days(21), weights: weights(21, (i) => 90 + 0.05 * i), today })
    expect(r.kcal!).toBeLessThan(2400 - 300)
  })

  it('suma los registros del mismo día y respeta la ventana', () => {
    const intake = [
      ...days(14, 1200).flatMap((d) => [d, d]), // dos registros de 1200 por día = 2400
      { date: addDays(today, -40), kcal: 99999 }, // fuera de la ventana
    ]
    const r = adaptiveMaintenance({ intake, weights: weights(21, () => 90), today })
    expect(r.days).toBe(14)
    expect(r.kcal).toBe(2400)
  })
})
