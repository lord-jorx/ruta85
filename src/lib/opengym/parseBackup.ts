import type { ISODate, RoutineCode } from '../../domain/types'
import { isISODate } from '../dates'

/**
 * Parser de la copia de seguridad de OpenGym (Ajustes → Datos → Export backup = JSON.stringify(S)).
 *
 * Forma real deducida del código de OpenGym (frontend/src/lib/{history,workout-model,finish-workout}.js
 * y mcp/src/state.js `defaultsShape`):
 *   S = { unit:'kg'|'lb', targetW, bodyweight:[{d,w}], routines:[{id,name,ex:[…]}],
 *         workouts:[{ id, d:'YYYY-MM-DD', start:ms, end:ms, name, bw, routineId, routineIds[],
 *                     excludeFromProgression?, note?, prs?,
 *                     entries:[{ id:exerciseId, sets:[…], topW, target, rid?, noProg?, planned?, sg? }] }],
 *         customEx:[…], … }
 *   set = { w, r, done, rir?, rpe?, phase?:'warmup'|'work', warmup?:true, sec?, min?, speed?,
 *           sides?:{ L:{w,r,done,rir?,rpe?}, R:{…} }, type?, drops?, clusters? }
 *   - Calentamiento: `phase === 'warmup'` o `warmup === true` (isWarmupRow).
 *   - Unilateral: `sides.L/.R`; el agregado es r = L.r + R.r y w = max(L.w, R.w) (syncSideAggregate).
 *   - Todos los pesos (series, bodyweight, targetW) están en `S.unit` (units.js convierte al cambiar de unidad).
 *
 * Confirmado con una copia real (7 oct 2026): `routineIds`/`routineId` apuntan a `S.routines[].id`;
 * las series de cardio son `{min, speed, done}` y las de tiempo `{sec, w:0, done}`; no hay marca de
 * calentamiento (las series de aproximación son series normales con menos peso); los ejercicios
 * propios llevan ids aleatorios (ver `customIdFromName`). Sin confirmar: `S.bodyweight[].w` en `S.unit`.
 */

export interface ParsedSet {
  exercise_id: string
  /** Posición (base 0) en el array de series de la entrada de OpenGym, incluidas las no hechas. */
  set_index: number
  weight: number | null
  reps: number | null
  /** Segundos de trabajo (series por tiempo; en cardio, minutos × 60). */
  sec: number | null
  rir: number | null
  is_warmup: boolean
}

export interface ParsedSession {
  source_ref: string
  date: ISODate
  routine_code: RoutineCode | null
  duration_min: number | null
  excluded: boolean
  sets: ParsedSet[]
}

export interface ParsedBackup {
  unit: 'kg' | 'lb'
  /** Peso objetivo de OpenGym, ya en kg. */
  targetW: number | null
  sessions: ParsedSession[]
  /** Pesadas ya en kg. */
  bodyweights: { date: ISODate; weight: number }[]
  warnings: string[]
}

const LB_TO_KG = 0.45359237

type Obj = Record<string, unknown>
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v)
const round2 = (n: number): number => Math.round(n * 100) / 100
const finite = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** Código de rutina según el nombre ("A · …", "Casa 1 …", "Cardio …", "Deload …"). */
export function routineCodeFromName(name: unknown): RoutineCode | null {
  if (typeof name !== 'string') return null
  const n = name.trim()
  const m = /^([ABC])\s*(?:[·.:\-–—]|$)/.exec(n)
  if (m) return m[1] as RoutineCode
  if (/^casa\s*1\b/i.test(n)) return 'H1'
  if (/^casa\s*2\b/i.test(n)) return 'H2'
  if (/^cardio\b/i.test(n)) return 'Z2'
  if (/^deload\b/i.test(n)) return 'DL'
  return null
}

const CUSTOM_BY_NAME: [RegExp, string][] = [
  [/^cardio\b/, 'c-cardio'],
  [/^extension isometrica/, 'c-iso-ext'],
  [/^plancha/, 'c-plank'],
  [/wall sit|^sentadilla isometrica/, 'c-wallsit'],
  [/^bird.?dog/, 'c-birddog'],
]

