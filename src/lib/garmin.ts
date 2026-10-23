import type { ActivityKind, ISODate } from '../domain/types'
import { isISODate } from './dates'

/** Todas las notas importadas desde Garmin empiezan así (se usa para detectar repetidas). */
export const GARMIN_NOTE_PREFIX = 'Garmin · '

/** Longitud máxima de la nota guardada. */
const MAX_NOTE = 120

export interface GarminActivity {
  date: ISODate
  kind: ActivityKind
  minutes: number
  note: string
}

export interface GarminParseResult {
  activities: GarminActivity[]
  /** Filas descartadas: fuerza, sin fecha válida o sin duración válida. */
  skipped: number
  warnings: string[]
}

// ───────────────────────── CSV ─────────────────────────

/** Separador de la cabecera: `;` si hay más punto y coma que comas fuera de comillas; si no, `,`. */
function detectDelimiter(text: string): ',' | ';' {
  let commas = 0
  let semis = 0
  let inQuotes = false
  for (const ch of text) {
    if (ch === '"') inQuotes = !inQuotes
    else if (!inQuotes) {
      if (ch === '\n' || ch === '\r') break
      if (ch === ',') commas++
      else if (ch === ';') semis++
    }
  }
  return semis > commas ? ';' : ','
}

/** Parser CSV (RFC 4180 + tolerancia): comillas, `""` escapado, saltos de línea en campos, CRLF/LF/CR. */
function parseCsv(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let fieldStarted = false // distingue "campo vacío" de "fin de archivo"

  const endField = () => {
    row.push(field)
    field = ''
    fieldStarted = false
  }
  const endRow = () => {
    endField()
    rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"' && field === '') {
      inQuotes = true
      fieldStarted = true
    } else if (ch === delimiter) {
      endField()
      fieldStarted = true
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++
      endRow()
    } else {
      field += ch
      fieldStarted = true
    }
  }
  if (fieldStarted || field !== '' || row.length > 0) endRow()
  return rows
}

// ───────────────────────── Normalización ─────────────────────────

/** Minúsculas, sin tildes y con espacios colapsados. */
function norm(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

const COLUMN_NAMES = {
  type: ['activity type', 'tipo de actividad', 'tipo'],
  date: ['date', 'fecha'],
  title: ['title', 'titulo'],
  time: ['time', 'tiempo'],
  elapsed: ['elapsed time', 'tiempo transcurrido'],
  distance: ['distance', 'distancia'],
} as const

type ColumnKey = keyof typeof COLUMN_NAMES

function findColumns(header: string[]): Partial<Record<ColumnKey, number>> {
  const names = header.map(norm)
  const out: Partial<Record<ColumnKey, number>> = {}
  for (const key of Object.keys(COLUMN_NAMES) as ColumnKey[]) {
    const idx = names.findIndex((n) => (COLUMN_NAMES[key] as readonly string[]).includes(n))
    if (idx >= 0) out[key] = idx
  }
  return out
}

/** `'skip'` = fuerza (el gimnasio viene de OpenGym). */
function classify(rawType: string): ActivityKind | 'skip' {
  const t = norm(rawType)
  if (/fuerza|strength|\bpesas\b|weight training/.test(t)) return 'skip'
  if (/eliptic|ellipt/.test(t)) return 'elliptical'
  if (/cycl|ciclis|\bbik|\bbici|spinning/.test(t)) return 'bike'
  if (/\brun|\bcorr|carrera|treadmill|\bcinta\b/.test(t)) return 'run'
  if (/\bwalk|camin|senderis|\bhik/.test(t)) return 'walk'
  return 'other'
}

// ───────────────────────── Campos ─────────────────────────

/** `YYYY-MM-DD[ HH:MM[:SS]]` o `DD/MM/YYYY[ HH:MM]` (también con `-` o `.`). Se conserva la fecha tal cual. */
function parseDate(raw: string): ISODate | null {
  const s = raw.trim()
  const iso = /^(\d{4})-(\d{2})-(\d{2})(?!\d)/.exec(s)
  if (iso) {
    const d = `${iso[1]}-${iso[2]}-${iso[3]}`
    return isISODate(d) ? d : null
  }
  const es = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?!\d)/.exec(s)
  if (es) {
    const d = `${es[3]}-${es[2].padStart(2, '0')}-${es[1].padStart(2, '0')}`
    return isISODate(d) ? d : null
  }
  return null
}

