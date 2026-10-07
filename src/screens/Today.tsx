import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  ButtonLink,
  Card,
  EmptyState,
  Icon,
  NumberField,
  ScaleField,
  Sheet,
  WeekTrack,
  isoToMs,
  fmtDateLong,
  num,
  useToast,
} from '../components'
import {
  MAINTENANCE,
  MILESTONES,
  TOTAL_WEEKS,
  addDays,
  fmtShort,
  maintenanceForWeek,
  phaseForWeek,
  suggestRoutine,
  todayISO,
  weekNumber,
  diffDays,
} from '../lib'
import {
  addActivity,
  deleteActivity,
  toggleShift,
  upsertBodyLog,
  useActivities,
  useBodyLogs,
  useFoodLogs,
  useSessionsWithSets,
  useSettings,
  useShifts,
} from '../db'
import { EXERCISES, ROUTINE_BY_CODE, exName } from '../data'
import '../styles/screens-today-body-settings.css'

const WALK_PRESETS = [20, 30, 45, 60]
const KNEE_LABEL = { high: 'alta', low: 'baja', none: 'ninguna' } as const

const MILESTONE_MARKS = MILESTONES.map((m) => ({ week: m.week, label: `Revisión de hito · ${fmtShort(m.date)}` }))

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Error desconocido'
}

