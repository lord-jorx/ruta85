import { useState } from 'react'
import type { ChangeEvent } from 'react'
import { Button, Card, EmptyState, Icon, NumberField, Segmented, TextField, getTheme, setTheme, useToast } from '../components'
import type { ThemeChoice } from '../components'
import { bodyweightCsv, isISODate, parseGarminCsv, parseOpenGymBackup, sha256Hex, todayISO } from '../lib'
import {
  cloudConfigured,
  exportAll,
  importAll,
  importGarminActivities,
  importOpenGym,
  saveSettings,
  signInWithEmail,
  signOut,
  syncNow,
  useAuth,
  useBodyLogs,
  useImports,
  useSettings,
  useSyncStatus,
  verifyEmailCode,
} from '../db'
import type { ImportOpenGymResult, SettingsPatch } from '../db'
import '../styles/screens-today-body-settings.css'

const THEMES: ReadonlyArray<{ value: ThemeChoice; label: string }> = [
  { value: 'dark', label: 'Oscuro' },
  { value: 'light', label: 'Claro' },
  { value: 'system', label: 'Sistema' },
]

const EMAIL_RE = /^\S+@\S+\.\S+$/

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Error desconocido'
}

/** Descarga un texto como archivo desde el navegador. */
function download(filename: string, text: string, mime: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function fmtDateTime(iso: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('es-ES', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

/** Botón que abre el selector de archivos (el input real queda accesible y enfocable). */
function FileButton({
  label,
  accept,
  onFile,
  disabled,
}: {
  label: string
  accept: string
  onFile: (f: File) => void
  disabled?: boolean
}) {
  function change(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (f) onFile(f)
    e.target.value = ''
  }
  return (
    <label className="btn btn--ghost btn--block file-btn" aria-disabled={disabled || undefined}>
      <input type="file" accept={accept} onChange={change} disabled={disabled} />
      <Icon name="subir" size={20} />
      <span>{label}</span>
    </label>
  )
}

interface Draft {
  goal_weight?: number | null
  height_cm?: number | null
  start_date?: string
  goal_date?: string
  protein_min?: number | null
  protein_max?: number | null
  deficit_kcal?: number | null
  kcal_maintenance_manual?: number | null
}

type ImportOutcome =
  | { kind: 'ok'; filename: string; result: Extract<ImportOpenGymResult, { skipped: false }> }
  | { kind: 'skipped'; filename: string }
  | { kind: 'error'; filename: string; message: string }

type GarminOutcome =
  | { kind: 'ok'; filename: string; added: number; duplicates: number; skipped: number; warnings: string[] }
  | { kind: 'error'; filename: string; message: string }

/** Límite de los archivos que se importan (una copia real de OpenGym pesa decenas de KB). */
const MAX_FILE_BYTES = 20 * 1024 * 1024

export function Settings() {
  const toast = useToast()
  const settings = useSettings()
  const logs = useBodyLogs()
  const imports = useImports()
  const auth = useAuth()
  const sync = useSyncStatus()

  const [theme, setThemeState] = useState<ThemeChoice>(getTheme)
  const [draft, setDraft] = useState<Draft>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null)
  const [garmin, setGarmin] = useState<GarminOutcome | null>(null)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [linkSent, setLinkSent] = useState(false)

  // Valor mostrado: el borrador si se ha tocado el campo; si no, lo guardado.
  function numVal(k: 'goal_weight' | 'height_cm' | 'protein_min' | 'protein_max' | 'deficit_kcal' | 'kcal_maintenance_manual'): number | null {
    return k in draft ? (draft[k] ?? null) : (settings[k] ?? null)
  }
  function dateVal(k: 'start_date' | 'goal_date'): string {
    return draft[k] ?? settings[k]
  }
  const setField = (k: keyof Draft) => (v: number | string | null) => setDraft((d) => ({ ...d, [k]: v }))

  const goal = numVal('goal_weight')
  const height = numVal('height_cm')
  const startDate = dateVal('start_date')
  const goalDate = dateVal('goal_date')
  const proteinMin = numVal('protein_min')
  const proteinMax = numVal('protein_max')
  const deficit = numVal('deficit_kcal')
  const maintenance = numVal('kcal_maintenance_manual')
  const dirty = Object.keys(draft).length > 0

  function validate(): { patch?: SettingsPatch; error?: string } {
    if (goal == null || goal < 40 || goal > 200) return { error: 'El peso objetivo debe estar entre 40 y 200 kg.' }
    if (height == null || height < 120 || height > 230) return { error: 'La altura debe estar entre 120 y 230 cm.' }
    if (!isISODate(startDate) || !isISODate(goalDate)) return { error: 'Las fechas no son válidas.' }
    if (goalDate <= startDate) return { error: 'La fecha objetivo debe ser posterior a la de inicio.' }
    if (proteinMin == null || proteinMax == null || proteinMin <= 0 || proteinMax < proteinMin) {
      return { error: 'La proteína máxima debe ser igual o mayor que la mínima.' }
    }
    if (deficit == null || deficit < 0 || deficit > 1500) return { error: 'El déficit debe estar entre 0 y 1500 kcal.' }
    if (maintenance != null && (maintenance < 1200 || maintenance > 6000)) {
      return { error: 'El mantenimiento manual debe estar entre 1200 y 6000 kcal (o vacío para usar el estimado).' }
    }
    return {
      patch: {
        goal_weight: goal,
        height_cm: height,
        start_date: startDate,
        goal_date: goalDate,
        protein_min: proteinMin,
        protein_max: proteinMax,
        deficit_kcal: deficit,
        kcal_maintenance_manual: maintenance,
      },
    }
  }

  async function guarded(key: string, fn: () => Promise<void>): Promise<void> {
    if (busy) return
    setBusy(key)
    try {
      await fn()
    } catch (e) {
      toast.show(errMsg(e), 'error')
    } finally {
      setBusy(null)
    }
  }

  async function saveGoals() {
    const { patch, error } = validate()
    if (!patch) {
      toast.show(error ?? 'Revisa los datos', 'error')
      return
    }
    await guarded('goals', async () => {
      await saveSettings(patch)
      setDraft({})
      toast.show('Objetivos guardados', 'ok')
    })
  }

  async function importBackup(file: File) {
    await guarded('opengym', async () => {
      try {
        if (file.size > MAX_FILE_BYTES) throw new Error('Archivo demasiado grande (máx. 20 MB).')
        const text = await file.text()
        const fileHash = await sha256Hex(text)
        let json: unknown
        try {
          json = JSON.parse(text)
        } catch {
          throw new Error('El archivo no es un JSON válido.')
        }
        const parsed = parseOpenGymBackup(json)
        const result = await importOpenGym(parsed, { filename: file.name, fileHash })
        if (result.skipped) {
          setOutcome({ kind: 'skipped', filename: file.name })
          toast.show('Esa copia ya estaba importada')
        } else {
          setOutcome({ kind: 'ok', filename: file.name, result })
          const c = result.counts
          toast.show(`Importado: ${c.sessions} sesiones, ${c.sets} series, ${c.bodyweights} pesadas`, 'ok')
        }
      } catch (e) {
        setOutcome({ kind: 'error', filename: file.name, message: errMsg(e) })
        throw e
      }
    })
  }

  async function importGarmin(file: File) {
    await guarded('garmin', async () => {
      try {
        if (file.size > MAX_FILE_BYTES) throw new Error('Archivo demasiado grande (máx. 20 MB).')
        const parsed = parseGarminCsv(await file.text())
        const { added, duplicates } = await importGarminActivities(parsed.activities)
        setGarmin({ kind: 'ok', filename: file.name, added, duplicates, skipped: parsed.skipped, warnings: parsed.warnings })
        toast.show(`${added} actividades añadidas, ${duplicates} repetidas, ${parsed.skipped} omitidas`, 'ok')
      } catch (e) {
        setGarmin({ kind: 'error', filename: file.name, message: errMsg(e) })
        throw e
      }
    })
  }

  function exportWeightCsv() {
    const withWeight = logs.filter((l) => l.weight != null)
    if (withWeight.length === 0) {
      toast.show('Aún no hay pesadas que exportar', 'error')
      return
    }
    download(`ruta85-peso-${todayISO()}.csv`, bodyweightCsv(logs), 'text/csv;charset=utf-8')
    toast.show(`${withWeight.length} pesadas exportadas`, 'ok')
  }

  async function exportEverything() {
    await guarded('export', async () => {
      const file = await exportAll()
      download(`ruta85-copia-${todayISO()}.json`, JSON.stringify(file, null, 2), 'application/json')
      toast.show('Copia completa descargada', 'ok')
    })
  }

  async function importEverything(file: File) {
    await guarded('importAll', async () => {
      if (file.size > MAX_FILE_BYTES) throw new Error('Archivo demasiado grande (máx. 20 MB).')
      let json: unknown
      try {
        json = JSON.parse(await file.text())
      } catch {
        throw new Error('El archivo no es un JSON válido.')
      }
      const applied = await importAll(json)
      const total = Object.values(applied).reduce((s, n) => s + (n ?? 0), 0)
      toast.show(total > 0 ? `Copia importada: ${total} registros aplicados` : 'La copia no traía nada más reciente', 'ok')
    })
  }

  async function sendLink() {
    await guarded('link', async () => {
      await signInWithEmail(email)
      setLinkSent(true)
      toast.show('Enlace enviado. Revisa tu correo.', 'ok')
    })
  }

  async function enterWithCode() {
    await guarded('code', async () => {
      await verifyEmailCode(email, code)
      setCode('')
      setLinkSent(false)
      toast.show('Sesión iniciada', 'ok')
    })
  }

  async function logout() {
    await guarded('logout', async () => {
      await signOut()
      toast.show('Sesión cerrada. Tus datos siguen en este dispositivo.')
    })
  }

  async function syncAgain() {
    await guarded('sync', async () => {
      const st = await syncNow()
      if (st.error) toast.show(st.error, 'error')
      else toast.show('Sincronizado', 'ok')
    })
  }

  const emailOk = EMAIL_RE.test(email.trim())

  return (
    <div className="stack">
      <Card label="Aspecto">
        <Segmented
          label="Tema"
          options={THEMES}
          value={theme}
          onChange={(v) => {
            setThemeState(v)
            setTheme(v)
          }}
        />
      </Card>

      <Card label="Objetivos y perfil">
        <div className="stack">
          <div className="grid-2">
            <NumberField label="Peso objetivo" unit="kg" value={goal} onChange={setField('goal_weight')} step={0.5} min={40} max={200} />
            <NumberField label="Altura" unit="cm" value={height} onChange={setField('height_cm')} step={1} min={120} max={230} />
          </div>
          <TextField
            label="Fecha de inicio"
            type="date"
            value={startDate}
            onChange={setField('start_date')}
            hint="Lunes de la semana 1 del plan."
          />
          <TextField label="Fecha objetivo" type="date" value={goalDate} onChange={setField('goal_date')} />
          <div className="grid-2">
            <NumberField label="Proteína mín." unit="g" value={proteinMin} onChange={setField('protein_min')} step={5} min={50} max={400} />
            <NumberField label="Proteína máx." unit="g" value={proteinMax} onChange={setField('protein_max')} step={5} min={50} max={400} />
          </div>
          <div className="grid-2">
            <NumberField label="Déficit" unit="kcal" value={deficit} onChange={setField('deficit_kcal')} step={50} min={0} max={1500} />
            <NumberField
              label="Mantenimiento manual"
              unit="kcal"
              value={maintenance}
              onChange={setField('kcal_maintenance_manual')}
              step={50}
              min={1200}
              max={6000}
              hint="Vacío: se usa el estimado."
            />
          </div>
          <Button variant="primary" block onClick={saveGoals} disabled={!dirty || busy !== null}>
            Guardar objetivos
          </Button>
        </div>
      </Card>

      <Card label="OpenGym">
        <div className="stack-sm">
          <p className="muted small">
            Importa tu copia de seguridad (JSON) para traer sesiones, series y pesadas. Si repites la misma copia no se
            duplica nada.
          </p>
          <FileButton
            label={busy === 'opengym' ? 'Importando…' : 'Importar copia de OpenGym'}
            accept=".json,application/json"
            onFile={importBackup}
            disabled={busy !== null}
          />
          <Button block icon="descargar" onClick={exportWeightCsv}>
            Exportar peso para OpenGym (CSV)
          </Button>

          {outcome?.kind === 'ok' && (
            <div className="tbs-result" role="status">
              <b>Importada {outcome.filename}</b>
              <div className="small">
                {outcome.result.counts.sessions} sesiones · {outcome.result.counts.sets} series ·{' '}
                {outcome.result.counts.bodyweights} pesadas nuevas
                {outcome.result.counts.skippedBodyweights > 0 &&
                  ` (${outcome.result.counts.skippedBodyweights} ya existían o se ignoraron)`}
              </div>
              {outcome.result.warnings.length > 0 && (
                <>
                  <div className="small">Avisos ({outcome.result.warnings.length}):</div>
                  <ul>
                    {outcome.result.warnings.slice(0, 8).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {outcome.result.warnings.length > 8 && <li>… y {outcome.result.warnings.length - 8} más</li>}
                  </ul>
                </>
              )}
            </div>
          )}
          {outcome?.kind === 'skipped' && (
            <p className="notice notice--ok" role="status">
              <Icon name="ok" size={20} />
              Esa copia ({outcome.filename}) ya estaba importada: no se ha cambiado nada.
            </p>
          )}
          {outcome?.kind === 'error' && (
            <p className="notice notice--warn" role="alert">
              <Icon name="warn" size={20} />
              No se pudo importar {outcome.filename}: {outcome.message}
            </p>
          )}

          <h3 className="eyebrow">Importaciones anteriores</h3>
          {imports.length === 0 ? (
            <EmptyState icon="subir" title="Aún no has importado ninguna copia" />
          ) : (
            <ul className="tbs-imports">
              {imports.map((r) => (
                <li key={r.id}>
                  <span className="tbs-imports__name">{r.filename}</span>
                  <span className="muted">
                    {fmtDateTime(r.imported_at)} · {r.counts.sessions ?? 0} sesiones · {r.counts.sets ?? 0} series ·{' '}
                    {r.counts.bodyweights ?? 0} pesadas
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>

      <Card label="Garmin">
        <div className="stack-sm">
          <p className="muted small">
            Garmin Connect web → Actividades → Exportar CSV. Se importan caminar, correr, bici, elíptica y otras; la fuerza
            se omite porque el gimnasio ya viene de OpenGym. Si repites el mismo archivo no se duplica nada.
          </p>
          <FileButton
            label={busy === 'garmin' ? 'Importando…' : 'Importar actividades de Garmin (CSV)'}
            accept=".csv,text/csv"
            onFile={importGarmin}
            disabled={busy !== null}
          />
          {garmin?.kind === 'ok' && (
            <div className="tbs-result" role="status">
              <b>Importado {garmin.filename}</b>
              <div className="small">
                {garmin.added} actividades añadidas, {garmin.duplicates} repetidas, {garmin.skipped} omitidas (fuerza u otras)
              </div>
              {garmin.warnings.length > 0 && (
                <>
                  <div className="small">Avisos ({garmin.warnings.length}):</div>
                  <ul>
                    {garmin.warnings.slice(0, 8).map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                    {garmin.warnings.length > 8 && <li>… y {garmin.warnings.length - 8} más</li>}
                  </ul>
                </>
              )}
            </div>
          )}
          {garmin?.kind === 'error' && (
            <p className="notice notice--warn" role="alert">
              <Icon name="warn" size={20} />
              No se pudo importar {garmin.filename}: {garmin.message}
            </p>
          )}
        </div>
      </Card>

      <Card label="Tus datos">
        <div className="stack-sm">
          <Button block icon="descargar" onClick={exportWeightCsv}>
            Exportar peso (CSV)
          </Button>
          <Button block icon="descargar" onClick={exportEverything} disabled={busy !== null}>
            Exportar todo (JSON)
          </Button>
          <FileButton
            label="Importar todo (JSON)"
            accept=".json,application/json"
            onFile={importEverything}
            disabled={busy !== null}
          />
          <p className="muted small">
            La importación fusiona: nunca borra lo que tienes salvo que la copia traiga una versión más reciente.
          </p>
        </div>
      </Card>

      <Card label="Cuenta y sincronización">
        <div className="stack">
          {!cloudConfigured ? (
            <p className="notice notice--warn" role="note">
              <Icon name="nube" size={20} />
              <span>
                <b>Modo solo local.</b> Esta versión no tiene la nube configurada: todo se guarda en este dispositivo.
                Usa «Exportar todo» para hacer copias.
              </span>
            </p>
          ) : !auth.ready ? (
            <p className="muted">Comprobando sesión…</p>
          ) : auth.user ? (
            <>
              <dl className="kv">
                <div>
                  <dt>Sesión</dt>
                  <dd>{auth.user.email ?? 'Sin correo'}</dd>
                </div>
                <div>
                  <dt>Estado</dt>
                  <dd>
                    <span className={sync.error ? 'pill pill--warn' : 'pill pill--ok'}>
                      <Icon name="nube" size={14} />
                      {sync.syncing
                        ? 'Sincronizando…'
                        : sync.error
                          ? 'Error al sincronizar'
                          : !sync.online
                            ? 'Sin conexión'
                            : sync.pending > 0
                              ? 'Cambios pendientes'
                              : 'Sincronizado'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Pendientes</dt>
                  <dd>{sync.pending}</dd>
                </div>
                <div>
                  <dt>Última sincronización</dt>
                  <dd>{fmtDateTime(sync.lastSyncAt)}</dd>
                </div>
              </dl>
              {sync.error && (
                <p className="notice notice--warn" role="alert">
                  <Icon name="warn" size={20} />
                  {sync.error}
                </p>
              )}
              <Button variant="primary" block icon="nube" onClick={syncAgain} disabled={busy !== null || sync.syncing}>
                {sync.syncing || busy === 'sync' ? 'Sincronizando…' : 'Sincronizar ahora'}
              </Button>
              <Button block onClick={logout} disabled={busy !== null}>
                Cerrar sesión
              </Button>
            </>
          ) : (
            <>
              <p className="muted small">Sin sesión: tus datos están solo en este dispositivo. Entra para sincronizarlos.</p>
              <TextField
                label="Correo"
                type="email"
                inputMode="email"
                autoComplete="email"
                value={email}
                onChange={setEmail}
                placeholder="tu@correo.com"
                hint="Te enviamos un enlace y un código de 6 cifras para entrar, sin contraseña."
              />
              <Button variant="primary" block icon="mail" disabled={!emailOk || busy !== null} onClick={sendLink}>
                {linkSent ? 'Reenviar enlace y código' : 'Enviarme el enlace'}
              </Button>
              <TextField
                label="Código del correo"
                inputMode="numeric"
                autoComplete="one-time-code"
                className="tbs-code-input"
                value={code}
                onChange={(v) => setCode(v.replace(/\D/g, '').slice(0, 8))}
                placeholder="123456"
                hint="Útil en la app instalada: escribe aquí el código en lugar de abrir el enlace."
              />
              <Button block disabled={!emailOk || code.length < 6 || busy !== null} onClick={enterWithCode}>
                Entrar con el código
              </Button>
            </>
          )}
        </div>
      </Card>

      <p className="muted small">Ruta 85 · funciona sin conexión. Los datos se guardan primero en este dispositivo.</p>
    </div>
  )
}
