import { useMemo, useState } from 'react'
import type { BodyLog, ISODate } from '../domain/types'
import {
  Button,
  Card,
  EmptyState,
  Icon,
  LineChart,
  NumberField,
  ScaleField,
  Sheet,
  Stat,
  TextField,
  fmtDateLong,
  isoToMs,
  num,
  signed,
  useToast,
} from '../components'
import type { ChartPoint, StatStatus } from '../components'
import { bmi, bmiWeight, diffDays, fmtShort, isISODate, planLine, requiredPace, rolling7, slopeKgPerWeek, todayISO, whtr } from '../lib'
import type { PaceStatus } from '../lib'
import { deleteBodyLog, upsertBodyLog, useBodyLogs, useSettings } from '../db'
import '../styles/screens-today-body-settings.css'

const KNEE_LIMIT = 3
const HISTORY_STEP = 15

const toPt = (date: ISODate, y: number): ChartPoint => ({ t: isoToMs(date), y })

const PACE_TEXT: Record<PaceStatus, { status: StatStatus; text: string }> = {
  done: { status: 'ok', text: 'Objetivo alcanzado' },
  ok: { status: 'ok', text: 'Ritmo asumible' },
  tight: { status: 'warn', text: 'Exigente: cuida la proteína' },
  'too-fast': { status: 'crit', text: 'Demasiado rápido: ajusta el objetivo' },
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Error desconocido'
}

