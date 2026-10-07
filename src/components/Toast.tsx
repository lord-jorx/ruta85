import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

type ToastTone = 'info' | 'ok' | 'error'
interface ToastApi {
  show: (message: string, tone?: ToastTone) => void
}

const ToastContext = createContext<ToastApi>({ show: () => {} })

/** Muestra un aviso breve: `const toast = useToast(); toast.show('Guardado')`. */
export function useToast(): ToastApi {
  return useContext(ToastContext)
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<{ id: number; text: string; tone: ToastTone } | null>(null)
  const timer = useRef<number | undefined>(undefined)
  const seq = useRef(0)

  const show = useCallback((text: string, tone: ToastTone = 'info') => {
    window.clearTimeout(timer.current)
    seq.current += 1
    setMsg({ id: seq.current, text, tone })
    timer.current = window.setTimeout(() => setMsg(null), tone === 'error' ? 5000 : 2800)
  }, [])

  useEffect(() => () => window.clearTimeout(timer.current), [])

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
        {msg && (
          <div key={msg.id} className={`toast toast--${msg.tone}`}>
            {msg.text}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
