import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import type { PlanExercise, Routine, RoutineCode, SessionSet } from '../domain/types'
import { ALTERNATIVES, ROUTINES, ROUTINE_BY_CODE, exName } from '../data'
import { useSessionsWithSets, useShifts } from '../db'
import {
  DELOAD_AFTER,
  DELOAD_FACTOR,
  bestE1rm,
  diffDays,
  fmtLong,
  fmtShort,
  stallCount,
  suggestLoad,
  suggestRoutine,
  todayISO,
} from '../lib'
import type { HistorySession } from '../lib'
import { Card, Collapsible, EmptyState, Icon, LineChart, cx, isoToMs, num } from '../components'
import '../styles/screens-training-diet.css'

// ───────────────────────── Datos derivados de las sesiones ─────────────────────────

/** Series de un ejercicio dentro de una sesión (ya filtradas por exercise_id). */
interface ExSession extends HistorySession {
  date: string
  excluded: boolean
  routine: RoutineCode | null
  sets: SessionSet[]
}

interface TrainingData {
  /** exercise_id → sesiones (por fecha ascendente) con series de ese ejercicio. */
  byExercise: Map<string, ExSession[]>
  /** routine_code → fecha de la última sesión. */
  lastByRoutine: Map<RoutineCode, string>
}

function useTrainingData(): TrainingData & { sessions: ReturnType<typeof useSessionsWithSets> } {
  const sessions = useSessionsWithSets()
  const data = useMemo<TrainingData>(() => {
    const byExercise = new Map<string, ExSession[]>()
    const lastByRoutine = new Map<RoutineCode, string>()
    for (const s of sessions) {
      if (s.routine_code) {
        const prev = lastByRoutine.get(s.routine_code)
        if (!prev || s.date > prev) lastByRoutine.set(s.routine_code, s.date)
      }
      const groups = new Map<string, SessionSet[]>()
      for (const set of s.sets) {
        const g = groups.get(set.exercise_id)
        if (g) g.push(set)
        else groups.set(set.exercise_id, [set])
      }
      for (const [id, sets] of groups) {
        const list = byExercise.get(id) ?? []
        list.push({ date: s.date, excluded: s.excluded, routine: s.routine_code, sets })
        byExercise.set(id, list)
      }
    }
    return { byExercise, lastByRoutine }
  }, [sessions])
  return { ...data, sessions }
}

// ───────────────────────── Formato ─────────────────────────

const kg = (w: number): string => String(Math.round(w * 100) / 100).replace('.', ',')

/** "5", "8-12", "30 s", "10 min" */
function schemeOf(ex: PlanExercise): string {
  if (ex.mode === 'cardio') return `${ex.min ?? 10} min`
  if (ex.mode === 'time') return `${ex.sec ?? 30} s`
  const top = ex.reps ?? ex.repsMin ?? 0
  return ex.repsMin && ex.repsMin !== top ? `${ex.repsMin}-${top}` : String(top)
}

function ago(date: string, today: string): string {
  const d = diffDays(date, today)
  if (d <= 0) return 'hoy'
  if (d === 1) return 'ayer'
  return `hace ${d} días`
}

const KNEE_LABEL: Record<Routine['kneeLoad'], string> = { high: 'Rodilla: carga alta', low: 'Rodilla: carga baja', none: 'Rodilla: sin carga' }
const KNEE_ICON = { high: 'warn', low: 'ok', none: 'ok' } as const
const KNEE_SHORT: Record<Routine['kneeLoad'], string> = { high: 'rodilla alta', low: 'rodilla baja', none: 'sin rodilla' }

/** Letra de la ficha de la rutina: A, B, C; las de casa como C1 y C2 (en el plan son H1 y H2). */
function tileOf(code: RoutineCode): string {
  return code === 'H1' ? 'C1' : code === 'H2' ? 'C2' : code
}

const PLACE_LABEL: Record<Routine['place'], string> = { gym: 'Gimnasio', home: 'Casa', any: 'Donde quieras' }

