import { useMemo, useState } from 'react'
import type { FoodLog, ISODate, Meal } from '../domain/types'
import {
  addFoodLog,
  deleteFavorite,
  deleteFoodLog,
  saveFavorite,
  updateFoodLog,
  useBodyLogs,
  useFavorites,
  useFoodLogs,
  useFoodLogsRange,
  useSettings,
} from '../db'
import {
  addDays,
  adaptiveMaintenance,
  dailyTargets,
  fmtLong,
  maintenanceForWeek,
  todayISO,
  weekNumber,
  weekdayIndex,
} from '../lib'
import {
  Button,
  Card,
  Icon,
  NumberField,
  Ring,
  Segmented,
  Sheet,
  TextField,
  cx,
  num,
  signed,
  useToast,
} from '../components'
import '../styles/screens-training-diet.css'

const MEALS: ReadonlyArray<{ value: Meal; label: string }> = [
  { value: 'desayuno', label: 'Desayuno' },
  { value: 'comida', label: 'Comida' },
  { value: 'merienda', label: 'Merienda' },
  { value: 'cena', label: 'Cena' },
  { value: 'snack', label: 'Snack' },
]
const MEAL_LABEL = Object.fromEntries(MEALS.map((m) => [m.value, m.label])) as Record<Meal, string>
const WEEKDAY = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom']

/** Comida más probable según la hora (para preseleccionar al añadir). */
function mealNow(): Meal {
  const h = new Date().getHours()
  if (h < 11) return 'desayuno'
  if (h < 16) return 'comida'
  if (h < 19) return 'merienda'
  return 'cena'
}

/** Días de datos a partir de los cuales el gasto adaptativo es fiable. */
const DAYS_NEEDED = 14
const WINDOW_DAYS = 21

function dayLabel(date: ISODate, today: ISODate): string {
  if (date === today) return 'Hoy'
  if (date === addDays(today, -1)) return 'Ayer'
  return fmtLong(date)
}

