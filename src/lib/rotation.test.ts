import { describe, expect, it } from 'vitest'
import type { RoutineCode } from '../domain/types'
import { suggestRoutine } from './rotation'

const s = (date: string, routine_code: RoutineCode | null) => ({ date, routine_code })

describe('suggestRoutine', () => {
  const today = '2026-10-14' // miércoles

  it('sin historial usa el fallback', () => {
    expect(suggestRoutine({ sessions: [], shifts: [], today }).code).toBe('A')
    expect(suggestRoutine({ sessions: [], shifts: [], today, fallback: 'B' }).code).toBe('B')
    expect(suggestRoutine({ sessions: [s('2026-10-10', 'H1')], shifts: [], today }).code).toBe('A')
  })

  it('sigue la rotación A→B→C→A con un día de descanso (cualquier orden de entrada)', () => {
    const sessions = [s('2026-10-12', 'B'), s('2026-10-08', 'A')]
    expect(suggestRoutine({ sessions, shifts: [], today }).code).toBe('C')
    expect(suggestRoutine({ sessions: [s('2026-10-09', 'C')], shifts: [], today }).code).toBe('A')
    expect(suggestRoutine({ sessions: [s('2026-10-09', 'A')], shifts: [], today }).code).toBe('B')
  })

  it('ignora casa y cardio en la rotación', () => {
    const sessions = [s('2026-10-10', 'A'), s('2026-10-13', 'Z2'), s('2026-10-12', 'H1')]
    expect(suggestRoutine({ sessions, shifts: [], today }).code).toBe('B')
  })

  it('ayer C y toca A → B (A y C nunca seguidas)', () => {
    const r = suggestRoutine({ sessions: [s('2026-10-10', 'A'), s('2026-10-11', 'B'), s('2026-10-13', 'C')], shifts: [], today })
    expect(r.code).toBe('B')
    expect(r.reason).toBe('Toca A, pero ayer hiciste C: haz B y sigue la rotación')
    expect(r.restAdvised).toBe(false)
  })

  it('ayer A (doble sesión A+B) y toca C → B', () => {
    const r = suggestRoutine({ sessions: [s('2026-10-13', 'A'), s('2026-10-13', 'B')], shifts: [], today })
    expect(r.code).toBe('B')
    expect(r.reason).toBe('Toca C, pero ayer hiciste A: haz B y sigue la rotación')
  })

  it('ayer B y toca C o A sin conflicto', () => {
    expect(suggestRoutine({ sessions: [s('2026-10-13', 'B')], shifts: [], today }).code).toBe('C')
    expect(suggestRoutine({ sessions: [s('2026-10-13', 'A')], shifts: [], today }).code).toBe('B')
  })

  it('guardia hoy o ayer → descanso', () => {
    const a = suggestRoutine({ sessions: [], shifts: ['2026-10-13'], today })
    expect(a).toEqual({ code: 'H2', reason: 'Sales de guardia: caminar suave + core o descanso', restAdvised: true })
    const b = suggestRoutine({ sessions: [], shifts: [today], today })
    expect(b).toEqual({ code: 'H2', reason: 'Hoy tienes guardia', restAdvised: true })
    expect(suggestRoutine({ sessions: [], shifts: ['2026-10-12'], today }).restAdvised).toBe(false)
  })

  it('tercer día seguido añade RIR 3', () => {
    const sessions = [s('2026-10-12', 'A'), s('2026-10-13', 'B')]
    const r = suggestRoutine({ sessions, shifts: [], today })
    expect(r.code).toBe('C')
    expect(r.reason).toContain('Tercer día seguido: RIR 3 y una serie menos')
    const r2 = suggestRoutine({ sessions: [s('2026-10-11', 'A'), s('2026-10-13', 'B')], shifts: [], today })
    expect(r2.reason).not.toContain('Tercer día')
  })

  it('si hoy ya hay A/B/C lo indica y sugiere la siguiente', () => {
    const r = suggestRoutine({ sessions: [s('2026-10-14', 'B')], shifts: [], today })
    expect(r.code).toBe('C')
    expect(r.reason).toContain('Hoy ya has entrenado')
  })
})