function minutes(r: Routine) {
  return `${r.estMinutes[0]}-${r.estMinutes[1]} min`
}

/** Resumen corto de la rutina a partir de sus ejercicios con nombre propio (sin cardio ni isométrico). */
function focusOf(r: Routine): string {
  const names = r.exercises
    .filter((e) => e.mode === 'reps')
    .slice(0, 3)
    .map((e) => exName(e.id))
  if (names.length === 0) return r.exercises.map((e) => exName(e.id)).slice(0, 3).join(', ')
  return names.join(', ')
}

function KneePill({ load }: { load: Routine['kneeLoad'] }) {
  return (
    <span className={cx('pill', `pill--${load === 'high' ? 'warn' : 'ok'}`)}>
      <Icon name={KNEE_ICON[load]} size={14} />
      {KNEE_LABEL[load]}
    </span>
  )
}

// ───────────────────────── Lista de rutinas ─────────────────────────

/** Lista de rutinas: /entreno */
export function Training() {
  const { lastByRoutine, sessions } = useTrainingData()
  const shifts = useShifts()
  const today = todayISO()

  const suggested = useMemo(
    () =>
      suggestRoutine({
        sessions: sessions.map((s) => ({ date: s.date, routine_code: s.routine_code })),
        shifts: shifts.map((s) => s.date),
        today,
      }),
    [sessions, shifts, today],
  )

  return (
    <div className="stack">
      <p className="muted">
        Rotación A → B → C. A y C cargan la rodilla: no van en días seguidos. Casa y cardio, cuando no puedas ir.
      </p>
      <ul className="routine-list">
        {ROUTINES.map((r) => {
          const last = lastByRoutine.get(r.code)
          const isToday = r.code === suggested.code
          return (
            <li key={r.code}>
              <Link to={`/entreno/${r.code}`} className={cx('routine', isToday && 'routine--today')}>
                <span className="routine__code display" aria-hidden="true">
                  {tileOf(r.code)}
                </span>
                <span className="routine__body">
                  <span className="routine__name">{r.name.replace(/^[ABC] · /, '')}</span>
                  <span className="routine__focus muted small">{focusOf(r)}</span>
                  <span className="routine__meta">
                    {isToday && <b>Hoy · </b>}
                    {minutes(r)} ·{' '}
                    <span className={r.kneeLoad === 'high' ? 'is-warn' : undefined}>{KNEE_SHORT[r.kneeLoad]}</span>
                    {' · '}
                    {last ? ago(last, today) : 'sin registrar'}
                  </span>
                </span>
                <Icon name="flecha" size={20} className="routine__go" />
              </Link>
            </li>
          )
        })}
      </ul>
      <p className="muted small">{suggested.reason}.</p>
    </div>
  )
}

// ───────────────────────── Detalle de un ejercicio ─────────────────────────

function SetChips({ sets }: { sets: SessionSet[] }) {
  return (
    <ul className="td-sets">
      {sets.map((s, i) => (
        <li key={s.id ?? i} className={cx('td-set', s.is_warmup && 'td-set--warm')}>
          {s.weight ? <b>{kg(s.weight)}</b> : null}
          {s.weight ? '×' : ''}
          {s.reps ?? 0}
          {s.is_warmup && <small> cal.</small>}
        </li>
      ))}
    </ul>
  )
}

function Alternatives({ id }: { id: string }) {
  const alts = ALTERNATIVES[id] ?? []
  if (alts.length === 0) return null
  return (
    <Collapsible title="Alternativas" meta={`${alts.length}`} className="coll--inline">
      <ul className="alts">
        {alts.map((a) => {
          const note = a.note.trim()
          const showNote = note && note.toLowerCase() !== a.nameEs.toLowerCase()
          return (
            <li key={a.id}>
              <b>{a.nameEs}</b>
              {showNote && <span className="muted"> · {note.charAt(0).toUpperCase() + note.slice(1)}</span>}
            </li>
          )
        })}
      </ul>
    </Collapsible>
  )
}