export function Today() {
  const toast = useToast()
  const settings = useSettings()
  const sessions = useSessionsWithSets()
  const shifts = useShifts()
  const bodyLogs = useBodyLogs()

  const today = todayISO()
  const yesterday = addDays(today, -1)
  const activities = useActivities({ from: today, to: today })
  const foodToday = useFoodLogs(today)

  const [sheet, setSheet] = useState<'weight' | 'walk' | null>(null)
  const [weightDraft, setWeightDraft] = useState<number | null>(null)
  const [waistDraft, setWaistDraft] = useState<number | null>(null)
  const [walkDraft, setWalkDraft] = useState<number | null>(30)
  const [busy, setBusy] = useState(false)

  // ── Plan ──
  const startDate = settings.start_date
  const goalDate = settings.goal_date
  const currentWeek = weekNumber(startDate, today)
  const daysLeft = Math.max(0, diffDays(today, goalDate))
  const weeksLeft = Math.ceil(daysLeft / 7)
  const phase = phaseForWeek(currentWeek)
  const maint = maintenanceForWeek(currentWeek)
  const pct = Math.max(0, Math.min(100, Math.round(((currentWeek - 1) / TOTAL_WEEKS) * 100)))
  const notStarted = currentWeek < 1

  // ── Rutina sugerida ──
  const shiftDates = shifts.map((s) => s.date)
  const onShiftToday = shiftDates.includes(today)
  const onShiftYesterday = shiftDates.includes(yesterday)
  const suggestion = suggestRoutine({ sessions, shifts: shiftDates, today })
  const routine = ROUTINE_BY_CODE[suggestion.code]
  const trainedToday = sessions.some((s) => s.date === today && s.routine_code !== null)

  const lastSession = sessions.length > 0 ? sessions[sessions.length - 1] : null
  const lastRoutine = lastSession?.routine_code ? ROUTINE_BY_CODE[lastSession.routine_code] : null
  const lastExercises = lastSession
    ? [...new Set(lastSession.sets.filter((s) => !s.is_warmup).map((s) => s.exercise_id))]
    : []
  const lastWorkSets = lastSession ? lastSession.sets.filter((s) => !s.is_warmup).length : 0

  // ── Registro de hoy ──
  const todayLog = bodyLogs.find((b) => b.date === today)
  const weighed = todayLog?.weight != null
  const waistToday = todayLog?.waist != null
  const knee = todayLog?.knee_pain ?? null
  const lastWaistLog = [...bodyLogs].reverse().find((b) => b.waist != null)
  const walkMin = activities.filter((a) => a.kind === 'walk').reduce((s, a) => s + a.minutes, 0)
  const lastWalk = [...activities].reverse().find((a) => a.kind === 'walk')
  const proteinG = Math.round(foodToday.reduce((s, f) => s + f.protein_g, 0))
  const proteinMin = settings.protein_min
  const proteinOk = proteinG >= proteinMin

  async function run(fn: () => Promise<void>) {
    if (busy) return
    setBusy(true)
    try {
      await fn()
    } catch (e) {
      toast.show(errMsg(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  function openWeight() {
    setWeightDraft(todayLog?.weight ?? null)
    setWaistDraft(todayLog?.waist ?? null)
    setSheet('weight')
  }

  function saveWeight() {
    if (weightDraft == null && waistDraft == null) return
    void run(async () => {
      await upsertBodyLog(today, {
        ...(weightDraft != null ? { weight: weightDraft } : {}),
        ...(waistDraft != null ? { waist: waistDraft } : {}),
      })
      setSheet(null)
      toast.show(
        [weightDraft != null && `Peso ${num(weightDraft, 1)} kg`, waistDraft != null && `cintura ${num(waistDraft, 1)} cm`]
          .filter(Boolean)
          .join(' · ') + ' guardado',
        'ok',
      )
    })
  }

  function saveWalk() {
    if (!walkDraft || walkDraft <= 0) return
    void run(async () => {
      await addActivity({ date: today, kind: 'walk', minutes: walkDraft })
      setSheet(null)
      toast.show(`Caminar: +${walkDraft} min`, 'ok')
    })
  }

  function undoWalk() {
    if (!lastWalk) return
    void run(async () => {
      await deleteActivity(lastWalk.id)
      toast.show(`Quitados ${lastWalk.minutes} min`)
    })
  }

  function setKnee(v: number) {
    void run(async () => {
      await upsertBodyLog(today, { knee_pain: v })
      toast.show(`Rodilla ${v}/10 anotada`, v > 3 ? 'error' : 'ok')
    })
  }

  function flipShift(date: string, label: string) {
    void run(async () => {
      const on = await toggleShift(date)
      toast.show(on ? `Guardia marcada (${label})` : `Guardia desmarcada (${label})`)
    })
  }

  return (
    <div className="stack">
      {settings.id === 'settings-default' && (
        <div className="notice notice--warn" role="note">
          <p>
            Estás viendo valores de ejemplo. Pon tu altura, peso objetivo y fechas en{' '}
            <Link to="/ajustes">Ajustes</Link>: se guardan en tu base de datos, no en la app.
          </p>
        </div>
      )}
      <Card tone="board" className="hero" aria-label="Cuenta atrás">
        <div className="hero__top">
          <div>
            <p className="eyebrow">Faltan</p>
            <p className="hero__count display">
              {weeksLeft}
              <span>semanas</span>
            </p>
            <p className="hero__date">hasta el {fmtDateLong(isoToMs(goalDate))}</p>
          </div>
          <div className="hero__week">
            <p className="eyebrow">Semana</p>
            <p className="hero__wk display">
              {Math.max(1, Math.min(TOTAL_WEEKS, currentWeek))}
              <span>/{TOTAL_WEEKS}</span>
            </p>
          </div>
        </div>
        <div
          className="meter"
          role="progressbar"
          aria-label="Avance del plan"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
        >
          <div className="meter__fill" style={{ width: `${pct}%` }} />
        </div>
        {notStarted && (
          <p className="hero__phase">
            <b>El plan empieza el {fmtDateLong(isoToMs(startDate))}</b>
          </p>
        )}
        {phase && (
          <p className="hero__phase">
            <b>
              Fase {phase.key.slice(1)} · {phase.name}
            </b>
            <span className="muted"> · {phase.summary}</span>
          </p>
        )}
      </Card>

      {maint && (
        <div className="notice notice--ok" role="note">
          <Icon name="llama" size={22} />
          <p>
            <b>Semana de mantenimiento ({maint.label}).</b> Come a mantenimiento y entrena igual.
          </p>
        </div>
      )}

      <Card tone="accent" label={trainedToday ? 'Hoy ya has entrenado' : 'Hoy toca'} className="todays">
        <div className="todays__main">
          <span className="todays__code display" aria-hidden="true">
            {suggestion.code}
          </span>
          <div className="grow">
            <h3 className="todays__name">{routine.name}</h3>
            <p className="muted small">
              {routine.estMinutes[0]}-{routine.estMinutes[1]} min · carga de rodilla {KNEE_LABEL[routine.kneeLoad]}
            </p>
          </div>
        </div>
        <p className="todays__reason">{suggestion.reason}</p>
        {suggestion.restAdvised && (
          <p className="notice notice--warn">
            <Icon name="warn" size={20} />
            {onShiftToday
              ? 'Hoy tienes guardia: mejor descansar o hacer solo Casa 2.'
              : 'Sales de guardia: mejor descansar o hacer solo Casa 2.'}
          </p>
        )}
        <ButtonLink to={`/entreno/${suggestion.code}`} variant="primary" block icon="flecha">
          Ver rutina {suggestion.code}
        </ButtonLink>
        <div className="tbs-shifts" role="group" aria-label="Guardias">
          <Button
            icon="guardia"
            aria-pressed={onShiftToday}
            disabled={busy}
            onClick={() => flipShift(today, 'hoy')}
          >
            {onShiftToday ? 'Guardia hoy: quitar' : 'Guardia hoy'}
          </Button>
          <Button
            icon="guardia"
            aria-pressed={onShiftYesterday}
            disabled={busy}
            onClick={() => flipShift(yesterday, 'ayer')}
          >
            {onShiftYesterday ? 'Guardia ayer: quitar' : 'Guardia ayer'}
          </Button>
        </div>
      </Card>

      <Card label="Última sesión">
        {lastSession ? (
          <div className="tbs-last">
            <div className="tbs-last__head">
              <span className="tbs-last__code display" aria-hidden="true">
                {lastSession.routine_code ?? '·'}
              </span>
              <div className="grow">
                <p className="tbs-last__name">
                  <b>{lastRoutine?.name ?? 'Sesión sin rutina asignada'}</b>
                </p>
                <p className="muted small">
                  {lastSession.date === today ? 'Hoy' : lastSession.date === yesterday ? 'Ayer' : fmtDateLong(isoToMs(lastSession.date))}
                  {' · '}
                  {lastWorkSets} {lastWorkSets === 1 ? 'serie' : 'series'}
                  {lastSession.duration_min ? ` · ${num(lastSession.duration_min)} min` : ''}
                  {lastSession.source === 'opengym' ? ' · OpenGym' : ''}
                </p>
              </div>
            </div>
            {lastExercises.length > 0 && (
              <ul className="tbs-last__list">
                {lastExercises.slice(0, 6).map((id) => (
                  <li key={id}>{EXERCISES[id] ? exName(id) : `Ejercicio ${id}`}</li>
                ))}
                {lastExercises.length > 6 && <li className="muted">+{lastExercises.length - 6} más</li>}
              </ul>
            )}
          </div>
        ) : (
          <EmptyState icon="entreno" title="Aún no hay sesiones registradas">
            Importa tu copia de OpenGym en Ajustes y aquí aparecerá tu última sesión.
          </EmptyState>
        )}
      </Card>

      <div className="quick" role="group" aria-label="Accesos rápidos">
        <Button className="btn--tile" icon="peso" onClick={openWeight}>
          + Peso
        </Button>
        <Button className="btn--tile" icon="ruta" onClick={() => setSheet('walk')}>
          + Caminar
        </Button>
      </div>

      <Card label="Checklist de hoy">
        <ul className="check-list">
          <li>
            <label className="check">
              <input type="checkbox" checked={weighed} onChange={openWeight} />
              <span className="check__box">
                <Icon name="check" size={18} strokeWidth={3} />
              </span>
              <span className="check__text">
                <b>Pesarte</b>
                <small>{weighed ? `${num(todayLog?.weight, 1)} kg hoy · toca para corregir` : 'En ayunas, después de ir al baño'}</small>
              </span>
            </label>
          </li>
          <li>
            <label className="check">
              <input type="checkbox" checked={waistToday} onChange={openWeight} />
              <span className="check__box">
                <Icon name="check" size={18} strokeWidth={3} />
              </span>
              <span className="check__text">
                <b>Cintura (semanal)</b>
                <small>
                  {waistToday
                    ? `${num(todayLog?.waist, 1)} cm hoy`
                    : lastWaistLog
                      ? `Última: ${num(lastWaistLog.waist, 1)} cm el ${fmtShort(lastWaistLog.date)}`
                      : 'A la altura del ombligo, una vez por semana'}
                </small>
              </span>
            </label>
          </li>
          <li>
            <label className="check">
              <input
                type="checkbox"
                checked={walkMin >= 30}
                onChange={() => setSheet('walk')}
              />
              <span className="check__box">
                <Icon name="check" size={18} strokeWidth={3} />
              </span>
              <span className="check__text">
                <b>Caminar 30-60 min</b>
                <small>{walkMin > 0 ? `${walkMin} min hoy` : 'Aún nada hoy'}</small>
              </span>
            </label>
            {lastWalk && (
              <button type="button" className="tbs-undo" onClick={undoWalk} disabled={busy}>
                Quitar la última ({lastWalk.minutes} min)
              </button>
            )}
          </li>
          <li>
            <div className="check check--static" data-done={proteinOk}>
              <span className="check__box" aria-hidden="true">
                <Icon name="check" size={18} strokeWidth={3} />
              </span>
              <span className="check__text">
                <b>Proteína</b>
                <small>
                  {proteinG} de {proteinMin} g{' '}
                  {proteinOk ? '· mínimo cubierto' : `· faltan ${proteinMin - proteinG} g`}
                </small>
                <span
                  className="meter meter--thin"
                  role="progressbar"
                  aria-label="Proteína de hoy"
                  aria-valuemin={0}
                  aria-valuemax={proteinMin}
                  aria-valuenow={Math.min(proteinG, proteinMin)}
                >
                  <span
                    className="meter__fill"
                    style={{ width: `${Math.min(100, (proteinG / Math.max(1, proteinMin)) * 100)}%` }}
                  />
                </span>
              </span>
            </div>
          </li>
          <li className="check-list__scale">
            <ScaleField label="Rodilla hoy (0-10)" value={knee} onChange={setKnee} />
          </li>
        </ul>
      </Card>

      <Card label="La pista · 50 semanas">
        <WeekTrack
          totalWeeks={TOTAL_WEEKS}
          currentWeek={currentWeek}
          maintenance={MAINTENANCE}
          milestones={MILESTONE_MARKS}
          startDate={startDate}
        />
      </Card>

      <Sheet
        open={sheet === 'weight'}
        onClose={() => setSheet(null)}
        title="Peso y cintura de hoy"
        description="Peso en ayunas y a la misma hora. La cintura, una vez por semana."
        footer={
          <>
            <Button variant="ghost" onClick={() => setSheet(null)}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={saveWeight}
              disabled={busy || (weightDraft == null && waistDraft == null)}
            >
              Guardar
            </Button>
          </>
        }
      >
        <NumberField label="Peso" unit="kg" value={weightDraft} onChange={setWeightDraft} step={0.1} min={30} max={250} placeholder="94,5" />
        <NumberField label="Cintura (opcional)" unit="cm" value={waistDraft} onChange={setWaistDraft} step={0.5} min={40} max={200} placeholder="101,8" />
      </Sheet>

      <Sheet
        open={sheet === 'walk'}
        onClose={() => setSheet(null)}
        title="Anotar caminata"
        footer={
          <>
            <Button variant="ghost" onClick={() => setSheet(null)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={saveWalk} disabled={busy || !walkDraft}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="chips" role="group" aria-label="Duración habitual">
          {WALK_PRESETS.map((m) => (
            <button
              key={m}
              type="button"
              className="chip"
              aria-pressed={walkDraft === m}
              onClick={() => setWalkDraft(m)}
            >
              {m} min
            </button>
          ))}
        </div>
        <NumberField label="Minutos" unit="min" value={walkDraft} onChange={setWalkDraft} step={5} min={1} max={600} />
      </Sheet>
    </div>
  )
}
