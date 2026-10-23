import { describe, expect, it } from 'vitest'
import { forGrams, isValidBarcode, parseOffProduct } from './off'
import type { OffProduct } from './off'

const base = {
  code: '8480000610317',
  product_name_es: 'Yogur griego',
  brands: 'Hacendado, Mercadona',
  nutriments: { 'energy-kcal_100g': 115, proteins_100g: 9.4 },
  serving_quantity: 125,
}

describe('parseOffProduct', () => {
  it('lee nombre, marca, kcal, proteína y ración', () => {
    expect(parseOffProduct(base)).toEqual({
      code: '8480000610317',
      name: 'Yogur griego',
      brand: 'Hacendado',
      kcal100: 115,
      protein100: 9.4,
      servingG: 125,
    })
  })

  it('usa kJ / 4,184 cuando no hay kcal', () => {
    const p = parseOffProduct({ ...base, nutriments: { energy_100g: 480, proteins_100g: 3 } })
    expect(p?.kcal100).toBeCloseTo(480 / 4.184, 5)
    expect(Math.round(p?.kcal100 ?? 0)).toBe(115)
  })

  it('prefiere kcal sobre kJ y acepta 0 kcal', () => {
    const p = parseOffProduct({ ...base, nutriments: { 'energy-kcal_100g': 0, energy_100g: 480 } })
    expect(p?.kcal100).toBe(0)
  })

  it('devuelve null sin nombre o sin energía', () => {
    expect(parseOffProduct({ ...base, product_name_es: '', product_name: ' ', generic_name: undefined })).toBeNull()
    expect(parseOffProduct({ ...base, nutriments: { proteins_100g: 5 } })).toBeNull()
    expect(parseOffProduct({ ...base, nutriments: undefined })).toBeNull()
    expect(parseOffProduct(null)).toBeNull()
    expect(parseOffProduct('x')).toBeNull()
  })

  it('cae a product_name y generic_name; marca nula y proteína 0 si faltan', () => {
    const p = parseOffProduct({
      code: '1234567890123',
      product_name: 'Greek yogurt',
      nutriments: { 'energy-kcal_100g': '97' },
    })
    expect(p).toEqual({ code: '1234567890123', name: 'Greek yogurt', brand: null, kcal100: 97, protein100: 0, servingG: null })
    expect(parseOffProduct({ generic_name: 'Yogur', nutriments: { 'energy-kcal_100g': 60 } })?.name).toBe('Yogur')
  })

  it('serving_quantity como texto', () => {
    expect(parseOffProduct({ ...base, serving_quantity: '150' })?.servingG).toBe(150)
    expect(parseOffProduct({ ...base, serving_quantity: '12,5' })?.servingG).toBe(12.5)
    expect(parseOffProduct({ ...base, serving_quantity: '0' })?.servingG).toBeNull()
    expect(parseOffProduct({ ...base, serving_quantity: 'abc' })?.servingG).toBeNull()
  })
})

describe('forGrams', () => {
  const p: OffProduct = {
    code: '1',
    name: 'Yogur griego',
    brand: 'Hacendado',
    kcal100: 115,
    protein100: 9.4,
    servingG: 125,
  }

  it('escala por gramos y redondea (kcal entero, proteína 1 decimal)', () => {
    expect(forGrams(p, 150)).toEqual({ label: 'Yogur griego Hacendado (150 g)', kcal: 173, protein_g: 14.1 })
    expect(forGrams(p, 100)).toEqual({ label: 'Yogur griego Hacendado (100 g)', kcal: 115, protein_g: 9.4 })
  })

  it('sin marca, con marca ya en el nombre y con gramos decimales', () => {
    expect(forGrams({ ...p, brand: null }, 30).label).toBe('Yogur griego (30 g)')
    expect(forGrams({ ...p, name: 'Yogur griego Hacendado' }, 30).label).toBe('Yogur griego Hacendado (30 g)')
    expect(forGrams(p, 12.5).label).toBe('Yogur griego Hacendado (12,5 g)')
  })
})

describe('isValidBarcode', () => {
  it('solo dígitos, 8 a 14', () => {
    expect(isValidBarcode('8480000610317')).toBe(true)
    expect(isValidBarcode('12345678')).toBe(true)
    expect(isValidBarcode('1234567')).toBe(false)
    expect(isValidBarcode('123456789012345')).toBe(false)
    expect(isValidBarcode('84800006103a7')).toBe(false)
  })
})
