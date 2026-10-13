import { describe, expect, it } from 'vitest'
import sample from './__fixtures__/backup.sample.json'
import { parseOpenGymBackup, routineCodeFromName } from './parseBackup'

const clone = () => JSON.parse(JSON.stringify(sample)) as Record<string, any>

describe('parseOpenGymBackup (fixture)', () => {
  const out = parseOpenGymBackup(sample)

  it('metadatos y pesadas', () => {
    expect(out.unit).toBe('kg')
    expect(out.targetW).toBe(75)
    expect(out.bodyweights).toEqual([
      { date: '2026-10-05', weight: 82.4 },
      { date: '2026-10-06', weight: 82 },
      { date: '2026-10-10', weight: 81.6 },
    ])
    expect(out.sessions).toHaveLength(3)
  })

  it('códigos de rutina, duración y exclusión', () => {
    const [b, a, dl] = out.sessions
    expect(b).toMatchObject({ source_ref: 'wk-1001', date: '2026-10-06', routine_code: 'B', duration_min: 65, excluded: false })
    expect(a).toMatchObject({ source_ref: 'wk-1002', routine_code: 'A', duration_min: 70, excluded: false })
    expect(dl).toMatchObject({ source_ref: 'wk-1003', routine_code: 'DL', excluded: true })
  })

  it('solo series hechas y calentamiento marcado', () => {
    const b = out.sessions[0]
    const deadlift = b.sets.filter((s) => s.exercise_id === '0085')
    expect(deadlift).toHaveLength(4) // 1 calentamiento + 3 hechas (la 4ª de trabajo no está hecha)
    expect(deadlift[0]).toMatchObject({ is_warmup: true, weight: 30, reps: 5, set_index: 0 })
    expect(deadlift.filter((s) => !s.is_warmup).map((s) => s.reps)).toEqual([5, 5, 4])
    expect(deadlift.filter((s) => !s.is_warmup).map((s) => s.rir)).toEqual([3, 2, 1])
    expect(deadlift.map((s) => s.set_index)).toEqual([0, 1, 2, 3])
  })

  it('series unilaterales: suma de lados hechos, mayor peso, menor RIR', () => {
    const side = out.sessions[0].sets.filter((s) => s.exercise_id === '0861')
    expect(side).toHaveLength(2)
    expect(side[0]).toMatchObject({ weight: 20, reps: 19, rir: 1, set_index: 0 })
    expect(side[1]).toMatchObject({ weight: 20, reps: 8, set_index: 1 }) // solo el lado L hecho
  })

  it('series por tiempo y cardio', () => {
    const b = out.sessions[0]
    const plank = b.sets.filter((s) => s.exercise_id === 'c-plank')
    expect(plank.map((s) => s.sec)).toEqual([30, 35])
    expect(plank[0]).toMatchObject({ weight: 0, reps: null })
    const cardio = b.sets.filter((s) => s.exercise_id === 'c-cardio')
    expect(cardio).toEqual([expect.objectContaining({ sec: 600, reps: null })])
  })

  it('RPE sin RIR se convierte (RIR = 10 − RPE)', () => {
    const squat = out.sessions[1].sets.filter((s) => s.exercise_id === '3281')
    expect(squat.map((s) => s.rir)).toEqual([2, 2, 1])
  })

  it('reimportar da los mismos source_ref', () => {
    const again = parseOpenGymBackup(JSON.parse(JSON.stringify(sample)))
    expect(again.sessions.map((s) => s.source_ref)).toEqual(out.sessions.map((s) => s.source_ref))
  })

  it('acepta el JSON como texto', () => {
    expect(parseOpenGymBackup(JSON.stringify(sample)).sessions).toHaveLength(3)
  })
})