/**
 * OpenGym asigna ids aleatorios a los ejercicios propios al importar un plan (p. ej. "mux6srzbj6bvn"),
 * así que se reconocen por el nombre de `S.customEx`. Devuelve el id propio de la app ("c-…") o null.
 */
export function customIdFromName(name: unknown): string | null {
  if (typeof name !== 'string') return null
  const n = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
  for (const [re, id] of CUSTOM_BY_NAME) if (re.test(n)) return id
  return null
}

/** Hash corto sincrónico (cyrb53) en hexadecimal; solo para identificadores estables, no criptográfico. */
function shortHash(text: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < text.length; i++) {
    const ch = text.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16).padStart(14, '0')
}

function localISO(ms: number): ISODate | null {
  const dt = new Date(ms)
  if (Number.isNaN(dt.getTime())) return null
  const p = (n: number, l = 2) => String(n).padStart(l, '0')
  return `${p(dt.getFullYear(), 4)}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`
}

function isWarmup(set: Obj): boolean {
  if (typeof set.phase === 'string' && set.phase.trim() !== '') {
    const t = set.phase.trim().toLowerCase()
    if (t === 'warmup' || t === 'warm-up' || t === 'warm_up') return true
    if (t === 'work') return false
  }
  return set.warmup === true
}

function isSideSet(set: Obj): set is Obj & { sides: { L: Obj; R: Obj } } {
  return isObj(set.sides) && isObj(set.sides.L) && isObj(set.sides.R)
}

/** RIR de una serie: `rir`, o 10 − `rpe` si solo hay RPE. */
function rirOf(row: Obj): number | null {
  const rir = finite(row.rir)
  if (rir !== null) return rir
  const rpe = finite(row.rpe)
  return rpe !== null ? Math.max(0, round2(10 - rpe)) : null
}

