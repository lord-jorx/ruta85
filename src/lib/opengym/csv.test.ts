import { describe, expect, it } from 'vitest'
import { bodyweightCsv } from './csv'

describe('bodyweightCsv', () => {
  it('cabecera y filas ordenadas por fecha, solo días con peso', () => {
    const csv = bodyweightCsv([
      { date: '2026-10-07', weight: 94.6 },
      { date: '2026-10-05', weight: 95.4 },
      { date: '2026-10-06', weight: null },
    ])
    expect(csv).toBe('date,weight kg\n2026-10-05,95.4\n2026-10-07,94.6\n')
  })
  it('sin datos solo cabecera; día repetido gana el último', () => {
    expect(bodyweightCsv([])).toBe('date,weight kg\n')
    expect(
      bodyweightCsv([
        { date: '2026-10-05', weight: 95 },
        { date: '2026-10-05', weight: 94.8 },
      ]),
    ).toBe('date,weight kg\n2026-10-05,94.8\n')
  })
})