describe('parseOpenGymBackup (casos límite)', () => {
  it('no es una copia de OpenGym', () => {
    expect(() => parseOpenGymBackup(null)).toThrow('No parece una copia de OpenGym')
    expect(() => parseOpenGymBackup([])).toThrow('No parece una copia de OpenGym')
    expect(() => parseOpenGymBackup({ unit: 'kg' })).toThrow('No parece una copia de OpenGym')
    expect(() => parseOpenGymBackup('no json')).toThrow('No parece una copia de OpenGym')
  })

  it('lb → kg con 2 decimales (series, pesadas y objetivo)', () => {
    const s = clone()
    s.unit = 'lb'
    s.targetW = 165
    s.bodyweight = [{ d: '2026-10-05', w: 180 }]
    const out = parseOpenGymBackup(s)
    expect(out.unit).toBe('lb')
    expect(out.targetW).toBe(74.84)
    expect(out.bodyweights).toEqual([{ date: '2026-10-05', weight: 81.65 }])
    const w = out.sessions[0].sets.find((x) => x.exercise_id === '0085' && !x.is_warmup)!
    expect(w.weight).toBe(27.22) // 60 lb
  })

  it('sin id de workout usa un hash estable de fecha + ejercicios', () => {
    const s = clone()
    delete s.workouts[0].id
    const a = parseOpenGymBackup(s).sessions[0].source_ref
    const t2 = clone()
    delete t2.workouts[0].id
    const b = parseOpenGymBackup(t2).sessions[0].source_ref
    expect(a).toMatch(/^h-[0-9a-f]{14}$/)
    expect(a).toBe(b)
    s.workouts[0].d = '2026-10-07'
    expect(parseOpenGymBackup(s).sessions.find((x) => x.date === '2026-10-07')!.source_ref).not.toBe(a)
  })

  it('datos raros → warnings, no excepciones', () => {
    const s = clone()
    s.workouts.push(null, { d: 'mañana', entries: [] }, { id: 'x', d: '2026-10-12', entries: [{ id: '0001', sets: [{ w: 5, r: 5, done: false }] }] })
    s.workouts[0].entries.push({ nope: true })
    s.bodyweight.push({ d: 'ayer', w: 90 }, { d: '2026-10-11', w: -3 })
    s.unit = 'stone'
    const out = parseOpenGymBackup(s)
    expect(out.sessions).toHaveLength(3)
    expect(out.unit).toBe('kg')
    expect(out.warnings.length).toBeGreaterThanOrEqual(5)
  })

  it('id de workout repetido se desambigua', () => {
    const s = clone()
    s.workouts[1].id = s.workouts[0].id
    const refs = parseOpenGymBackup(s).sessions.map((x) => x.source_ref)
    expect(new Set(refs).size).toBe(3)
  })

  it('el nombre de rutina se resuelve por S.routines y cae al nombre del workout', () => {
    const s = clone()
    s.workouts[0].routineIds = ['desconocida']
    s.workouts[0].routineId = 'desconocida'
    expect(parseOpenGymBackup(s).sessions[0].routine_code).toBe('B') // por workout.name
    s.workouts[0].name = 'Mi sesión'
    expect(parseOpenGymBackup(s).sessions[0].routine_code).toBeNull()
  })
})

describe('routineCodeFromName', () => {
  it('prefijos', () => {
    expect(routineCodeFromName('A · Sentadilla + pecho')).toBe('A')
    expect(routineCodeFromName('B · Cadera')).toBe('B')
    expect(routineCodeFromName('C · Prensa')).toBe('C')
    expect(routineCodeFromName('Casa 1 · fuerza sin material')).toBe('H1')
    expect(routineCodeFromName('Casa 2 · caminar + core')).toBe('H2')
    expect(routineCodeFromName('Cardio libre · zona 2')).toBe('Z2')
    expect(routineCodeFromName('Deload (semana ligera)')).toBe('DL')
    expect(routineCodeFromName('Arms day')).toBeNull()
    expect(routineCodeFromName(undefined)).toBeNull()
  })
})