export function parseOpenGymBackup(raw: unknown): ParsedBackup {
  let data: unknown = raw
  if (typeof data === 'string') {
    try {
      data = JSON.parse(data)
    } catch {
      throw new Error('No parece una copia de OpenGym')
    }
  }
  if (!isObj(data) || !Array.isArray(data.workouts)) throw new Error('No parece una copia de OpenGym')

  const warnings: string[] = []
  const unit: 'kg' | 'lb' = data.unit === 'lb' ? 'lb' : 'kg'
  if (data.unit !== undefined && data.unit !== 'kg' && data.unit !== 'lb') {
    warnings.push(`Unidad desconocida "${String(data.unit)}": se asume kg.`)
  }
  const toKg = (v: number): number => (unit === 'lb' ? round2(v * LB_TO_KG) : v)

  const tw = finite(data.targetW)
  const targetW = tw !== null && tw > 0 ? toKg(tw) : null

  // Rutinas: id → nombre.
  const routineNames = new Map<string, string>()
  if (Array.isArray(data.routines)) {
    for (const r of data.routines) {
      if (isObj(r) && r.id != null && typeof r.name === 'string') routineNames.set(String(r.id), r.name)
    }
  }

  // Ejercicios propios: id aleatorio de OpenGym → id "c-…" de la app (si el nombre se reconoce).
  const customIds = new Map<string, string>()
  if (Array.isArray(data.customEx)) {
    for (const c of data.customEx) {
      if (!isObj(c) || c.id == null) continue
      const mapped = customIdFromName(c.n)
      if (mapped) customIds.set(String(c.id), mapped)
    }
  }

  // Pesadas.
  const bwByDate = new Map<ISODate, number>()
  if (Array.isArray(data.bodyweight)) {
    data.bodyweight.forEach((b, i) => {
      const date = isObj(b) ? b.d : undefined
      const w = isObj(b) ? finite(b.w) : null
      if (!isISODate(date) || w === null || w <= 0) {
        warnings.push(`Pesada #${i + 1} ignorada: fecha o peso no válidos.`)
        return
      }
      bwByDate.set(date, toKg(w))
    })
  }
  const bodyweights = [...bwByDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([date, weight]) => ({ date, weight }))

  // Sesiones.
  const sessions: ParsedSession[] = []
  const seenRefs = new Set<string>()
  data.workouts.forEach((w, wi) => {
    const label = `Entrenamiento #${wi + 1}`
    if (!isObj(w)) {
      warnings.push(`${label} ignorado: no es un objeto.`)
      return
    }
    const start = finite(w.start)
    const date = isISODate(w.d) ? w.d : start !== null ? localISO(start) : null
    if (!date) {
      warnings.push(`${label} ignorado: sin fecha válida.`)
      return
    }

    // Código de rutina: rutina del workout (routineIds[0] / routineId) → nombre; si no, `name`.
    const rid =
      (Array.isArray(w.routineIds) && w.routineIds.length ? w.routineIds[0] : undefined) ?? w.routineId ?? undefined
    const ridStr = rid != null ? String(rid) : null
    let code: RoutineCode | null = null
    if (ridStr !== null) code = routineCodeFromName(routineNames.get(ridStr))
    if (code === null) code = routineCodeFromName(w.name)
    if (code === null && ridStr !== null && /^(A|B|C|H1|H2|Z2|DL)$/.test(ridStr)) code = ridStr as RoutineCode

    const entries = Array.isArray(w.entries) ? w.entries : []
    let noProgCount = 0
    let entryCount = 0
    const sets: ParsedSet[] = []
    const exerciseIds: string[] = []

    entries.forEach((e, ei) => {
      if (!isObj(e) || e.id == null || e.id === '' || !Array.isArray(e.sets)) {
        warnings.push(`${label} (${date}): entrada #${ei + 1} ignorada.`)
        return
      }
      entryCount++
      if (e.noProg === true) noProgCount++
      const exercise_id = customIds.get(String(e.id)) ?? String(e.id)
      exerciseIds.push(exercise_id)
      e.sets.forEach((s, si) => {
        if (!isObj(s)) return
        let weight: number | null
        let reps: number | null
        let rir: number | null
        if (isSideSet(s)) {
          const done = [s.sides.L, s.sides.R].filter((x) => x.done === true)
          if (!done.length) return
          const ws = done.map((x) => finite(x.w)).filter((x): x is number => x !== null)
          const rs = done.map((x) => finite(x.r) ?? 0)
          weight = ws.length ? Math.max(...ws) : null
          reps = rs.reduce((a, b) => a + b, 0)
          const rirs = done.map(rirOf).filter((x): x is number => x !== null)
          rir = rirs.length ? Math.min(...rirs) : null
        } else {
          if (s.done !== true) return
          weight = finite(s.w)
          reps = finite(s.r)
          rir = rirOf(s)
        }
        const secRaw = finite(s.sec)
        const minRaw = finite(s.min)
        const sec = secRaw !== null && secRaw > 0 ? secRaw : minRaw !== null && minRaw > 0 ? Math.round(minRaw * 60) : null
        sets.push({
          exercise_id,
          set_index: si,
          weight: weight !== null ? toKg(weight) : null,
          reps: reps !== null && reps > 0 ? reps : null,
          sec,
          rir,
          is_warmup: isWarmup(s),
        })
      })
    })

    if (!sets.length) {
      warnings.push(`${label} (${date}): sin series hechas, se omite.`)
      return
    }

    const excluded = w.excludeFromProgression === true || code === 'DL' || (entryCount > 0 && noProgCount === entryCount)
    if (noProgCount > 0 && noProgCount < entryCount && w.excludeFromProgression !== true) {
      warnings.push(`${label} (${date}): ${noProgCount} entrada(s) con noProg dentro de una sesión no excluida; se tratan como normales.`)
    }

    const end = finite(w.end)
    const duration_min = start !== null && end !== null && end > start ? Math.round((end - start) / 60000) : null

    let source_ref =
      (typeof w.id === 'string' && w.id.trim() !== '') || typeof w.id === 'number'
        ? String(w.id)
        : `h-${shortHash(`${date}|${exerciseIds.join(',')}`)}`
    if (seenRefs.has(source_ref)) {
      let n = 2
      while (seenRefs.has(`${source_ref}#${n}`)) n++
      warnings.push(`${label} (${date}): identificador repetido "${source_ref}"; se usa "${source_ref}#${n}".`)
      source_ref = `${source_ref}#${n}`
    }
    seenRefs.add(source_ref)

    sessions.push({ source_ref, date, routine_code: code, duration_min, excluded, sets })
  })

  sessions.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
  return { unit, targetW, sessions, bodyweights, warnings }
}
