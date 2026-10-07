import { describe, expect, it } from 'vitest'
import { addDays, diffDays, fmtLong, fmtShort, isISODate, mondayOf, todayISO, weekdayIndex } from './dates'

describe('dates', () => {
  it('addDays cruza meses, años y cambios de hora', () => {
    expect(addDays('2026-10-05', 1)).toBe('2026-10-06')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28')
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    // fin de horario de verano en Europa (25 oct 2026) y arranque (28 mar 2027)
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26')
    expect(addDays('2027-03-27', 2)).toBe('2027-03-29')
  })

  it('diffDays es b − a en días enteros', () => {
    expect(diffDays('2026-10-05', '2026-10-12')).toBe(7)
    expect(diffDays('2026-10-12', '2026-10-05')).toBe(-7)
    expect(diffDays('2026-10-24', '2026-10-26')).toBe(2)
    expect(diffDays('2026-10-05', '2027-09-18')).toBe(348)
  })

  it('mondayOf devuelve el lunes de la semana', () => {
    expect(mondayOf('2026-10-05')).toBe('2026-10-05') // lunes
    expect(mondayOf('2026-10-11')).toBe('2026-10-05') // domingo
    expect(mondayOf('2026-10-07')).toBe('2026-10-05')
    expect(weekdayIndex('2026-10-05')).toBe(0)
    expect(weekdayIndex('2026-10-11')).toBe(6)
  })

  it('formatea en es-ES', () => {
    expect(fmtShort('2026-10-05')).toBe('5 oct')
    expect(fmtLong('2026-10-05')).toBe('5 oct 2026')
    expect(fmtLong('2027-01-04')).toBe('4 ene 2027')
    expect(fmtShort('2027-09-18')).toBe('18 sep')
  })

  it('todayISO y isISODate', () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(isISODate('2026-02-30')).toBe(false)
    expect(isISODate('2026-10-05')).toBe(true)
    expect(isISODate('x')).toBe(false)
  })
})
