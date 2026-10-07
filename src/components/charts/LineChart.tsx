import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { DAY, cx, fmtDate, fmtDateLong, num } from '../format'

/** Un punto: `t` en milisegundos UTC, `y` en la unidad de la serie. */
export interface ChartPoint {
  t: number
  y: number
  /** Texto del tooltip si no basta con "valor + unidad". */
  tx?: string
  /** Color propio del punto (p. ej. estado de la rodilla). Usa tokens: `var(--ok)`. */
  c?: string
}

export interface ChartSeries {
  /** Nombre para la leyenda y la tabla de datos. */
  name: string
  /** `dots`: solo puntos. `line`: línea con marcadores (sin marcadores si hay >40 puntos). */
  kind: 'line' | 'dots'
  /** Color como token CSS (`var(--s1)`). Por defecto, tinta secundaria. */
  color?: string
  /** Línea discontinua sin marcadores (el plan). */
  dash?: boolean
  /** Etiqueta directa con el último valor. */
  label?: boolean
  pts: ChartPoint[]
}

export interface LineChartProps {
  series: ChartSeries[]
  /** Línea de referencia horizontal con etiqueta (p. ej. "límite 3/10"). */
  refLine?: { y: number; label: string; tone?: 'warn' | 'crit' | 'ok' }
  /** Dominio Y fijo; si falta se ajusta a los datos con 12 % de margen. */
  domain?: [number, number]
  /** Decimales de los valores. */
  dec?: number
  /** Unidad tras el valor: " kg", " cm", "/10". */
  unit?: string
  /** Mensaje del estado vacío. */
  empty: string
  /** Descripción para lectores de pantalla. */
  aria: string
  height?: number
  /** Nombre de la primera columna de la tabla de datos. */
  tableDateLabel?: string
  className?: string
}

const M = { l: 44, r: 18, t: 18, b: 28 }

/** Marcas "agradables" para el eje (port de niceTicks de tracker.html). */
export function niceTicks(a: number, b: number, n: number): number[] {
  const span = b - a || 1
  let step = Math.pow(10, Math.floor(Math.log10(span / n)))
  const e = span / n / step
  step *= e >= 5 ? 5 : e >= 2 ? 2 : 1
  const out: number[] = []
  for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(6))
  return out
}

function decimalsFor(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0
  return Math.max(0, -Math.floor(Math.log10(step) + 1e-9))
}

interface Hover {
  t: number
  y: number
  text: string
}