function LoadBlock({ ex, history, isDeloadRoutine }: { ex: PlanExercise; history: ExSession[]; isDeloadRoutine: boolean }) {
  const sug = suggestLoad(ex, history)
  const stalls = stallCount(ex, history)
  const counted = history.filter((h) => !h.excluded)
  const last = history[history.length - 1]
  const lastCounted = counted[counted.length - 1]

  const e1rmPts = counted
    .map((h) => ({ t: isoToMs(h.date), y: bestE1rm(h.sets) }))
    .filter((p) => p.y > 0)
  const e1rmNow = e1rmPts.length ? e1rmPts[e1rmPts.length - 1].y : 0
  const e1rmBest = e1rmPts.reduce((m, p) => Math.max(m, p.y), 0)

  const tracked = ex.mode === 'reps' && (ex.prog === 'linear' || ex.prog === 'double')

  // En deload no se progresa: carga orientativa = 90 % de la última carga de trabajo.
  let deloadLoad: number | null = null
  if (isDeloadRoutine && lastCounted) {
    const top = Math.max(0, ...lastCounted.sets.filter((s) => !s.is_warmup).map((s) => s.weight ?? 0))
    if (top > 0) deloadLoad = Math.round((top * DELOAD_FACTOR) / 2.5) * 2.5
  }

  const nextBig =
    sug.weight != null
      ? `${kg(sug.weight)} kg × ${sug.reps}`
      : sug.kind === 'first'
        ? `Elige peso × ${sug.reps}`
        : `${sug.reps} repeticiones`

  return (
    <>
      {tracked && !isDeloadRoutine && (
        <div className="ex__next td-next">
          <Icon name="flecha" size={16} />
          <div className="grow">
            <span className="eyebrow">Próxima carga</span>
            <p className="display td-next__big">{nextBig}</p>
            <p className="muted small">{sug.text}</p>
          </div>
        </div>
      )}

      {tracked && !isDeloadRoutine && stalls >= DELOAD_AFTER - 1 && (
        <p className="td-stall">
          <Icon name="warn" size={16} />
          {stalls >= DELOAD_AFTER
            ? `${stalls} sesiones sin progresar: toca deload.`
            : `${stalls} sesiones sin progresar: a 1 sesión del deload.`}
        </p>
      )}

      {isDeloadRoutine && deloadLoad != null && (
        <p className="ex__next td-next">
          <Icon name="flecha" size={16} />
          <span>
            <span className="eyebrow">Carga de deload</span> Unos {kg(deloadLoad)} kg (−10 % de tu última carga de trabajo) y RIR 4.
          </span>
        </p>
      )}

      {e1rmNow > 0 && (
        <div className="td-e1rm">
          <p className="td-e1rm__row">
            <span className="eyebrow">1RM estimado</span>
            <span className="display td-e1rm__num">
              {num(e1rmNow, 1)}
              <span> kg</span>
            </span>
            {e1rmBest > e1rmNow + 0.05 && <span className="muted small">mejor {num(e1rmBest, 1)} kg</span>}
          </p>
          {e1rmPts.length >= 2 && (
            <LineChart
              series={[{ name: '1RM estimado', kind: 'line', color: 'var(--s1)', label: true, pts: e1rmPts }]}
              dec={1}
              unit=" kg"
              height={130}
              empty="Sin datos"
              aria={`Evolución del 1RM estimado de ${exName(ex.id)}`}
              tableDateLabel="Sesión"
              className="td-e1rm__chart"
            />
          )}
        </div>
      )}

      {last && (
        <div className="td-last-session">
          <p className="eyebrow">
            Última sesión · {fmtShort(last.date)}
            {last.excluded && ' · deload'}
          </p>
          <SetChips sets={last.sets} />
        </div>
      )}
      {!last && ex.mode === 'reps' && <p className="muted small td-none">Sin historial todavía.</p>}
    </>
  )
}

