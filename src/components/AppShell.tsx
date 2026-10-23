import { Link, NavLink, Outlet, ScrollRestoration, useMatches } from 'react-router-dom'
import { Icon } from './icons'
import type { IconName } from './icons'

/** Datos que cada ruta declara en `handle` para la cabecera. */
export interface RouteHandle {
  title: string | ((params: Record<string, string | undefined>) => string)
  /** Si existe, la cabecera muestra una flecha "atrás" hacia esa ruta. */
  back?: string
  /** Texto pequeño sobre el título. */
  kicker?: string
}

const TABS: ReadonlyArray<{ to: string; label: string; icon: IconName; end?: boolean }> = [
  { to: '/', label: 'Hoy', icon: 'hoy', end: true },
  { to: '/entreno', label: 'Entreno', icon: 'entreno' },
  { to: '/cuerpo', label: 'Cuerpo', icon: 'cuerpo' },
  { to: '/dieta', label: 'Dieta', icon: 'dieta' },
  { to: '/guia', label: 'Guía', icon: 'guia' },
]

export function AppShell() {
  const matches = useMatches()
  const last = matches[matches.length - 1]
  const handle = (last?.handle ?? { title: 'Cota' }) as RouteHandle
  const title = typeof handle.title === 'function' ? handle.title(last.params) : handle.title

  return (
    <div className="app">
      <a className="skip" href="#contenido">
        Saltar al contenido
      </a>
      <header className="app__header">
        <div className="app__header-inner">
          {handle.back && (
            <Link to={handle.back} className="icon-btn" aria-label="Volver">
              <Icon name="atras" />
            </Link>
          )}
          <div className="app__heading grow">
            <p className="app__kicker eyebrow">{handle.kicker ?? 'Cota'}</p>
            <h1 className="app__title display">{title}</h1>
          </div>
          <NavLink to="/ajustes" className="icon-btn" aria-label="Ajustes">
            <Icon name="ajustes" />
          </NavLink>
        </div>
      </header>

      <main id="contenido" className="app__main" tabIndex={-1}>
        <Outlet />
      </main>

      <nav className="tabbar" aria-label="Secciones">
        <div className="tabbar__inner">
          {TABS.map((t) => (
            <NavLink key={t.to} to={t.to} end={t.end} className="tab">
              <Icon name={t.icon} size={24} />
              <span>{t.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
      <ScrollRestoration />
    </div>
  )
}
