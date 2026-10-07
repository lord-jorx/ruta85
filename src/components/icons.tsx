import type { ReactNode, SVGProps } from 'react'

// Iconos propios (24×24, trazo 2, extremos redondeados). Decorativos: aria-hidden.
// Cada uno es un conjunto de trazos; no hay librería de iconos.

const PATHS = {
  hoy: (
    <>
      <circle cx="12" cy="13.5" r="7.5" />
      <path d="M12 9.5v4l2.8 1.8M9.5 3h5" />
    </>
  ),
  entreno: <path d="M6.5 7.5v9M3.5 10v4M17.5 7.5v9M20.5 10v4M6.5 12h11" />,
  cuerpo: (
    <>
      <rect x="2.5" y="8" width="19" height="8.5" rx="1.5" />
      <path d="M7 8v3.2M11 8v4.6M15 8v3.2M19 8v4.6" />
    </>
  ),
  dieta: (
    <>
      <path d="M3.5 11.5h17a8.5 8.5 0 0 1-17 0z" />
      <path d="M8.5 7.5c0-2 2-2 2-4M13.5 7.5c0-2 2-2 2-4" />
    </>
  ),
  guia: (
    <>
      <path d="M3.5 5h6a2.5 2.5 0 0 1 2.5 2.5V20a2.5 2.5 0 0 0-2.5-2.5h-6zM20.5 5h-6A2.5 2.5 0 0 0 12 7.5V20a2.5 2.5 0 0 1 2.5-2.5h6z" />
    </>
  ),
  ajustes: (
    <>
      <path d="M4 7h9M19 7h1M4 17h1M11 17h9" />
      <circle cx="16" cy="7" r="2.6" />
      <circle cx="8" cy="17" r="2.6" />
    </>
  ),
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  ok: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M7.8 12.4l3 3 5.4-6" />
    </>
  ),
  warn: (
    <>
      <path d="M12 3.5l9.5 16.5h-19z" />
      <path d="M12 10v4.5M12 17.4v.2" />
    </>
  ),
  crit: (
    <>
      <path d="M8.2 3h7.6L21 8.2v7.6L15.8 21H8.2L3 15.8V8.2z" />
      <path d="M12 7.5v5.5M12 16v.2" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  ruta: (
    <>
      <circle cx="6" cy="18" r="2.2" />
      <circle cx="18" cy="6" r="2.2" />
      <path d="M8.2 18H15a3.2 3.2 0 0 0 0-6.4H9a3.2 3.2 0 0 1 0-6.4h6.8" />
    </>
  ),
  guardia: <path d="M20 14.6A8.4 8.4 0 1 1 9.4 4 6.6 6.6 0 0 0 20 14.6z" />,
  peso: (
    <>
      <path d="M5.5 4h13l2 16h-17z" />
      <path d="M9 9.5a3 3 0 0 1 6 0M12 9.5l1.6-2" />
    </>
  ),
  rodilla: <path d="M3 12h4l2.2-5.5 4 11 2.3-5.5H21" />,
  chevron: <path d="M6 9l6 6 6-6" />,
  atras: <path d="M15 5l-7 7 7 7" />,
  flecha: <path d="M5 12h14M13 6l6 6-6 6" />,
  descargar: <path d="M12 4v11M7 11l5 5 5-5M5 20h14" />,
  subir: <path d="M12 16V5M7 9l5-5 5 5M5 20h14" />,
  nube: <path d="M7.5 18.5a4.5 4.5 0 0 1-.7-8.9 6 6 0 0 1 11.4 1.4 3.8 3.8 0 0 1-.9 7.5z" />,
  mail: (
    <>
      <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </>
  ),
  bandera: <path d="M5.5 21V3.5M5.5 4h12l-2.5 4 2.5 4h-12" />,
  reloj: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  llama: <path d="M12 3c1 3.5 5.5 5.5 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2 1-3.4 2.2-4.5.2 1.6 1 2.4 1.8 2.8C10 9 10.5 5.5 12 3z" />,
  estrella: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z" />,
} satisfies Record<string, ReactNode>

export type IconName = keyof typeof PATHS

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 22, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  )
}
