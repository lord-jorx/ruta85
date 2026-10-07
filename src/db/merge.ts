/**
 * Fusión "último cambio gana" (LWW) de filas entrantes (de Supabase o de un archivo de
 * copia) con las locales, incluida la resolución de colisiones de claves naturales
 * (misma fecha de pesada, misma guardia, mismo source_ref, mismo file_hash, ajustes únicos)
 * entre filas con distinto id creadas en dispositivos distintos.
 */
import type { SyncMeta, TableName } from '../domain/types'
import { db, enqueue, purgeOutbox, stampAfter } from './local'
import type { AnyRow } from './types'

const timeOf = (r: SyncMeta): number => {
  const t = Date.parse(r.updated_at)
  return Number.isFinite(t) ? t : 0
}

/** Serialización estable (sin campos de servidor) para desempatar de forma determinista. */
function canonical(r: object): string {
  const src = r as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of Object.keys(src).sort()) {
    if (k !== 'user_id' && k !== 'synced_at') out[k] = src[k]
  }
  return JSON.stringify(out)
}

/**
 * Devuelve la versión ganadora: la de `updated_at` más reciente. Con empate gana el borrado
 * y, si no, la de serialización mayor (determinista: ambos dispositivos eligen la misma).
 * Devuelve el MISMO objeto `local` si gana (o empata sin diferencias), para detectar cambios por identidad.
 */
export function mergeLww<T extends SyncMeta>(
  local: T | null | undefined,
  remote: T | null | undefined,
): T | undefined {
  if (!local) return remote ?? undefined
  if (!remote) return local
  const a = timeOf(local)
  const b = timeOf(remote)
  if (a !== b) return b > a ? remote : local
  if (local.deleted !== remote.deleted) return local.deleted ? local : remote
  return canonical(remote) > canonical(local) ? remote : local
}

export type IncomingSource = 'remote' | 'file'

export interface ApplyResult {
  /** Filas escritas en la base local. */
  applied: number
  /** ids entrantes descartados por colisión de clave natural (las filas dependientes deben ignorarse). */
  rejected: string[]
}

/** Tablas donde la unicidad en Supabase no ignora los borrados (índice único total). */
const STRICT: ReadonlySet<TableName> = new Set<TableName>(['settings', 'imports'])

async function siblingsOf(name: TableName, r: AnyRow): Promise<AnyRow[]> {
  const t = db.table(name)
  let list: AnyRow[] = []
  switch (name) {
    case 'settings':
      list = await t.toArray()
      break
    case 'imports':
      list = await t.where('file_hash').equals(String(r.file_hash)).toArray()
      break
    case 'body_logs':
    case 'shifts':
      list = await t.where('date').equals(String(r.date)).toArray()
      break
    case 'sessions':
      if (typeof r.source_ref === 'string') list = await t.where('source_ref').equals(r.source_ref).toArray()
      break
    default:
      break
  }
  const strict = STRICT.has(name)
  return list.filter((x) => x.id !== r.id && (strict || !x.deleted))
}

function newest(rows: AnyRow[]): AnyRow {
  return rows.reduce((best, x) => mergeLww(best, x) ?? best)
}

async function tombstoneSets(sessionId: string): Promise<void> {
  const sets = await db.session_sets
    .where('session_id')
    .equals(sessionId)
    .filter((s) => !s.deleted)
    .toArray()
  if (sets.length === 0) return
  await db.session_sets.bulkPut(sets.map((s) => ({ ...s, deleted: true, updated_at: stampAfter(s) })))
  await enqueue('session_sets', sets.map((s) => s.id))
}

/**
 * Aplica filas entrantes a la base local con LWW.
 *  - source 'remote': lo ganado NO se encola (ya está en el servidor); solo se encolan las
 *    correcciones nuevas (tombstones/adopciones por colisión).
 *  - source 'file': todo lo aplicado se encola para subirlo.
 */
export async function applyIncoming(
  name: TableName,
  incoming: AnyRow[],
  source: IncomingSource,
): Promise<ApplyResult> {
  const names = [...new Set<string>([name, 'session_sets', 'outbox'])]
  return db.transaction('rw', names, async () => {
    const t = db.table(name)
    const strict = STRICT.has(name)
    const fromFile = source === 'file'
    const result: ApplyResult = { applied: 0, rejected: [] }

    for (const r of incoming) {
      const local: AnyRow | undefined = await t.get(r.id)

      // 1) Misma fila (mismo id): LWW directo.
      if (local) {
        const winner = mergeLww(local, r)
        if (winner && winner !== local) {
          await t.put(winner)
          if (fromFile) await enqueue(name, r.id)
          result.applied++
        }
        continue
      }

      // 2) Fila nueva: ¿colisiona con otra de distinto id por clave natural?
      const sibs = strict || !r.deleted ? await siblingsOf(name, r) : []
      if (sibs.length === 0) {
        await t.put(r)
        if (fromFile) await enqueue(name, r.id)
        result.applied++
        continue
      }
      const best = newest(sibs)
      const rWins = mergeLww(best, r) === r

      if (fromFile) {
        // Archivo de copia: se conserva siempre el id local (puede existir ya en el servidor).
        if (rWins && name !== 'sessions') {
          await t.put({ ...r, id: best.id, user_id: best.user_id })
          await enqueue(name, best.id)
          result.applied++
        } else {
          result.rejected.push(r.id)
        }
        continue
      }

      if (strict) {
        // La fila remota ya ocupa el hueco único del servidor: sustituimos la local.
        const sibIds = sibs.map((s) => s.id)
        await t.bulkDelete(sibIds)
        await purgeOutbox(name, sibIds)
        if (rWins) {
          await t.put(r)
        } else {
          // Gana el contenido local, pero con el id remoto para no violar el índice único.
          await t.put({ ...best, id: r.id, user_id: r.user_id })
          await enqueue(name, r.id)
        }
        result.applied++
      } else if (rWins) {
        // Gana la remota: la local de esa clave natural pasa a tombstone.
        for (const s of sibs) {
          await t.put({ ...s, deleted: true, updated_at: stampAfter(s) })
          await enqueue(name, s.id)
          if (name === 'sessions') await tombstoneSets(s.id)
        }
        await t.put(r)
        result.applied++
      } else {
        // Gana la local: la remota se guarda ya como tombstone y se sube.
        await t.put({ ...r, deleted: true, updated_at: stampAfter(r) })
        await enqueue(name, r.id)
        result.applied++
      }
    }
    return result
  })
}
