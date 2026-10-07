import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { Icon } from './icons'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  /** Acciones fijas abajo (Guardar, Cancelar…). */
  footer?: ReactNode
  /** Si es un formulario, pasa su `id` para enviar con Enter. */
  description?: string
}

/**
 * Panel inferior modal para formularios rápidos. Usa <dialog>: el navegador
 * gestiona el foco, Escape y deja inerte el resto de la página.
 */
export function Sheet({ open, onClose, title, children, footer, description }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descId = useId()

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby={titleId}
      aria-describedby={description ? descId : undefined}
      onClose={onClose}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        // Un clic sobre el propio <dialog> (no su contenido) es un clic en el fondo.
        if (e.target === ref.current) onClose()
      }}
    >
      <div className="sheet__panel">
        <div className="sheet__grab" aria-hidden="true" />
        <header className="sheet__head">
          <h2 id={titleId} className="h-section">
            {title}
          </h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Cerrar">
            <Icon name="plus" size={22} style={{ transform: 'rotate(45deg)' }} />
          </button>
        </header>
        {description && (
          <p id={descId} className="sheet__desc muted small">
            {description}
          </p>
        )}
        <div className="sheet__body">{children}</div>
        {footer && <footer className="sheet__foot">{footer}</footer>}
      </div>
    </dialog>
  )
}
