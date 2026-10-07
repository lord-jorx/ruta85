import { DAY, cx, fmtDate, isoToMs } from './format'
import { Icon } from './icons'

export interface WeekTrackMaintenance {
  fromWeek: number
  toWeek: number
  label: string
}

export interface WeekTrackMilestone {
  week: number
  label: string
}

export interface WeekTrackProps {
  /** Semanas totales del plan (50). */
  totalWeeks: number
  /** Semana en curso, empezando en 1. Menos de 1: el plan aún no ha empezado. */
  currentWeek: number
  maintenance: WeekTrackMaintenance[]
  milestones: WeekTrackMilestone[]
  /** Fecha de inicio (YYYY-MM-DD), lunes de la semana 1. */
  startDate: string
  /** Casillas por fila. Por defecto 10 (5 filas para 50 semanas). */
  perRow?: number
  className?: string
}

const PER_ROW = 10

/**
 * La pista: una vuelta de 10 semanas por calle. Cada casilla es una semana.
 *  - hecha: relleno ámbar suave · ahora: ámbar sólido con aro · futura: solo contorno
 *  - mantenimiento: rayado verde (se come a mantenimiento, se entrena igual)
 *  - hito: banderín en la esquina
 */
export function WeekTrack({
  totalWeeks,
  currentWeek,
  maintenance,
  milestones,
  startDate,
  perRow = PER_ROW,
  className,
}: WeekTrackProps) {
  const startMs = isoToMs(startDate)
  const weekRange = (n: number) => `${fmtDate(startMs + (n - 1) * 7 * DAY)} – ${fmtDate(startMs + (n * 7 - 1) * DAY)}`
  const maintOf = (n: number) => maintenance.find((m) => n >= m.fromWeek && n <= m.toWeek)
  const mileOf = (n: number) => milestones.find((m) => m.week === n)

  const rows: number[][] = []
  for (let first = 1; first <= totalWeeks; first += perRow) {
    rows.push(Array.from({ length: Math.min(perRow, totalWeeks - first + 1) }, (_, i) => first + i))
  }

  const done = Math.max(0, Math.min(totalWeeks, currentWeek - 1))
  const nextMile = milestones
    .filter((m) => m.week >= Math.max(1, currentWeek))
    .sort((a, b) => a.week - b.week)[0]
  const nowMaint = currentWeek >= 1 ? maintOf(currentWeek) : undefined

  const summary =
    currentWeek < 1
      ? `Pista de ${totalWeeks} semanas. El plan empieza el ${fmtDate(startMs)}.`
      : currentWeek > totalWeeks
        ? `Pista de ${totalWeeks} semanas completada.`
        : `Pista de ${totalWeeks} semanas. Vas por la semana ${currentWeek}: ${done} completadas.` +
          (nowMaint ? ` Esta semana es de mantenimiento: ${nowMaint.label}.` : '') +
          (nextMile ? ` Próximo hito: semana ${nextMile.week}, ${nextMile.label}.` : '')

  return (
    <figure className={cx('wt', className)} aria-label={summary}>
      <div className="wt__rows">
        {rows.map((weeks) => (
          <div className="wt__row" key={weeks[0]}>
            <span className="wt__lap" aria-hidden="true">
              S{weeks[0]}
            </span>
            <ol className="wt__lane" aria-label={`Semanas ${weeks[0]} a ${weeks[weeks.length - 1]}`}>
              {weeks.map((n) => {
                const state = n < currentWeek ? 'past' : n === currentWeek ? 'now' : 'future'
                const m = maintOf(n)
                const h = mileOf(n)
                const stateText = { past: 'hecha', now: 'esta semana', future: 'por venir' }[state]
                const label =
                  `Semana ${n}, ${weekRange(n)}, ${stateText}` +
                  (m ? `, mantenimiento: ${m.label}` : '') +
                  (h ? `, hito: ${h.label}` : '')
                return (
                  <li
                    key={n}
                    className={cx(
                      'wt__cell',
                      `wt__cell--${state}`,
                      m && 'wt__cell--maint',
                      h && 'wt__cell--mile',
                      n === totalWeeks && 'wt__cell--finish',
                    )}
                    aria-label={label}
                    aria-current={state === 'now' ? 'step' : undefined}
                  >
                    <span className="wt__n" aria-hidden="true">
                      {n}
                    </span>
                    {h && <Icon name="bandera" size={11} className="wt__flag" strokeWidth={2.6} />}
                  </li>
                )
              })}
            </ol>
          </div>
        ))}
      </div>

      <figcaption className="wt__legend" aria-hidden="true">
        <span className="wt__key">
          <i className="wt__sw wt__sw--past" />
          Hecha
        </span>
        <span className="wt__key">
          <i className="wt__sw wt__sw--now" />
          Ahora
        </span>
        <span className="wt__key">
          <i className="wt__sw wt__sw--maint" />
          Mantenimiento
        </span>
        <span className="wt__key">
          <Icon name="bandera" size={13} />
          Hito
        </span>
      </figcaption>

      {(nextMile || nowMaint) && (
        <ul className="wt__notes">
          {nowMaint && (
            <li>
              <Icon name="llama" size={16} />
              <span>
                Mantenimiento hasta la semana {nowMaint.toWeek}: <b>{nowMaint.label}</b>
              </span>
            </li>
          )}
          {nextMile && (
            <li>
              <Icon name="bandera" size={16} />
              <span>
                Semana {nextMile.week} · <b>{nextMile.label}</b>
                {nextMile.week > currentWeek && ` · ${weekRange(nextMile.week).split(' – ')[0]}`}
              </span>
            </li>
          )}
        </ul>
      )}
    </figure>
  )
}