export function LineChart({
  series,
  refLine,
  domain,
  dec = 0,
  unit = '',
  empty,
  aria,
  height = 220,
  tableDateLabel = 'Fecha',
  className,
}: LineChartProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(0)
  const [hover, setHover] = useState<Hover | null>(null)
  const id = useId()

  useEffect(() => {
    const el = boxRef.current
    if (!el) return
    const measure = () => setWidth(Math.round(el.clientWidth))
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const all = useMemo(() => series.flatMap((s) => s.pts), [series])
  const hasData = all.length > 0

  const W = Math.max(240, width || 320)
  const H = height
  const iw = W - M.l - M.r
  const ih = H - M.t - M.b

  const geo = useMemo(() => {
    if (!hasData) return null
    let x0 = Math.min(...all.map((p) => p.t))
    let x1 = Math.max(...all.map((p) => p.t))
    if (x1 - x0 < 6 * DAY) {
      const c = (x0 + x1) / 2
      x0 = c - 3 * DAY
      x1 = c + 3 * DAY
    }
    const ys = all.map((p) => p.y)
    if (refLine) ys.push(refLine.y)
    let y0 = domain ? domain[0] : Math.min(...ys)
    let y1 = domain ? domain[1] : Math.max(...ys)
    if (!domain) {
      const pad = (y1 - y0) * 0.12 || 1
      y0 -= pad
      y1 += pad
    }
    const X = (t: number) => M.l + ((t - x0) / (x1 - x0)) * iw
    const Y = (v: number) => M.t + (1 - (v - y0) / (y1 - y0)) * ih
    const ticks = niceTicks(y0, y1, 4)
    const tickDec = Math.max(dec, decimalsFor(ticks.length > 1 ? ticks[1] - ticks[0] : 1))
    return { x0, x1, y0, y1, X, Y, ticks, tickDec }
  }, [all, hasData, domain, refLine, iw, ih, dec])

  const visible = series.filter((s) => s.pts.length > 0)
  const showLegend = visible.length >= 2

  // Tabla alternativa: unión de fechas, una columna por serie.
  const table = useMemo(() => {
    const times = [...new Set(series.flatMap((s) => s.pts.map((p) => p.t)))].sort((a, b) => b - a)
    return times.map((t) => ({
      t,
      cells: series.map((s) => {
        const p = s.pts.find((q) => q.t === t)
        return p ? num(p.y, dec) + unit : '—'
      }),
    }))
  }, [series, dec, unit])

  function onMove(ev: ReactPointerEvent<SVGSVGElement>) {
    if (!geo) return
    const rect = ev.currentTarget.getBoundingClientRect()
    const px = ((ev.clientX - rect.left) / rect.width) * W
    let best: { p: ChartPoint } | null = null
    let bd = Infinity
    for (const s of series) {
      if (s.dash) continue
      for (const p of s.pts) {
        const d = Math.abs(geo.X(p.t) - px)
        if (d < bd) {
          bd = d
          best = { p }
        }
      }
    }
    if (!best) return
    const { p } = best
    setHover({ t: p.t, y: p.y, text: `${fmtDateLong(p.t)} · ${p.tx ?? num(p.y, dec) + unit}` })
  }

  const tipLeft = hover && geo ? Math.max(70, Math.min(W - 70, geo.X(hover.t))) : 0
  const tipTop = hover && geo ? geo.Y(hover.y) - 12 : 0

  return (
    <div className={cx('chart', className)}>
      <div ref={boxRef} className="chart__box" style={{ minHeight: hasData ? H : undefined }}>
        {!hasData || !geo ? (
          <div className="chart__empty">{empty}</div>
        ) : (
          <>
            <svg
              className="chart__svg"
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              role="img"
              aria-label={aria}
              onPointerMove={onMove}
              onPointerDown={onMove}
              onPointerLeave={() => setHover(null)}
              onPointerCancel={() => setHover(null)}
            >
              {geo.ticks.map((v) => (
                <g key={v}>
                  <line className="chart__grid" x1={M.l} x2={W - M.r} y1={geo.Y(v)} y2={geo.Y(v)} />
                  <text className="chart__txt" x={M.l - 8} y={geo.Y(v) + 4} textAnchor="end">
                    {num(v, geo.tickDec)}
                  </text>
                </g>
              ))}
              {[0, 1, 2, 3].map((i) => {
                const t = geo.x0 + ((geo.x1 - geo.x0) * i) / 3
                return (
                  <text
                    key={i}
                    className="chart__txt"
                    x={geo.X(t)}
                    y={H - 7}
                    textAnchor={i === 0 ? 'start' : i === 3 ? 'end' : 'middle'}
                  >
                    {fmtDate(t)}
                  </text>
                )
              })}

              {refLine && (
                <g className={cx('chart__ref', `chart__ref--${refLine.tone ?? 'warn'}`)}>
                  <line x1={M.l} x2={W - M.r} y1={geo.Y(refLine.y)} y2={geo.Y(refLine.y)} />
                  <text x={W - M.r} y={geo.Y(refLine.y) - 6} textAnchor="end">
                    {refLine.label}
                  </text>
                </g>
              )}

              {series.map((s) => {
                const color = s.color ?? 'var(--ink-2)'
                const path = s.pts
                  .map((p, i) => `${i ? 'L' : 'M'}${geo.X(p.t).toFixed(1)} ${geo.Y(p.y).toFixed(1)}`)
                  .join('')
                const last = s.pts[s.pts.length - 1]
                return (
                  <g key={s.name}>
                    {s.kind === 'line' && s.pts.length > 1 && (
                      <path
                        d={path}
                        className="chart__line"
                        style={{ stroke: color }}
                        strokeDasharray={s.dash ? '6 5' : undefined}
                      />
                    )}
                    {!s.dash &&
                      s.pts.map((p, i) => {
                        const isLast = s.kind === 'line' && i === s.pts.length - 1
                        const r = s.kind === 'dots' ? 4 : isLast ? 5 : s.pts.length > 40 ? 0 : 3
                        if (!r) return null
                        return (
                          <circle
                            key={p.t}
                            className="chart__dot"
                            cx={geo.X(p.t)}
                            cy={geo.Y(p.y)}
                            r={r}
                            style={{ fill: p.c ?? color }}
                          />
                        )
                      })}
                    {s.label && last && (
                      <text
                        className="chart__last"
                        x={Math.min(W - M.r, geo.X(last.t))}
                        y={geo.Y(last.y) - 12}
                        textAnchor="end"
                      >
                        {num(last.y, dec)}
                        {unit}
                      </text>
                    )}
                  </g>
                )
              })}

              {hover && (
                <line className="chart__cross" x1={geo.X(hover.t)} x2={geo.X(hover.t)} y1={M.t} y2={H - M.b} />
              )}
              {hover && <circle className="chart__hit" cx={geo.X(hover.t)} cy={geo.Y(hover.y)} r={6} />}
            </svg>
            {hover && (
              <div className="chart__tip" style={{ left: tipLeft, top: tipTop }} role="status">
                {hover.text}
              </div>
            )}
          </>
        )}
      </div>

      {hasData && showLegend && (
        <ul className="chart__legend" aria-label="Leyenda">
          {visible.map((s) => (
            <li key={s.name}>
              <svg width="26" height="12" viewBox="0 0 26 12" aria-hidden="true">
                {s.kind === 'dots' ? (
                  <circle cx="13" cy="6" r="4" style={{ fill: s.color ?? 'var(--ink-2)' }} />
                ) : (
                  <line
                    x1="1"
                    x2="25"
                    y1="6"
                    y2="6"
                    style={{ stroke: s.color ?? 'var(--ink-2)', strokeWidth: 2.5, strokeLinecap: 'round' }}
                    strokeDasharray={s.dash ? '5 4' : undefined}
                  />
                )}
              </svg>
              {s.name}
            </li>
          ))}
        </ul>
      )}

      {hasData && (
        <details className="chart__data">
          <summary>Ver datos</summary>
          <div className="chart__table-wrap">
            <table aria-describedby={`${id}-cap`}>
              <caption id={`${id}-cap`} className="sr-only">
                {aria}
              </caption>
              <thead>
                <tr>
                  <th scope="col">{tableDateLabel}</th>
                  {series.map((s) => (
                    <th key={s.name} scope="col">
                      {s.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.map((r) => (
                  <tr key={r.t}>
                    <th scope="row">{fmtDateLong(r.t)}</th>
                    {r.cells.map((c, i) => (
                      <td key={i}>{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </div>
  )
}
