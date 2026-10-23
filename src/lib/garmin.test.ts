import { describe, expect, it } from 'vitest'
import { GARMIN_NOTE_PREFIX, parseGarminCsv } from './garmin'

const EN_HEADER = 'Activity Type,Date,Favorite,Title,Distance,Calories,Time,Avg HR'
const ES_HEADER = 'Tipo de actividad;Fecha;Favorito;Título;Distancia;Calorías;Tiempo;FC Media'

describe('parseGarminCsv · inglés con comas', () => {
  const csv = [
    EN_HEADER,
    'Walking,2026-10-05 18:30:12,false,City Walking,4.20,250,00:45:12,98',
    'Running,2026-10-06 07:00:00,false,Morning Run,5.01,410,00:31:40.7,150',
    'Cycling,2026-10-07 09:10:00,false,Road Ride,20.5,600,01:05:00,130',
    'Elliptical,2026-10-08 20:00:00,false,Elliptical,--,300,00:30:00,120',
    'Yoga,2026-10-09 08:00:00,false,Stretching,0.00,100,00:20:00,80',
  ].join('\r\n')

  it('convierte tipo, fecha, minutos y nota', () => {
    const r = parseGarminCsv(csv)
    expect(r.skipped).toBe(0)
    expect(r.warnings).toEqual([])
    expect(r.activities).toEqual([
      { date: '2026-10-05', kind: 'walk', minutes: 45, note: 'Garmin · City Walking · 4,2 km' },
      { date: '2026-10-06', kind: 'run', minutes: 32, note: 'Garmin · Morning Run · 5 km' },
      { date: '2026-10-07', kind: 'bike', minutes: 65, note: 'Garmin · Road Ride · 20,5 km' },
      { date: '2026-10-08', kind: 'elliptical', minutes: 30, note: 'Garmin · Elliptical' },
      { date: '2026-10-09', kind: 'other', minutes: 20, note: 'Garmin · Stretching' },
    ])
  })

  it('todas las notas empiezan por el prefijo', () => {
    for (const a of parseGarminCsv(csv).activities) expect(a.note.startsWith(GARMIN_NOTE_PREFIX)).toBe(true)
  })
})

describe('parseGarminCsv · español con punto y coma', () => {
  const csv = [
    ES_HEADER,
    'Caminar;2026-10-05 18:30:12;false;"Paseo Caminar";"4,2";250;00:45:12;98',
    'Carrera;2026-10-06 07:00:00;false;Carrera matutina;"5,08";410;31:40;150',
    'Carrera en cinta;2026-10-07 07:00:00;false;Cinta;"3,00";300;00:25:00;140',
    'Ciclismo en interior;2026-10-08 19:00:00;false;Spinning;--;500;00:50:00;135',
    'Senderismo;2026-10-09 10:00:00;false;Sierra;"12,3";900;03:10:00;110',
    'Entrenamiento de fuerza;2026-10-10 18:00:00;false;Fuerza;--;300;01:00:00;100',
    'Natación;2026-10-11 12:00:00;false;Piscina;"1,5";400;00:40:00;120',
  ].join('\n')

  it('detecta ; y cabeceras en español, y omite fuerza', () => {
    const r = parseGarminCsv(csv)
    expect(r.skipped).toBe(1)
    expect(r.activities.map((a) => [a.date, a.kind, a.minutes])).toEqual([
      ['2026-10-05', 'walk', 45],
      ['2026-10-06', 'run', 32],
      ['2026-10-07', 'run', 25],
      ['2026-10-08', 'bike', 50],
      ['2026-10-09', 'walk', 190],
      ['2026-10-11', 'other', 40],
    ])
    expect(r.activities[0].note).toBe('Garmin · Paseo Caminar · 4,2 km')
    expect(r.activities[1].note).toBe('Garmin · Carrera matutina · 5,1 km')
  })

  it('acepta fecha DD/MM/YYYY HH:MM y columna Tiempo transcurrido como respaldo', () => {
    const r = parseGarminCsv(
      ['Tipo de actividad;Fecha;Título;Tiempo;Tiempo transcurrido', 'Caminar;05/10/2026 18:30;Paseo;--;00:12:30'].join('\n'),
    )
    expect(r.activities).toEqual([{ date: '2026-10-05', kind: 'walk', minutes: 13, note: 'Garmin · Paseo' }])
  })
})