/** `HH:MM:SS`, `MM:SS` o `SS`, con decimales opcionales en los segundos → minutos redondeados (mín. 1). */
function parseMinutes(raw: string): number | null {
  const s = raw.trim().replace(',', '.')
  if (!/^\d+(:\d+){0,2}(\.\d+)?$/.test(s)) return null
  const parts = s.split(':').map(Number)
  let seconds = 0
  for (const p of parts) seconds = seconds * 60 + p
  if (!Number.isFinite(seconds) || seconds <= 0) return null
  return Math.max(1, Math.round(seconds / 60))
}

/** Distancia en km con coma decimal ("4,2"), o null si no hay un valor útil. */
function formatDistance(raw: string): string | null {
  let s = raw.trim()
  if (!/^[\d.,]+$/.test(s)) return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma >= 0 && lastDot >= 0) {
    // Se toma como decimal el último separador; el otro es de millares.
    const dec = Math.max(lastComma, lastDot)
    s = s.slice(0, dec).replace(/[.,]/g, '') + '.' + s.slice(dec + 1)
  } else {
    s = s.replace(',', '.')
  }
  const km = Number(s)
  if (!Number.isFinite(km) || km <= 0) return null
  return (Math.round(km * 10) / 10).toString().replace('.', ',')
}

function buildNote(title: string, distance: string | null): string {
  const suffix = distance ? ` · ${distance} km` : ''
  const room = MAX_NOTE - GARMIN_NOTE_PREFIX.length - suffix.length
  const t = title.replace(/\s+/g, ' ').trim()
  const shown = t.length > room ? `${t.slice(0, Math.max(0, room - 1)).trimEnd()}…` : t
  return `${GARMIN_NOTE_PREFIX}${shown}${suffix}`
}

// ───────────────────────── API ─────────────────────────

/**
 * Convierte el CSV de «Exportar CSV» de Garmin Connect (cabeceras en inglés o español, separador `,` o `;`)
 * en actividades de la app. Omite fuerza y filas sin fecha o duración válidas (cuentan en `skipped`).
 * Lanza un Error si el archivo no parece un CSV de Garmin (faltan las columnas de fecha o de tiempo).
 */
export function parseGarminCsv(text: string): GarminParseResult {
  const clean = text.replace(/^﻿/, '')
  const rows = parseCsv(clean, detectDelimiter(clean))
  const headerIdx = rows.findIndex((r) => r.some((c) => c.trim() !== ''))
  if (headerIdx < 0) throw new Error('El archivo está vacío.')

  const cols = findColumns(rows[headerIdx])
  if (cols.date === undefined || (cols.time === undefined && cols.elapsed === undefined)) {
    throw new Error('No parece un CSV de Garmin Connect: faltan las columnas de fecha y tiempo.')
  }

  const activities: GarminActivity[] = []
  const warnings: string[] = []
  let skipped = 0

  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.every((c) => c.trim() === '')) continue
    const cell = (k: ColumnKey): string => {
      const idx = cols[k]
      return idx === undefined ? '' : (row[idx] ?? '').trim()
    }
    const line = i + 1

    const rawType = cell('type')
    const kind = classify(rawType)
    if (kind === 'skip') {
      skipped++
      continue
    }

    const date = parseDate(cell('date'))
    if (!date) {
      skipped++
      warnings.push(`Fila ${line}: fecha no válida («${cell('date')}»).`)
      continue
    }

    const minutes = parseMinutes(cell('time')) ?? parseMinutes(cell('elapsed'))
    if (minutes === null) {
      skipped++
      warnings.push(`Fila ${line}: duración no válida («${cell('time') || cell('elapsed')}»).`)
      continue
    }

    activities.push({
      date,
      kind,
      minutes,
      note: buildNote(cell('title') || rawType || 'Actividad', formatDistance(cell('distance'))),
    })
  }

  return { activities, skipped, warnings }
}
