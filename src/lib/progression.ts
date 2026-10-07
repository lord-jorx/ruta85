import type { ISODate, LoadSuggestion, PlanExercise } from '../domain/types'
import { fmtShort } from './dates'

/**
 * Progresión de carga: réplica simplificada de `nextPrescription` de OpenGym
 * (frontend/src/lib/progression.js) con los textos de `suggest()` de tracker.html.
 *
 * Semántica replicada de OpenGym:
 *  - Solo cuentan las series de trabajo (se ignoran calentamientos) de sesiones no excluidas.
 *  - Una sesión "ok" = hay al menos las series prescritas y todas llegan a `reps` (el techo).
 *    Una serie con menos reps, o una serie que falta, es fallo.
 *  - Solo `ex.sets` series de trabajo deciden (las extra no mueven el plan, issue #233). Diferencia:
 *    OpenGym toma las primeras; aquí, las más pesadas (las aproximaciones en rampa no llevan marca).
 *  - Lineal: ok → +inc con `reps`. Doble: techo en todas las series → +inc y vuelta a `repsMin`;
 *    si no, mismo peso y apunta a min(techo, max(suelo, menor_reps + 1)).
 *  - Deload tras DELOAD_AFTER (3) sesiones seguidas sin progresar; una racha se corta con una
 *    sesión ok, con un cambio de peso y, en doble, con superar la mejor marca de reps a ese peso.
 *
 * Diferencias con OpenGym (a propósito):
 *  - OpenGym elige el deload con un selector basado en Epley (1RM × 0,9 y busca peso/reps en la
 *    rejilla). Aquí es ×0,9 redondeado al incremento (como tracker.html y `deloadTo` de OpenGym,
 *    que OpenGym solo usa para Greyskull/tiempo). Vuelve a repsMin (doble) o `reps` (lineal).
 *  - OpenGym juzga cada sesión contra el `target` que guardó esa sesión; aquí no se guarda, así
 *    que se juzga contra el plan actual (`ex.reps`), igual que hace OpenGym con sesiones antiguas
 *    sin `target` (`fallback`). No se detectan cambios de plan (`planned`).
 *  - Sin asistencia (máquinas asistidas), sin lados L/R (el parser ya suma las reps de ambos lados)
 *    y sin escalado por `repStep` (siempre +1 rep).
 *  - Peso base 0/null (peso corporal): OpenGym sube reps en lugar de peso; aquí, si la sesión fue
 *    ok, se sugiere `reps + 1` sin peso (sin techo `repsMax`, que el plan no tiene).
 *  - RIR 0 en la última serie de una sesión lineal ok → mantener peso (extra del plan, no es de OpenGym).
 */

export const DELOAD_AFTER = 3
export const DELOAD_FACTOR = 0.9
const DEFAULT_INC = 2.5

export interface HistorySet {
  weight: number | null
  reps: number | null
  rir?: number | null
  is_warmup?: boolean
}
export interface HistorySession {
  date: ISODate
  excluded?: boolean
  sets: HistorySet[]
}

const round2 = (n: number): number => Math.round(n * 100) / 100
const num = (n: number): string => String(round2(n)).replace('.', ',')

/** 1RM estimado de Epley: w × (1 + r/30). */
export function epley(w: number, r: number): number {
  if (!Number.isFinite(w) || !Number.isFinite(r) || w <= 0 || r < 1) return 0
  return w * (1 + r / 30)
}

/** Mejor 1RM estimado de un conjunto de series (ignora calentamientos); 0 si no hay datos. */
export function bestE1rm(sets: HistorySet[]): number {
  let best = 0
  for (const s of sets) {
    if (s.is_warmup) continue
    const e = epley(s.weight ?? 0, s.reps ?? 0)
    if (e > best) best = e
  }
  return round2(best)
}

interface Read {
  date: ISODate
  weight: number
  reps: number[]
  low: number
  rir: number | null
  ok: boolean
  texts: string[]
}

function goalOf(ex: PlanExercise): number {
  return ex.reps ?? ex.repsMin ?? 0
}

/** Lee una sesión como OpenGym `readSession` (modo reps). Devuelve null si no tiene series de trabajo. */
function readSession(ex: PlanExercise, s: HistorySession): Read | null {
  const work = s.sets.filter((x) => !x.is_warmup && (x.reps != null || x.weight != null))
  if (!work.length) return null
  const planned = Math.max(1, ex.sets)
  // Las `planned` series más pesadas, en su orden original: con series rectas son las primeras;
  // con aproximaciones en rampa (OpenGym no las marca como calentamiento) son las de trabajo.
  const heaviest = work
    .map((x, i) => ({ x, i }))
    .sort((a, b) => (b.x.weight ?? 0) - (a.x.weight ?? 0) || a.i - b.i)
    .slice(0, planned)
    .sort((a, b) => a.i - b.i)
  const counted = heaviest.map(({ x }) => x)
  const reps = counted.map((x) => x.reps ?? 0)
  const goal = goalOf(ex)
  const weight = Math.max(0, ...counted.map((x) => x.weight ?? 0))
  const lastSet = counted[counted.length - 1]
  return {
    date: s.date,
    weight,
    reps,
    low: Math.min(...reps),
    rir: lastSet.rir ?? null,
    ok: goal > 0 && work.length >= planned && reps.every((r) => r >= goal),
    texts: counted.map((x) => `${num(x.weight ?? 0)}×${x.reps ?? 0}`),
  }
}