export function Body() {
  const toast = useToast()
  const settings = useSettings()
  const logs = useBodyLogs()

  const today = todayISO()
  const height = settings.height_cm
  const goalWeight = settings.goal_weight

  const [open, setOpen] = useState(false)
  const [date, setDate] = useState<ISODate>(today)
  const [weight, setWeight] = useState<number | null>(null)
  const [waist, setWaist] = useState<number | null>(null)
  const [knee, setKnee] = useState<number | null>(null)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [shown, setShown] = useState(HISTORY_STEP)

  const logByDate = useMemo(() => new Map(logs.map((l) => [l.date, l])), [logs])
  const editing: BodyLog | undefined = logByDate.get(date)

  // ── Series ──
  const weightLogs = useMemo(() => logs.filter((l) => l.weight != null), [logs])
  const raw = useMemo(() => weightLogs.map((l) => toPt(l.date, l.weight as number)), [weightLogs])
  const avgPace = useMemo(() => rolling7(weightLogs.map((l) => ({ date: l.date, value: l.weight as number }))), [weightLogs])
  const avg = useMemo(() => avgPace.map((p) => toPt(p.date, p.value)), [avgPace])
  const lastAvg = avgPace.length > 0 ? avgPace[avgPace.length - 1].value : null
  const lastWeightLog = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null
  const rate = useMemo(
    () => slopeKgPerWeek(weightLogs.map((l) => ({ date: l.date, value: l.weight as number }))),
    [weightLogs],
  )

  const pace = useMemo(
    () =>
      lastAvg == null
        ? null
        : requiredPace({
            currentAvg: lastAvg,
            goalWeight,
            today,
            startDate: settings.start_date,
            goalDate: settings.goal_date,
          }),
    [lastAvg, goalWeight, today, settings.start_date, settings.goal_date],
  )

  // La línea del plan parte de la primera media posterior al inicio del plan (o de la primera que haya).
  const plan = useMemo<ChartPoint[]>(() => {
    if (avgPace.length === 0) return []
    const first = avgPace.find((p) => p.date >= settings.start_date) ?? avgPace[0]
    const until = avgPace[avgPace.length - 1].date
    return planLine(first.value, goalWeight, settings.start_date, settings.goal_date, until).map((p) => ({
      ...toPt(p.date, p.value),
      tx: `plan · ${num(p.value, 1)} kg`,
    }))
  }, [avgPace, goalWeight, settings.start_date, settings.goal_date])

  const waistLogs = useMemo(() => logs.filter((l) => l.waist != null), [logs])
  const waistPts = useMemo(() => waistLogs.map((l) => toPt(l.date, l.waist as number)), [waistLogs])
  const lastWaistLog = waistLogs.length > 0 ? waistLogs[waistLogs.length - 1] : null

  const kneeLogs = useMemo(() => logs.filter((l) => l.knee_pain != null), [logs])
  const kneePts = useMemo<ChartPoint[]>(
    () =>
      kneeLogs.map((l) => {
        const y = l.knee_pain as number
        return {
          ...toPt(l.date, y),
          c: y <= KNEE_LIMIT ? 'var(--ok)' : 'var(--crit)',
          tx: `${y}/10 · ${y <= KNEE_LIMIT ? 'dentro del límite' : 'por encima del límite'}`,
        }
      }),
    [kneeLogs],
  )
  const lastKneeLog = kneeLogs.length > 0 ? kneeLogs[kneeLogs.length - 1] : null

  // ── Estados derivados ──
  const rateOk = rate != null && rate <= -0.2 && rate >= -0.4
  const rateStatus: StatStatus = rateOk ? 'ok' : rate != null && rate > 0.05 ? 'crit' : 'warn'
  const rateText = rateOk
    ? 'En objetivo'
    : rate != null && rate > 0.05
      ? 'Subiendo'
      : rate != null && rate > -0.2
        ? 'Más lento que el objetivo'
        : 'Más rápido: vigila fuerza y proteína'

  const waistTarget = height / 2
  const lastWaist = lastWaistLog?.waist ?? null
  const waistRatio = lastWaist != null ? whtr(lastWaist, height) : null
  const waistOk = waistRatio != null && waistRatio < 0.5
  const lastKnee = lastKneeLog?.knee_pain ?? null

  // ── Formulario ──
  function loadDraft(d: ISODate) {
    const l = logByDate.get(d)
    setWeight(l?.weight ?? null)
    setWaist(l?.waist ?? null)
    setKnee(l?.knee_pain ?? null)
    setNote(l?.note ?? '')
  }

  function openFor(d: ISODate) {
    setDate(d)
    loadDraft(d)
    setOpen(true)
  }

  function changeDate(d: string) {
    setDate(d)
    if (isISODate(d)) loadDraft(d)
  }

  const dirty = weight != null || waist != null || knee != null || note.trim() !== ''
  const valid = isISODate(date) && date <= today && dirty

  async function save() {
    if (!valid || busy) return
    setBusy(true)
    try {
      await upsertBodyLog(date, { weight, waist, knee_pain: knee, note: note.trim() === '' ? null : note.trim() })
      setOpen(false)
      toast.show(editing ? 'Registro actualizado' : 'Registro guardado', 'ok')
    } catch (e) {
      toast.show(errMsg(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    if (!editing || busy) return
    if (!window.confirm(`¿Borrar el registro del ${fmtDateLong(isoToMs(editing.date))}?`)) return
    setBusy(true)
    try {
      await deleteBodyLog(editing.id)
      setOpen(false)
      toast.show('Registro borrado')
    } catch (e) {
      toast.show(errMsg(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  const history = useMemo(() => [...logs].reverse(), [logs])
  const noData = logs.length === 0

  return (
    <div className="stack">
      <Button variant="primary" block icon="plus" onClick={() => openFor(today)}>
        Registrar peso, cintura o rodilla
      </Button>

      <section className="stack" aria-labelledby="h-peso">
        <h2 id="h-peso" className="h-section">
          Peso
        </h2>
        {lastAvg == null || pace == null ? (
          <Card>
            <EmptyState icon="peso" title="Aún no hay pesadas">
              Guarda tu primera pesada (en ayunas) y aquí verás la media de 7 días, tu ritmo y el que necesitas para
              llegar a {num(goalWeight, 1)} kg.
            </EmptyState>
          </Card>
        ) : (
          <div className="stat-grid">
            <Stat
              label="Media 7 días"
              value={num(lastAvg, 1)}
              unit="kg"
              size="lg"
              hint={lastWeightLog ? `Última pesada: ${num(lastWeightLog.weight, 1)} kg · ${fmtShort(lastWeightLog.date)}` : undefined}
            />
            <Stat
              label="Ritmo"
              value={rate == null ? '—' : signed(rate, 2)}
              unit="kg/sem"
              hint={rate == null ? 'Hacen falta 3 pesadas en más de 10 días' : 'Objetivo −0,2 a −0,4'}
              status={rate == null ? undefined : rateStatus}
              statusText={rateText}
              size="lg"
            />
            <Stat
              label="Te faltan"
              value={pace.remainingKg > 0 ? `−${num(pace.remainingKg, 1)}` : '0'}
              unit="kg"
              hint={`${Math.ceil(pace.weeksLeft)} semanas · para ${num(goalWeight, 1)} kg`}
            />
            <Stat
              label="Ritmo necesario"
              value={Number.isFinite(pace.kgPerDeficitWeek) ? num(pace.kgPerDeficitWeek, 2) : '—'}
              unit="kg/sem"
              hint="Solo semanas de déficit"
              status={PACE_TEXT[pace.status].status}
              statusText={PACE_TEXT[pace.status].text}
            />
            <Stat
              label="IMC"
              value={num(bmi(lastAvg, height), 1)}
              hint={`Con IMC 25 serían ${num(bmiWeight(25, height), 1)} kg`}
            />
          </div>
        )}
        <Card label="Peso y tendencia">
          <LineChart
            series={[
              { name: 'Plan', kind: 'line', dash: true, color: 'var(--muted)', pts: plan },
              { name: 'Peso diario', kind: 'dots', color: 'var(--muted)', pts: raw },
              { name: 'Media 7 días', kind: 'line', color: 'var(--s1)', label: true, pts: avg },
            ]}
            dec={1}
            unit=" kg"
            empty="Todavía no hay pesadas. Guarda la primera y aquí aparecerá tu tendencia."
            aria="Peso corporal, media de 7 días y ritmo del plan para llegar al objetivo"
          />
        </Card>
      </section>

      <section className="stack" aria-labelledby="h-cintura">
        <h2 id="h-cintura" className="h-section">
          Cintura
        </h2>
        {lastWaist == null || waistRatio == null ? (
          <Card>
            <EmptyState icon="cuerpo" title="Aún no hay medidas de cintura">
              Mídela a la altura del ombligo, una vez por semana. El objetivo es cintura/altura por debajo de 0,50 (
              {num(waistTarget, 1)} cm contigo).
            </EmptyState>
          </Card>
        ) : (
          <div className="stat-grid">
            <Stat
              label="Última medida"
              value={num(lastWaist, 1)}
              unit="cm"
              size="lg"
              hint={lastWaistLog ? fmtShort(lastWaistLog.date) : undefined}
            />
            <Stat
              label="Cintura / altura"
              value={num(waistRatio, 2)}
              hint={`Objetivo < 0,50 (${num(waistTarget, 1)} cm)`}
              status={waistOk ? 'ok' : 'warn'}
              statusText={waistOk ? 'Por debajo de 0,5' : `Faltan ${num(lastWaist - waistTarget, 1)} cm`}
              size="lg"
            />
          </div>
        )}
        <Card label="Cintura">
          <LineChart
            series={[{ name: 'Cintura', kind: 'line', color: 'var(--s1)', label: true, pts: waistPts }]}
            refLine={{ y: waistTarget, label: `mitad de tu altura (${num(waistTarget, 1)} cm)`, tone: 'ok' }}
            dec={1}
            unit=" cm"
            empty="Sin medidas de cintura. Mídela cada semana a la altura del ombligo."
            aria="Cintura en centímetros comparada con la mitad de tu altura"
          />
        </Card>
      </section>

      <section className="stack" aria-labelledby="h-rodilla">
        <h2 id="h-rodilla" className="h-section">
          Rodilla
        </h2>
        {lastKnee == null ? (
          <Card>
            <EmptyState icon="warn" title="Aún no has anotado dolor de rodilla">
              Anótalo cada semana y tras las sesiones de pierna. Con más de {KNEE_LIMIT}/10 se baja la carga.
            </EmptyState>
          </Card>
        ) : (
          <div className="stat-grid">
            <Stat
              label="Último registro"
              value={`${lastKnee}`}
              unit="/10"
              hint={lastKneeLog ? fmtShort(lastKneeLog.date) : undefined}
              status={lastKnee <= KNEE_LIMIT ? 'ok' : 'crit'}
              statusText={lastKnee <= KNEE_LIMIT ? 'Dentro del límite' : 'Alto: baja la carga'}
              size="lg"
            />
          </div>
        )}
        <Card label="Dolor de rodilla (0-10)">
          <LineChart
            series={[{ name: 'Dolor', kind: 'line', color: 'var(--ink-2)', pts: kneePts }]}
            domain={[0, 10]}
            refLine={{ y: KNEE_LIMIT, label: `límite ${KNEE_LIMIT}/10`, tone: 'crit' }}
            unit="/10"
            empty="Sin registros de dolor. Anótalo cada semana y tras las sesiones de pierna."
            aria="Dolor de rodilla de 0 a 10 con el límite en 3"
          />
        </Card>
      </section>

      <section className="stack" aria-labelledby="h-registros">
        <h2 id="h-registros" className="h-section">
          Registros
        </h2>
        <Card>
          {noData ? (
            <EmptyState icon="cuerpo" title="Sin registros todavía">
              Cuando guardes pesadas, medidas o dolor de rodilla podrás corregirlos o borrarlos desde aquí.
            </EmptyState>
          ) : (
            <>
              <ul className="tbs-hist">
                {history.slice(0, shown).map((l) => (
                  <li key={l.id} className="tbs-hist__row">
                    <div>
                      <div className="tbs-hist__date">
                        {l.date === today ? 'Hoy' : fmtDateLong(isoToMs(l.date))}
                        {l.source === 'opengym' && <span className="muted small"> · OpenGym</span>}
                      </div>
                      <div className="tbs-hist__vals">
                        {l.weight != null && <span>{num(l.weight, 1)} kg</span>}
                        {l.waist != null && <span>cintura {num(l.waist, 1)} cm</span>}
                        {l.knee_pain != null && <span>rodilla {l.knee_pain}/10</span>}
                        {l.weight == null && l.waist == null && l.knee_pain == null && <span>solo nota</span>}
                      </div>
                      {l.note && <div className="tbs-hist__note">{l.note}</div>}
                    </div>
                    <Button
                      variant="ghost"
                      aria-label={`Editar el registro del ${fmtDateLong(isoToMs(l.date))}`}
                      onClick={() => openFor(l.date)}
                    >
                      Editar
                    </Button>
                  </li>
                ))}
              </ul>
              {history.length > shown && (
                <Button variant="ghost" block onClick={() => setShown((n) => n + HISTORY_STEP)}>
                  Ver más ({history.length - shown})
                </Button>
              )}
            </>
          )}
        </Card>
      </section>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? 'Editar registro' : 'Registrar'}
        description={
          editing
            ? `Ya hay un registro del ${fmtShort(date)}: lo que cambies lo actualiza. Vacía un campo para quitarlo.`
            : 'Rellena solo lo que hayas medido.'
        }
        footer={
          <>
            {editing && (
              <Button variant="danger" className="tbs-sheet-actions-left" onClick={remove} disabled={busy}>
                Borrar
              </Button>
            )}
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={save} disabled={!valid || busy}>
              Guardar
            </Button>
          </>
        }
      >
        <TextField label="Fecha" type="date" value={date} onChange={changeDate} max={today} />
        {isISODate(date) && date < today && diffDays(date, today) > 0 && (
          <p className="muted small">Registro de hace {diffDays(date, today)} {diffDays(date, today) === 1 ? 'día' : 'días'}.</p>
        )}
        <NumberField label="Peso" unit="kg" value={weight} onChange={setWeight} step={0.1} min={30} max={250} placeholder="93,4" />
        <NumberField label="Cintura" unit="cm" value={waist} onChange={setWaist} step={0.5} min={40} max={200} placeholder="101,8" />
        <ScaleField label="Rodilla (0-10)" value={knee} onChange={setKnee} alertAbove={KNEE_LIMIT} />
        {knee != null && (
          <Button variant="ghost" onClick={() => setKnee(null)}>
            Quitar el dato de rodilla
          </Button>
        )}
        <TextField label="Nota (opcional)" value={note} onChange={setNote} maxLength={200} placeholder="Ayuno, tras guardia…" />
        <p className="muted small">
          <Icon name="ok" size={14} /> Se guarda en este dispositivo y se sincroniza si has iniciado sesión.
        </p>
      </Sheet>
    </div>
  )
}
