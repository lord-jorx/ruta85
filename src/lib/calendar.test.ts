import { describe, expect, it } from 'vitest'
import {
  MAINTENANCE,
  MILESTONES,
  PHASES,
  TOTAL_DEFICIT_WEEKS,
  TOTAL_WEEKS,
  deficitWeeksBetween,
  expectedLossAt,
  maintenanceForWeek,
  phaseForWeek,
  weekNumber,
  weekRange,
  weeksLeft,
} from './calendar'

const START = '2026-10-05'

describe('calendar', () => {
  it('constantes', () => {
    expect(TOTAL_WEEKS).toBe(50)
    expect(TOTAL_DEFICIT_WEEKS).toBe(44)
    expect(PHASES.map((p) => p.key)).toEqual(['F0', 'F1', 'F2', 'F3'])
    expect(MAINTENANCE).toHaveLength(3)
    expect(MILESTONES.map((m) => m.week)).toEqual([11, 25, 38, 48])
  })

  it('weekNumber en límites', () => {
    expect(weekNumber(START, '2026-10-05')).toBe(1)
    expect(weekNumber(START, '2026-10-11')).toBe(1)
    expect(weekNumber(START, '2026-10-12')).toBe(2)
    expect(weekNumber(START, '2026-10-04')).toBe(0)
    expect(weekNumber(START, '2026-09-28')).toBe(0)
    expect(weekNumber(START, '2026-09-27')).toBe(-1)
    expect(weekNumber(START, '2027-09-19')).toBe(50)
    expect(weekNumber(START, '2027-09-20')).toBe(51)
  })

  it('los hitos caen en domingo de su semana', () => {
    for (const m of MILESTONES) {
      expect(weekNumber(START, m.date)).toBe(m.week)
      expect(weekRange(START, m.week)[1]).toBe(m.date)
    }
  })

  it('phaseForWeek en los límites', () => {
    expect(phaseForWeek(1)?.key).toBe('F0')
    expect(phaseForWeek(2)?.key).toBe('F0')
    expect(phaseForWeek(3)?.key).toBe('F1')
    expect(phaseForWeek(13)?.key).toBe('F1')
    expect(phaseForWeek(14)?.key).toBe('F2')
    expect(phaseForWeek(40)?.key).toBe('F2')
    expect(phaseForWeek(41)?.key).toBe('F3')
    expect(phaseForWeek(50)?.key).toBe('F3')
    expect(phaseForWeek(0)).toBeNull()
    expect(phaseForWeek(51)).toBeNull()
  })

  it('maintenanceForWeek', () => {
    expect(maintenanceForWeek(11)).toBeNull()
    expect(maintenanceForWeek(12)?.label).toBe('Navidad')
    expect(maintenanceForWeek(13)?.label).toBe('Navidad')
    expect(maintenanceForWeek(14)).toBeNull()
    expect(maintenanceForWeek(26)?.label).toBe('Semana Santa')
    expect(maintenanceForWeek(48)).toBeNull()
    expect(maintenanceForWeek(49)?.label).toBe('Llegada')
    expect(maintenanceForWeek(50)?.label).toBe('Llegada')
  })

  it('weekRange es lunes-domingo', () => {
    expect(weekRange(START, 1)).toEqual(['2026-10-05', '2026-10-11'])
    expect(weekRange(START, 12)).toEqual(['2026-12-21', '2026-12-27'])
    expect(weekRange(START, 50)).toEqual(['2027-09-13', '2027-09-19'])
  })

  it('weeksLeft es fraccional y nunca negativo', () => {
    expect(weeksLeft('2026-10-05', '2026-10-19')).toBe(2)
    expect(weeksLeft('2026-10-05', '2026-10-08')).toBeCloseTo(3 / 7)
    expect(weeksLeft('2027-10-01', '2027-09-18')).toBe(0)
  })

  it('deficitWeeksBetween', () => {
    expect(deficitWeeksBetween(START, 1, 50)).toBe(44)
    expect(deficitWeeksBetween(START, 12, 13)).toBe(0)
    expect(deficitWeeksBetween(START, 11, 14)).toBe(2)
    expect(deficitWeeksBetween(START, 49, 50)).toBe(0)
  })

  it('expectedLossAt con 15 kg', () => {
    expect(expectedLossAt(15, 11)).toBeCloseTo(3.75, 2)
    expect(expectedLossAt(15, 25)).toBeCloseTo(7.84, 2)
    expect(expectedLossAt(15, 38)).toBeCloseTo(11.6, 1)
    expect(expectedLossAt(15, 48)).toBeCloseTo(15, 5)
    expect(expectedLossAt(15, 50)).toBeCloseTo(15, 5)
    expect(expectedLossAt(15, 0)).toBe(0)
    expect(expectedLossAt(15, 13)).toBeCloseTo(expectedLossAt(15, 11), 5)
  })
})
