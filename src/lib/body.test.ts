import { describe, expect, it } from 'vitest'
import { bmi, bmiWeight, whtr } from './body'

describe('body', () => {
  it('bmi', () => {
    expect(bmi(85, 185)).toBeCloseTo(24.84, 2)
    expect(bmi(95, 185)).toBeCloseTo(27.76, 2)
  })
  it('whtr', () => {
    expect(whtr(92.5, 185)).toBeCloseTo(0.5, 5)
    expect(whtr(100, 185)).toBeCloseTo(0.5405, 3)
  })
  it('bmiWeight', () => {
    expect(bmiWeight(25, 185)).toBeCloseTo(85.56, 2)
    expect(bmiWeight(25, 180)).toBeCloseTo(81, 5)
  })
})