describe('parseGarminCsv · formato CSV', () => {
  it('BOM, comillas con comas, "" escapado y saltos de línea dentro de comillas', () => {
    const csv =
      '﻿' +
      [
        'Activity Type,Date,Title,Distance,Time',
        'Walking,2026-10-05 10:00:00,"Park, lake ""north"" loop","1,234.56",00:50:00',
        'Walking,2026-10-06 10:00:00,"Line one\nline two",3.0,00:30:00',
        '',
      ].join('\r\n')
    const r = parseGarminCsv(csv)
    expect(r.skipped).toBe(0)
    expect(r.activities[0].note).toBe('Garmin · Park, lake "north" loop · 1234,6 km')
    expect(r.activities[1].note).toBe('Garmin · Line one line two · 3 km')
    expect(r.activities).toHaveLength(2)
  })

  it('omite fuerza en inglés y no la cuenta como aviso', () => {
    const r = parseGarminCsv(
      ['Activity Type,Date,Title,Time', 'Strength Training,2026-10-05 10:00:00,Gym,01:00:00', 'Walking,2026-10-05 12:00:00,W,00:10:00'].join('\n'),
    )
    expect(r.skipped).toBe(1)
    expect(r.warnings).toEqual([])
    expect(r.activities).toHaveLength(1)
  })

  it('duraciones variadas: HH:MM:SS, MM:SS, decimales y mínimo 1 minuto', () => {
    const rows = ['00:45:12', '45:12', '00:45:12.3', '0:00:20', '01:00:00', '00:00:29.9']
    const csv = ['Activity Type,Date,Title,Time', ...rows.map((t) => `Walking,2026-10-05 10:00:00,T,${t}`)].join('\n')
    expect(parseGarminCsv(csv).activities.map((a) => a.minutes)).toEqual([45, 45, 45, 1, 60, 1])
  })

  it('filas sin fecha o sin duración válidas van a skipped con aviso', () => {
    const csv = [
      'Activity Type,Date,Title,Time',
      'Walking,,No date,00:30:00',
      'Walking,2026-13-40 10:00:00,Bad date,00:30:00',
      'Walking,2026-10-05 10:00:00,No time,--',
      'Walking,2026-10-05 10:00:00,Zero,00:00:00',
      'Walking,2026-10-05 10:00:00,OK,00:30:00',
    ].join('\n')
    const r = parseGarminCsv(csv)
    expect(r.activities).toHaveLength(1)
    expect(r.skipped).toBe(4)
    expect(r.warnings).toHaveLength(4)
    expect(r.warnings[0]).toContain('Fila 2')
  })

  it('limita la nota a 120 caracteres conservando la distancia', () => {
    const csv = ['Activity Type,Date,Title,Distance,Time', `Walking,2026-10-05 10:00:00,${'x'.repeat(300)},4.2,00:30:00`].join('\n')
    const note = parseGarminCsv(csv).activities[0].note
    expect(note.length).toBeLessThanOrEqual(120)
    expect(note.endsWith('… · 4,2 km')).toBe(true)
    expect(note.startsWith(GARMIN_NOTE_PREFIX)).toBe(true)
  })

  it('sin título usa el tipo de actividad', () => {
    const csv = ['Activity Type,Date,Title,Time', 'Walking,2026-10-05 10:00:00,,00:30:00'].join('\n')
    expect(parseGarminCsv(csv).activities[0].note).toBe('Garmin · Walking')
  })

  it('lanza error claro si no es un CSV de Garmin o está vacío', () => {
    expect(() => parseGarminCsv('')).toThrow(/vacío/)
    expect(() => parseGarminCsv('a,b,c\n1,2,3')).toThrow(/Garmin/)
  })
})
