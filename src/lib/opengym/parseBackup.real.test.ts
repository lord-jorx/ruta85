/// <reference types="node" />
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { ROUTINE_BY_CODE } from '../../data/plan'
import { suggestLoad } from '../progression'
import { customIdFromName, parseOpenGymBackup } from './parseBackup'

describe('customIdFromName', () => {
  it('reconoce los ejercicios propios por el nombre, con o sin tildes', () => {
    expect(customIdFromName('Cardio libre (bici, elíptica, cinta, remo o caminar)')).toBe('c-cardio')
    expect(customIdFromName('Extensión isométrica de cuádriceps (60º)')).toBe('c-iso-ext')
    expect(customIdFromName('Plancha frontal')).toBe('c-plank')
    expect(customIdFromName('Sentadilla isometrica en pared (wall sit)')).toBe('c-wallsit')
    expect(customIdFromName('Press banca')).toBeNull()
    expect(customIdFromName(undefined)).toBeNull()
  })
})

// Copia real del usuario: está en .gitignore (*.real.json), así que en CI no existe y se salta.
const REAL = fileURLToPath(new URL('./__fixtures__/backup.2026-10-07.real.json', import.meta.url))

describe.skipIf(!existsSync(REAL))('copia real de OpenGym (7 oct 2026)', () => {
  const parsed = parseOpenGymBackup(readFileSync(REAL, 'utf8'))
  const session = parsed.sessions[0]

  it('lee la sesión A con duración y sin avisos', () => {
    expect(parsed.warnings).toEqual([])
    expect(parsed.sessions).toHaveLength(1)
    expect(session.routine_code).toBe('A')
    expect(session.date).toBe('2026-10-07')
    expect(session.duration_min).toBeGreaterThan(30)
  })

  it('traduce los ids aleatorios de los ejercicios propios', () => {
    const ids = new Set(session.sets.map((s) => s.exercise_id))
    expect(ids.has('c-cardio')).toBe(true)
    expect(ids.has('c-plank')).toBe(true)
    expect([...ids].some((id) => id.startsWith('mux'))).toBe(false)
  })

  it('con series en rampa, la progresión parte de las series más pesadas', () => {
    const ex = ROUTINE_BY_CODE.A.exercises.find((e) => e.id === '0579')!
    const sets = session.sets.filter((s) => s.exercise_id === '0579')
    const next = suggestLoad(ex, [{ date: session.date, sets }])
    expect(next.weight).toBeGreaterThan(Math.max(...sets.map((s) => s.weight ?? 0)) - 0.01)
  })
})