function TimedBlock({ ex, history }: { ex: PlanExercise; history: ExSession[] }) {
  const last = history[history.length - 1]
  if (!last) return <p className="muted small td-none">Sin historial todavía.</p>
  const secs = last.sets.map((s) => s.sec ?? 0).filter((s) => s > 0)
  if (secs.length === 0) return <p className="muted small td-none">Sin historial todavía.</p>

  if (ex.mode === 'cardio') {
    const total = secs.reduce((a, b) => a + b, 0)
    return (
      <div className="td-last-session">
        <p className="eyebrow">Última vez · {fmtShort(last.date)}</p>
        <p className="td-timed">
          <b className="display">{num(Math.round(total / 60))} min</b>
        </p>
      </div>
    )
  }
  return (
    <div className="td-last-session">
      <p className="eyebrow">Última vez · {fmtShort(last.date)}</p>
      <ul className="td-sets">
        {secs.map((s, i) => (
          <li key={i} className="td-set">
            <b>{s}</b> s
          </li>
        ))}
      </ul>
    </div>
  )
}

// ───────────────────────── Detalle de una rutina ─────────────────────────

/** Detalle de una rutina: /entreno/:code */
export function RoutineDetail() {
  const { code = '' } = useParams()
  const { byExercise, lastByRoutine } = useTrainingData()
  const routine = ROUTINE_BY_CODE[code.toUpperCase() as RoutineCode]
  if (!routine) return <Navigate to="/entreno" replace />
  const today = todayISO()
  const last = lastByRoutine.get(routine.code)
  const isDeload = routine.excludeFromProgression === true

  return (
    <div className="stack">
      <Card>
        <div className="detail__head">
          <span className="detail__code display" aria-hidden="true">
            {tileOf(routine.code)}
          </span>
          <div className="grow">
            <h2 className="detail__name">{routine.name.replace(/^[ABC] · /, '')}</h2>
            <p className="muted small">{focusOf(routine)}</p>
          </div>
        </div>
        <div className="routine__meta">
          <span className="pill">
            <Icon name="reloj" size={14} />
            {minutes(routine)}
          </span>
          <span className="pill">{PLACE_LABEL[routine.place]}</span>
          <KneePill load={routine.kneeLoad} />
        </div>
        <p className="td-last small">
          <Icon name="check" size={14} />
          {last ? (
            <span>
              Última vez: <b>{fmtLong(last)}</b> <span className="muted">({ago(last, today)})</span>
            </span>
          ) : (
            <span className="muted">Aún sin registrar</span>
          )}
        </p>
      </Card>

      {routine.exercises.length === 0 ? (
        <EmptyState icon="entreno" title="Sin ejercicios todavía">
          Esta rutina se cargará desde el plan.
        </EmptyState>
      ) : (
        <ol className="ex-list">
          {routine.exercises.map((ex, i) => {
            const history = byExercise.get(ex.id) ?? []
            const timed = ex.mode !== 'reps'
            return (
              <li key={`${ex.id}-${i}`} className="ex">
                <div className="ex__top">
                  <span className="ex__n display" aria-hidden="true">
                    {i + 1}
                  </span>
                  <div className="grow">
                    <h3 className="ex__name">{exName(ex.id)}</h3>
                    <p className="ex__scheme">
                      <b className="display">
                        {ex.sets} × {schemeOf(ex)}
                      </b>
                      {ex.rest && <span className="muted"> · descanso {ex.rest}</span>}
                    </p>
                  </div>
                </div>
                {ex.cue && <p className="ex__cue">{ex.cue}</p>}
                {timed ? (
                  <TimedBlock ex={ex} history={history} />
                ) : (
                  <LoadBlock ex={ex} history={history} isDeloadRoutine={isDeload} />
                )}
                <Alternatives id={ex.id} />
              </li>
            )
          })}
        </ol>
      )}
      <p className="muted small">
        Las series y las cargas se registran en OpenGym. Importa su copia desde Ajustes para ver aquí tu progreso.
      </p>
    </div>
  )
}
