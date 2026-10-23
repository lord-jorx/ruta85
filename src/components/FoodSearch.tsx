import { useEffect, useRef, useState } from 'react'
import { fetchByBarcode, forGrams, isValidBarcode, searchProducts } from '../lib/off'
import type { OffProduct } from '../lib/off'
import { Button, NumberField, TextField } from './ui'
import { num } from './format'

/** Tipo mínimo de la API del navegador (no está en lib.dom de TypeScript). */
interface DetectedBarcode {
  rawValue: string
}
interface BarcodeDetectorLike {
  detect(source: HTMLVideoElement): Promise<DetectedBarcode[]>
}
declare global {
  interface Window {
    BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike
  }
}

const FORMATS = ['ean_13', 'ean_8', 'upc_a', 'upc_e']
const SCAN_EVERY_MS = 300

export interface FoodPick {
  label: string
  kcal: number
  protein_g: number
}

interface Props {
  /** Se llama al elegir un producto y cada vez que cambian los gramos. */
  onPick: (food: FoodPick) => void
}

type Notice = { kind: 'loading' | 'empty' | 'error' | 'info'; text: string } | null

const isAbort = (e: unknown) => e instanceof DOMException && e.name === 'AbortError'
const errText = (e: unknown) => (e instanceof Error ? e.message : 'Algo ha fallado. Inténtalo de nuevo.')

function useOnline(): boolean {
  const [online, setOnline] = useState(() => navigator.onLine !== false)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  return online
}

/**
 * Búsqueda de alimentos en Open Food Facts (texto, código a mano o cámara).
 * Solo rellena el formulario de comida a través de `onPick`; no guarda nada.
 * Debe montarse solo mientras la hoja está abierta: al desmontar se apaga la cámara.
 */
