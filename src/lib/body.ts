/** Índice de masa corporal (kg/m²). */
export function bmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100
  return weightKg / (m * m)
}

/** Relación cintura/altura (objetivo < 0,5). */
export function whtr(waistCm: number, heightCm: number): number {
  return waistCm / heightCm
}

/** Peso (kg) que corresponde a un IMC dado para una altura. */
export function bmiWeight(targetBmi: number, heightCm: number): number {
  const m = heightCm / 100
  return targetBmi * m * m
}
