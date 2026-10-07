// Tema de la interfaz: oscuro por defecto, claro opcional, o el del sistema.
// Se guarda en localStorage (puede fallar en ventanas privadas: siempre con try/catch).

export type ThemeChoice = 'dark' | 'light' | 'system'

const KEY = 'ruta85.theme'
const BG: Record<'dark' | 'light', string> = { dark: '#151719', light: '#f2f0ea' }

export function getTheme(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'dark' || v === 'light' || v === 'system') return v
  } catch {
    /* sin almacenamiento: se usa el valor por defecto */
  }
  return 'dark'
}

export function applyTheme(choice: ThemeChoice): void {
  const root = document.documentElement
  if (choice === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', choice)

  const dark =
    choice === 'dark' ||
    (choice === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', dark ? BG.dark : BG.light)
}

export function setTheme(choice: ThemeChoice): void {
  try {
    localStorage.setItem(KEY, choice)
  } catch {
    /* ignorar */
  }
  applyTheme(choice)
}