export function FoodSearch({ onPick }: Props) {
  const online = useOnline()
  const canScan = typeof window !== 'undefined' && 'BarcodeDetector' in window

  const [query, setQuery] = useState('')
  const [code, setCode] = useState('')
  const [results, setResults] = useState<OffProduct[]>([])
  const [selected, setSelected] = useState<OffProduct | null>(null)
  const [grams, setGrams] = useState<number | null>(null)
  const [notice, setNotice] = useState<Notice>(null)
  const [scanning, setScanning] = useState(false)

  const videoRef = useRef<HTMLVideoElement>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lookupRef = useRef<(c: string) => void>(() => undefined)

  const loading = notice?.kind === 'loading'

  // Al desmontar (cerrar la hoja) se cancela cualquier petición en curso.
  useEffect(() => () => abortRef.current?.abort(), [])

  function begin(text: string): AbortSignal {
    abortRef.current?.abort()
    const ac = new AbortController()
    abortRef.current = ac
    setNotice({ kind: 'loading', text })
    return ac.signal
  }

  function choose(p: OffProduct) {
    const g = p.servingG ?? 100
    setSelected(p)
    setGrams(g)
    onPick(forGrams(p, g))
  }

  function changeGrams(g: number | null) {
    setGrams(g)
    if (selected && g != null && g > 0) onPick(forGrams(selected, g))
  }

  async function search() {
    const q = query.trim()
    if (!q || loading) return
    if (!online) {
      setNotice({ kind: 'error', text: 'Sin conexión. Conéctate a internet para buscar.' })
      return
    }
    const signal = begin('Buscando…')
    setSelected(null)
    setResults([])
    try {
      const found = await searchProducts(q, signal)
      setResults(found)
      setNotice(
        found.length
          ? { kind: 'info', text: `${found.length} ${found.length === 1 ? 'resultado' : 'resultados'}. Elige uno.` }
          : { kind: 'empty', text: 'Sin resultados. Prueba con otras palabras o rellena la comida a mano.' },
      )
    } catch (e) {
      if (!isAbort(e)) setNotice({ kind: 'error', text: errText(e) })
    }
  }

  async function lookup(raw: string) {
    const c = raw.trim()
    if (loading) return
    if (!isValidBarcode(c)) {
      setNotice({ kind: 'error', text: 'El código debe tener entre 8 y 14 dígitos.' })
      return
    }
    if (!online) {
      setNotice({ kind: 'error', text: 'Sin conexión. Conéctate a internet para buscar.' })
      return
    }
    const signal = begin('Buscando código…')
    setSelected(null)
    setResults([])
    try {
      const p = await fetchByBarcode(c, signal)
      if (!p) {
        setNotice({
          kind: 'empty',
          text: `Open Food Facts no tiene datos útiles del código ${c}. Rellena la comida a mano.`,
        })
        return
      }
      setCode(c)
      setNotice({ kind: 'info', text: 'Producto encontrado.' })
      choose(p)
    } catch (e) {
      if (!isAbort(e)) setNotice({ kind: 'error', text: errText(e) })
    }
  }

  useEffect(() => {
    lookupRef.current = (c) => void lookup(c)
  })

  // Cámara: se abre al pasar a `scanning` y se apaga siempre en la limpieza del efecto.
  useEffect(() => {
    if (!scanning) return
    let cancelled = false
    let stream: MediaStream | null = null
    let timer: number | undefined

    function stop() {
      cancelled = true
      if (timer != null) window.clearInterval(timer)
      stream?.getTracks().forEach((t) => t.stop())
      if (videoRef.current) videoRef.current.srcObject = null
    }

    void (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia || !window.BarcodeDetector) {
          throw new Error('Este navegador no permite escanear. Escribe el código a mano.')
        }
        const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false })
        if (cancelled) {
          s.getTracks().forEach((t) => t.stop())
          return
        }
        stream = s
        const video = videoRef.current
        if (!video) return
        video.srcObject = s
        await video.play()
        const detector = new window.BarcodeDetector({ formats: FORMATS })
        let busy = false
        timer = window.setInterval(() => {
          if (busy || cancelled) return
          busy = true
          detector
            .detect(video)
            .then((found) => {
              const hit = found.find((f) => isValidBarcode(f.rawValue))
              if (hit && !cancelled) {
                setScanning(false)
                lookupRef.current(hit.rawValue)
              }
            })
            .catch(() => undefined)
            .finally(() => {
              busy = false
            })
        }, SCAN_EVERY_MS)
      } catch (e) {
        if (cancelled) return
        const name = e instanceof DOMException ? e.name : ''
        const text =
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'Sin permiso para usar la cámara. Actívalo en el navegador o escribe el código a mano.'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? 'No se ha encontrado ninguna cámara. Escribe el código a mano.'
              : errText(e)
        setNotice({ kind: 'error', text })
        setScanning(false)
      }
    })()

    return stop
  }, [scanning])

  const preview = selected && grams != null && grams > 0 ? forGrams(selected, grams) : null

  return (
    <div className="fs stack-sm">
      {!online && (
        <p className="fs__offline small" role="status">
          Sin conexión: la búsqueda no está disponible. Puedes rellenar la comida a mano.
        </p>
      )}

      <form
        className="fs__row"
        role="search"
        onSubmit={(e) => {
          e.preventDefault()
          void search()
        }}
      >
        <TextField
          label="Buscar alimento"
          value={query}
          onChange={setQuery}
          placeholder="Yogur griego"
          type="search"
          enterKeyHint="search"
          autoComplete="off"
        />
        <Button type="submit" variant="primary" icon="buscar" disabled={!query.trim() || loading || !online}>
          Buscar
        </Button>
      </form>

      <form
        className="fs__row"
        onSubmit={(e) => {
          e.preventDefault()
          void lookup(code)
        }}
      >
        <TextField
          label="Código de barras"
          value={code}
          onChange={(v) => setCode(v.replace(/\D/g, ''))}
          placeholder="8480000610317"
          inputMode="numeric"
          enterKeyHint="search"
          autoComplete="off"
          maxLength={14}
        />
        <Button type="submit" disabled={!isValidBarcode(code) || loading || !online}>
          Buscar
        </Button>
      </form>

      {canScan && !scanning && (
        <Button icon="camara" block onClick={() => setScanning(true)} disabled={loading || !online}>
          Escanear
        </Button>
      )}

      {scanning && (
        <div className="fs__scan">
          <video ref={videoRef} className="fs__video" muted playsInline aria-label="Vista de la cámara" />
          <p className="small muted">Apunta al código de barras del envase.</p>
          <Button block onClick={() => setScanning(false)}>
            Cancelar escaneo
          </Button>
        </div>
      )}

      <p
        className={`fs__notice small${notice?.kind === 'error' ? ' fs__notice--error' : ' muted'}`}
        role={notice?.kind === 'error' ? 'alert' : 'status'}
        aria-live="polite"
      >
        {notice?.text}
      </p>

      {selected ? (
        <div className="fs__picked">
          <p className="fs__name">{selected.name}</p>
          {selected.brand && selected.brand.toLowerCase() !== selected.name.toLowerCase() && (
            <p className="small muted">{selected.brand}</p>
          )}
          <p className="small muted">
            Por 100 g: {num(Math.round(selected.kcal100))} kcal · {num(selected.protein100, 1)} g de proteína
          </p>
          <NumberField
            key={selected.code + selected.name}
            label="Gramos"
            unit="g"
            value={grams}
            onChange={changeGrams}
            step={10}
            min={1}
            max={2000}
            hint={selected.servingG ? `Ración indicada: ${num(selected.servingG, selected.servingG % 1 ? 1 : 0)} g` : undefined}
          />
          {preview && (
            <p className="small">
              Rellenado: {preview.label} · {num(preview.kcal)} kcal · {num(preview.protein_g, 1)} g de proteína
            </p>
          )}
          {results.length > 1 && (
            <Button onClick={() => setSelected(null)}>Elegir otro</Button>
          )}
        </div>
      ) : (
        results.length > 0 && (
          <ul className="fs__list">
            {results.map((p, i) => (
              <li key={`${p.code}-${i}`}>
                <button type="button" className="fs__item" onClick={() => choose(p)}>
                  <span className="fs__name">{p.name}</span>
                  {p.brand && <span className="small muted">{p.brand}</span>}
                  <span className="small muted">
                    {num(Math.round(p.kcal100))} kcal · {num(p.protein100, 1)} g prot. por 100 g
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}

      <p className="fs__credit small muted">
        Datos de{' '}
        <a href="https://world.openfoodfacts.org" target="_blank" rel="noreferrer noopener">
          Open Food Facts
        </a>{' '}
        (ODbL)
      </p>
    </div>
  )
}