function reads(ex: PlanExercise, history: HistorySession[]): Read[] {
  return history
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => !h.excluded)
    .sort((a, b) => (a.h.date < b.h.date ? -1 : a.h.date > b.h.date ? 1 : a.i - b.i))
    .map(({ h }) => readSession(ex, h))
    .filter((r): r is Read => r !== null)
}

function stallsOf(sessions: Read[], double: boolean): number {
  let n = 0
  for (let i = sessions.length - 1; i >= 0; i--) {
    if (sessions[i].ok) break
    if (i < sessions.length - 1 && sessions[i].weight !== sessions[i + 1].weight) break
    if (double) {
      const run: number[] = []
      for (let j = i - 1; j >= 0 && sessions[j].weight === sessions[i].weight; j--) run.push(sessions[j].low)
      if (run.length && sessions[i].low > Math.max(...run)) break
    }
    n++
  }
  return n
}

/** Sesiones seguidas sin progresar (cuenta desde la última hacia atrás), como `stallCount` de OpenGym. */
export function stallCount(ex: PlanExercise, history: HistorySession[]): number {
  if (!tracksLoad(ex)) return 0
  return stallsOf(reads(ex, history), ex.prog === 'double')
}

function tracksLoad(ex: PlanExercise): boolean {
  return ex.mode === 'reps' && (ex.prog === 'linear' || ex.prog === 'double')
}

function snap(w: number, inc: number): number {
  return round2(Math.round(w / inc) * inc)
}

/** Siguiente carga recomendada para un ejercicio a partir de su historial. */
export function suggestLoad(ex: PlanExercise, history: HistorySession[]): LoadSuggestion {
  const inc = ex.inc && ex.inc > 0 ? ex.inc : DEFAULT_INC
  const top = goalOf(ex)
  const bottom = ex.repsMin ?? top

  if (ex.mode !== 'reps' || ex.prog === 'time' || ex.prog === 'off') {
    const sessions = ex.mode === 'reps' ? reads(ex, history) : []
    const last = sessions[sessions.length - 1]
    let text: string
    if (ex.mode === 'cardio') text = 'Cardio: sin progresión automática. Mantén el ritmo y sube el tiempo o la intensidad según cómo te sientas.'
    else if (ex.mode === 'time' || ex.prog === 'time') text = 'Ejercicio por tiempo: sin progresión automática. Mantén la duración y alárgala cuando te resulte fácil.'
    else text = 'Sin progresión automática: elige el peso según cómo te sientas.'
    return { kind: 'hold', weight: last ? last.weight : null, reps: ex.reps ?? ex.sec ?? ex.min ?? 0, text }
  }

  const double = ex.prog === 'double'
  const sessions = reads(ex, history)
  const last = sessions[sessions.length - 1]
  if (!last) {
    return {
      kind: 'first',
      weight: null,
      reps: double ? bottom : top,
      text: 'Primera vez: elige un peso con el que te sobren 3-4 repeticiones (RIR 3-4)',
    }
  }

  const w = last.weight
  const lastTxt =
    `Última vez (${fmtShort(last.date)}): ${last.texts.join(', ')}` +
    (last.rir != null ? ` · RIR ${num(last.rir)}` : '') +
    '. '

  // Sin carga (peso corporal): se progresa en repeticiones.
  if (w <= 0) {
    if (last.ok) {
      const next = top + 1
      return { kind: 'increase', weight: null, reps: next, text: `${lastTxt}Peso corporal: todas las series completas, prueba con ${next} repeticiones (o añade lastre).` }
    }
    return { kind: 'hold', weight: null, reps: top, text: `${lastTxt}Peso corporal: misma meta hasta completar todas las series.` }
  }

  if (last.ok) {
    if (!double && last.rir === 0) {
      return { kind: 'repeat-rir0', weight: w, reps: top, text: `${lastTxt}Saliste a RIR 0: repite ${num(w)} kg.` }
    }
    const nw = round2(w + inc)
    return double
      ? { kind: 'increase', weight: nw, reps: bottom, text: `${lastTxt}Techo del rango en todas las series: sube a ${num(nw)} kg y vuelve a ${bottom} repeticiones.` }
      : { kind: 'increase', weight: nw, reps: top, text: `${lastTxt}Completaste todo: sube a ${num(nw)} kg × ${top}.` }
  }

  const stalls = stallsOf(sessions, double)
  if (stalls >= DELOAD_AFTER) {
    let dw = snap(w * DELOAD_FACTOR, inc)
    if (dw >= w) dw = snap(w - inc, inc)
    dw = Math.max(inc, dw)
    return {
      kind: 'deload',
      weight: dw,
      reps: double ? bottom : top,
      text: `${lastTxt}${stalls} sesiones sin progresar: baja a ${num(dw)} kg (−10 %) y vuelve a subir.`,
    }
  }

  const aim = double ? Math.min(top, Math.max(bottom, last.low + 1)) : top
  return {
    kind: 'hold',
    weight: w,
    reps: aim,
    text: `${lastTxt}Mismo peso (${num(w)} kg): apunta a ${aim} repeticiones en todas las series.`,
  }
}