export function Diet() {
  const toast = useToast()
  const settings = useSettings()
  const today = todayISO()

  const [date, setDate] = useState<ISODate>(today)
  const logs = useFoodLogs(date)
  const range = useFoodLogsRange(addDays(today, -(WINDOW_DAYS - 1)), today)
  const favorites = useFavorites()
  const bodyLogs = useBodyLogs()

  // Hoja de alta/edición
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<FoodLog | null>(null)
  const [meal, setMeal] = useState<Meal>('comida')
  const [label, setLabel] = useState('')
  const [kcal, setKcal] = useState<number | null>(null)
  const [protein, setProtein] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [manageFavs, setManageFavs] = useState(false)

  // ───────── Objetivos ─────────
  const adaptive = useMemo(
    () =>
      adaptiveMaintenance({
        intake: range.map((r) => ({ date: r.date, kcal: r.kcal })),
        weights: bodyLogs.filter((b) => b.weight != null).map((b) => ({ date: b.date, value: b.weight as number })),
        today,
        windowDays: WINDOW_DAYS,
      }),
    [range, bodyLogs, today],
  )
  const weighIns = useMemo(() => {
    const from = addDays(today, -(WINDOW_DAYS - 1))
    return bodyLogs.filter((b) => b.weight != null && b.date >= from && b.date <= today).length
  }, [bodyLogs, today])

  const manual = settings.kcal_maintenance_manual
  const maintenance = manual ?? adaptive.kcal
  const maintenanceSource: 'manual' | 'adaptive' | null = manual != null ? 'manual' : adaptive.kcal != null ? 'adaptive' : null
  const planWeek = weekNumber(settings.start_date, date)
  const maintBlock = maintenanceForWeek(planWeek)
  const targets = useMemo(
    () =>
      maintenance != null
        ? dailyTargets({
            maintenanceKcal: maintenance,
            deficitKcal: settings.deficit_kcal,
            isMaintenanceWeek: maintBlock != null,
            proteinMin: settings.protein_min,
            proteinMax: settings.protein_max,
          })
        : null,
    [maintenance, settings.deficit_kcal, settings.protein_min, settings.protein_max, maintBlock],
  )
  const pMin = settings.protein_min
  const pMax = settings.protein_max

  // ───────── Totales del día ─────────
  const totalKcal = logs.reduce((s, f) => s + f.kcal, 0)
  const totalProtein = logs.reduce((s, f) => s + f.protein_g, 0)
  const kcalLeft = targets ? targets.kcal - totalKcal : null
  const proteinGap = pMin - totalProtein
  const proteinPct = Math.min(100, (totalProtein / pMax) * 100)

  // ───────── Últimos 7 días ─────────
  const week = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6))
    const rows = days.map((d) => {
      const items = range.filter((r) => r.date === d)
      return {
        date: d,
        logged: items.length > 0,
        kcal: items.reduce((s, r) => s + r.kcal, 0),
        protein: items.reduce((s, r) => s + r.protein_g, 0),
      }
    })
    const logged = rows.filter((r) => r.logged)
    const n = logged.length
    return {
      rows,
      n,
      kcal: n ? logged.reduce((s, r) => s + r.kcal, 0) / n : null,
      protein: n ? logged.reduce((s, r) => s + r.protein, 0) / n : null,
    }
  }, [range, today])

  // ───────── Acciones ─────────
  function openAdd() {
    setEditing(null)
    setMeal(mealNow())
    setLabel('')
    setKcal(null)
    setProtein(null)
    setConfirmDelete(false)
    setOpen(true)
  }

  function openEdit(f: FoodLog) {
    setEditing(f)
    setMeal(f.meal)
    setLabel(f.label)
    setKcal(f.kcal)
    setProtein(f.protein_g)
    setConfirmDelete(false)
    setOpen(true)
  }

  function close() {
    setOpen(false)
    setEditing(null)
    setConfirmDelete(false)
  }

  async function run(action: () => Promise<unknown>, okMsg: string) {
    try {
      await action()
      toast.show(okMsg, 'ok')
    } catch (e) {
      console.error('[dieta]', e)
      toast.show('No se pudo guardar. Inténtalo de nuevo.', 'error')
    }
  }

  async function submit() {
    if (kcal == null) return
    const finalLabel = label.trim() || MEAL_LABEL[meal]
    const p = protein ?? 0
    if (editing) {
      await run(() => updateFoodLog(editing.id, { meal, label: finalLabel, kcal, protein_g: p }), 'Registro actualizado')
    } else {
      await run(() => addFoodLog({ date, meal, label: finalLabel, kcal, protein_g: p }), `${finalLabel} · ${num(kcal)} kcal`)
    }
    close()
  }

  async function remove() {
    if (!editing) return
    if (!confirmDelete) {
      setConfirmDelete(true)
      return
    }
    await run(() => deleteFoodLog(editing.id), 'Registro borrado')
    close()
  }

  function favoriteFrom(f: { label: string; kcal: number; protein_g: number; meal: Meal }) {
    const dup = favorites.some((x) => x.label === f.label && x.kcal === f.kcal && x.protein_g === f.protein_g)
    if (dup) {
      toast.show('Ya está en favoritos', 'info')
      return
    }
    void run(
      () => saveFavorite({ label: f.label, kcal: f.kcal, protein_g: f.protein_g, default_meal: f.meal }),
      'Guardado en favoritos',
    )
  }

  const shift = (n: number) => setDate((d) => addDays(d, n))

  return (
    <div className="stack">
      <div className="dt-days" role="group" aria-label="Día">
        <button type="button" className="icon-btn" onClick={() => shift(-1)} aria-label="Día anterior">
          <Icon name="atras" size={22} />
        </button>
        <p className="dt-days__label h-section" aria-live="polite">
          {dayLabel(date, today)}
          {(date === today || date === addDays(today, -1)) && <span className="muted small"> · {fmtLong(date)}</span>}
        </p>
        <button
          type="button"
          className="icon-btn"
          onClick={() => shift(1)}
          disabled={date >= today}
          aria-label="Día siguiente"
        >
          <Icon name="flecha" size={22} />
        </button>
      </div>

      <Card tone="board" label={date === today ? 'Hoy' : dayLabel(date, today)} className="diet-sum">
        <div className="diet-sum__row">
          <Ring
            value={totalKcal}
            max={targets?.kcal ?? 0}
            label={
              targets
                ? `${num(totalKcal)} de ${num(targets.kcal)} calorías`
                : `${num(totalKcal)} calorías, sin objetivo definido`
            }
          >
            <span className="display ring__num">{num(totalKcal)}</span>
            <span className="ring__sub eyebrow">kcal</span>
          </Ring>
          <div className="diet-sum__side">
            {targets && kcalLeft != null ? (
              <>
                <p className="eyebrow">{kcalLeft >= 0 ? 'Te quedan' : 'Te pasas'}</p>
                <p className="display diet-sum__left">
                  {num(Math.abs(kcalLeft))}
                  <span>kcal</span>
                </p>
                <p className="muted small">
                  Objetivo {num(targets.kcal)} kcal
                  {maintBlock ? ` · mantenimiento (${maintBlock.label})` : ` · déficit ${num(settings.deficit_kcal)}`}
                </p>
              </>
            ) : (
              <>
                <p className="eyebrow">Sin objetivo</p>
                <p className="muted small">
                  Fija tu mantenimiento en Ajustes o registra comida y peso 14 días para estimarlo.
                </p>
              </>
            )}
          </div>
        </div>

        <div className="protein">
          <div className="protein__head">
            <span className="eyebrow">Proteína</span>
            <span className="display protein__num">
              {num(totalProtein)}
              <span>
                {' '}
                / {pMin}-{pMax} g
              </span>
            </span>
          </div>
          <div
            className="meter protein__meter"
            role="progressbar"
            aria-label="Proteína del día"
            aria-valuemin={0}
            aria-valuemax={pMax}
            aria-valuenow={Math.min(totalProtein, pMax)}
          >
            <div className="meter__fill" style={{ width: `${proteinPct}%` }} />
            <i className="protein__mark" style={{ left: `${(pMin / pMax) * 100}%` }} aria-hidden="true" />
          </div>
          <p className={proteinGap > 0 ? 'protein__note' : 'protein__note protein__note--ok'}>
            <Icon name={proteinGap > 0 ? 'warn' : 'ok'} size={16} />
            {proteinGap > 0 ? `Faltan ${num(proteinGap)} g para el mínimo` : 'Mínimo de proteína cubierto'}
          </p>
        </div>
      </Card>

      <Button variant="primary" block icon="plus" onClick={openAdd}>
        Comida
      </Button>

      <section className="stack-sm" aria-labelledby="h-fav">
        <div className="dt-days">
          <h2 id="h-fav" className="eyebrow grow">
            Favoritos · un toque
          </h2>
          {favorites.length > 0 && (
            <button type="button" className="btn btn--ghost" onClick={() => setManageFavs((v) => !v)} aria-pressed={manageFavs}>
              <span>{manageFavs ? 'Hecho' : 'Gestionar'}</span>
            </button>
          )}
        </div>
        {favorites.length === 0 ? (
          <p className="muted small">
            Aún no tienes favoritos. Toca la estrella de un registro (o ábrelo y pulsa “Guardar como favorito”) para
            repetirlo con un toque.
          </p>
        ) : (
          <ul className="chips">
            {favorites.map((f) => (
              <li key={f.id} className="dt-fav">
                <button
                  type="button"
                  className="chip chip--fav"
                  disabled={manageFavs}
                  onClick={() =>
                    void run(
                      () =>
                        addFoodLog({
                          date,
                          meal: f.default_meal,
                          label: f.label,
                          kcal: f.kcal,
                          protein_g: f.protein_g,
                          favorite_id: f.id,
                        }),
                      `${f.label} · ${num(f.kcal)} kcal`,
                    )
                  }
                >
                  <Icon name="plus" size={16} />
                  <span>
                    {f.label}
                    <small>
                      {num(f.kcal)} kcal · {num(f.protein_g)} g
                    </small>
                  </span>
                </button>
                {manageFavs && (
                  <button
                    type="button"
                    className="icon-btn dt-fav__del"
                    aria-label={`Borrar favorito ${f.label}`}
                    onClick={() => void run(() => deleteFavorite(f.id), 'Favorito borrado')}
                  >
                    <Icon name="minus" size={20} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="stack-sm" aria-labelledby="h-comidas">
        <h2 id="h-comidas" className="eyebrow">
          {date === today ? 'Lo de hoy' : `Lo de ${dayLabel(date, today).toLowerCase()}`}
        </h2>
        {logs.length === 0 && <p className="muted small">Nada registrado este día.</p>}
        {MEALS.map((m) => {
          const items = logs.filter((f) => f.meal === m.value)
          if (!items.length) return null
          const sub = items.reduce((s, f) => s + f.kcal, 0)
          return (
            <Card key={m.value} className="meal">
              <div className="meal__head">
                <h3 className="h-section">{m.label}</h3>
                <span className="display meal__sub">{num(sub)} kcal</span>
              </div>
              <ul className="meal__list">
                {items.map((f) => (
                  <li key={f.id} className="dt-entry">
                    <button type="button" className="dt-entry__main" onClick={() => openEdit(f)} aria-label={`Editar ${f.label}`}>
                      {f.label}
                      <small>
                        {num(f.kcal)} kcal · {num(f.protein_g)} g
                      </small>
                    </button>
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label={`Guardar ${f.label} como favorito`}
                      onClick={() => favoriteFrom({ label: f.label, kcal: f.kcal, protein_g: f.protein_g, meal: f.meal })}
                    >
                      <Icon name="estrella" size={20} />
                    </button>
                  </li>
                ))}
              </ul>
            </Card>
          )
        })}
      </section>

      <Card label="Últimos 7 días">
        {week.n === 0 ? (
          <p className="muted small">Todavía no hay registros en la última semana.</p>
        ) : (
          <>
            <div className="dt-week">
              <div className="dt-week__cell">
                <p className="eyebrow">Calorías · media</p>
                <p className="display dt-week__num">
                  {num(week.kcal)}
                  <span> kcal</span>
                </p>
                {targets && week.kcal != null && (
                  <p className={cx('small', week.kcal > targets.kcal ? 'dt-bad' : 'dt-good')}>
                    <Icon name={week.kcal > targets.kcal ? 'warn' : 'ok'} size={14} />{' '}
                    {signed(week.kcal - targets.kcal, 0)} vs objetivo {num(targets.kcal)}
                  </p>
                )}
              </div>
              <div className="dt-week__cell">
                <p className="eyebrow">Proteína · media</p>
                <p className="display dt-week__num">
                  {num(week.protein)}
                  <span> g</span>
                </p>
                {week.protein != null && (
                  <p className={cx('small', week.protein < pMin ? 'dt-bad' : 'dt-good')}>
                    <Icon name={week.protein < pMin ? 'warn' : 'ok'} size={14} />{' '}
                    {week.protein < pMin ? `${num(pMin - week.protein)} g bajo el mínimo` : `En rango (${pMin}-${pMax} g)`}
                  </p>
                )}
              </div>
            </div>
            <p className="muted small">
              Media de los {week.n} {week.n === 1 ? 'día' : 'días'} con registro de los últimos 7.
            </p>
            <ul className="dt-week__days">
              {week.rows.map((r) => {
                const max = Math.max(targets?.kcal ?? 0, ...week.rows.map((x) => x.kcal), 1)
                return (
                  <li key={r.date}>
                    <span className="small">{WEEKDAY[weekdayIndex(r.date)]}</span>
                    <span
                      className="meter meter--thin"
                      role="img"
                      aria-label={r.logged ? `${num(r.kcal)} kcal` : 'Sin registro'}
                    >
                      <span className="meter__fill" style={{ width: `${(r.kcal / max) * 100}%` }} />
                    </span>
                    <span className="small muted dt-week__kcal">{r.logged ? num(r.kcal) : '—'}</span>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </Card>

      <Card label="Gasto estimado">
        {adaptive.kcal != null ? (
          <>
            <p className="display dt-spend__num">
              {num(adaptive.kcal)}
              <span> kcal/día</span>
              <span className={cx('dt-spend__tag', adaptive.confidence === 'ok' && 'dt-spend__tag--ok')}>
                {adaptive.confidence === 'ok' ? 'Fiable' : 'Estimación'}
              </span>
            </p>
            <p className="muted small">
              Estimado con tu peso y lo que comes, con {adaptive.days} días de datos (fiable desde {DAYS_NEEDED}
              {adaptive.confidence === 'low' ? `; mejora hasta ${WINDOW_DAYS}` : ''}).{' '}
              {maintenanceSource === 'manual'
                ? `Usas tu mantenimiento manual de ${num(manual)} kcal; cámbialo en Ajustes si quieres usar este.`
                : 'Es el mantenimiento que usa el objetivo del día.'}
            </p>
          </>
        ) : (
          <>
            <p className="spend__locked">
              <Icon name="reloj" size={20} />
              {adaptive.days >= DAYS_NEEDED
                ? `Faltan pesadas: hacen falta 6 en ${WINDOW_DAYS} días (llevas ${weighIns}).`
                : `Aparece tras ${DAYS_NEEDED} días registrando comida (y 6 pesadas).`}
            </p>
            <div
              className="meter"
              role="progressbar"
              aria-label="Días con registro de comida"
              aria-valuemin={0}
              aria-valuemax={DAYS_NEEDED}
              aria-valuenow={Math.min(adaptive.days, DAYS_NEEDED)}
            >
              <div className="meter__fill" style={{ width: `${Math.min(100, (adaptive.days / DAYS_NEEDED) * 100)}%` }} />
            </div>
            <p className="muted small">
              {adaptive.days} de {DAYS_NEEDED} días con comida registrada · {weighIns} de 6 pesadas.{' '}
              {manual != null
                ? `Mientras tanto se usa tu mantenimiento manual de ${num(manual)} kcal.`
                : 'Sin mantenimiento manual en Ajustes aún no hay objetivo de calorías.'}
            </p>
          </>
        )}
      </Card>

      <Sheet
        open={open}
        onClose={close}
        title={editing ? 'Editar registro' : 'Añadir comida'}
        description={date === today ? undefined : `Para ${dayLabel(date, today).toLowerCase()}`}
        footer={
          <>
            <Button variant="ghost" onClick={close}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={() => void submit()} disabled={kcal == null}>
              {editing ? 'Guardar' : 'Añadir'}
            </Button>
          </>
        }
      >
        <Segmented label="Comida" options={MEALS} value={meal} onChange={setMeal} />
        <TextField label="Qué has comido" value={label} onChange={setLabel} placeholder="Pollo con arroz" autoComplete="off" />
        <div className="grid-2">
          <NumberField label="Calorías" unit="kcal" value={kcal} onChange={setKcal} step={50} min={0} max={5000} />
          <NumberField label="Proteína" unit="g" value={protein} onChange={setProtein} step={5} min={0} max={500} />
        </div>
        {editing && (
          <div className="dt-form-actions">
            <Button
              icon="estrella"
              onClick={() =>
                favoriteFrom({ label: label.trim() || MEAL_LABEL[meal], kcal: kcal ?? editing.kcal, protein_g: protein ?? 0, meal })
              }
              disabled={kcal == null}
            >
              Guardar como favorito
            </Button>
            <Button variant="danger" onClick={() => void remove()}>
              {confirmDelete ? 'Confirmar borrado' : 'Borrar'}
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
