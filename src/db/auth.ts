/**
 * Autenticación con enlace mágico (Supabase Auth, flujo PKCE).
 * Sin Supabase configurado el store queda { user: null, ready: true } y todo sigue en local.
 */
import type { Session } from '@supabase/supabase-js'
import { supabase } from './client'
import { createStore } from './store'
import type { AuthState, AuthUser } from './types'

export const authStore = createStore<AuthState>({ user: null, ready: supabase === null })

function toUser(session: Session | null): AuthUser | null {
  const u = session?.user
  return u ? { id: u.id, email: u.email ?? null } : null
}

/** Actualiza el usuario conservando la identidad del objeto si no cambió (evita resincronizar al refrescar el token). */
function applySession(session: Session | null): void {
  const next = toUser(session)
  const prev = authStore.get().user
  const same = prev && next && prev.id === next.id && prev.email === next.email
  authStore.set({ user: same ? prev : next, ready: true })
}

let started = false

/** Lee la sesión guardada y escucha cambios. Idempotente. */
export function initAuth(): void {
  if (started) return
  started = true
  if (!supabase) {
    authStore.set({ ready: true })
    return
  }
  const client = supabase
  // getSession espera al canje del ?code= del enlace mágico (si lo hay).
  client.auth
    .getSession()
    .then(({ data }) => applySession(data.session))
    .catch(() => authStore.set({ ready: true }))
  // El callback no debe llamar a otros métodos de supabase de forma síncrona (riesgo de bloqueo).
  client.auth.onAuthStateChange((_event, session) => applySession(session))
}

function requireClient() {
  if (!supabase) throw new Error('La nube no está configurada (faltan VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY).')
  return supabase
}

function normalizeEmail(email: string): string {
  const e = email.trim().toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) throw new Error('Introduce un correo electrónico válido.')
  return e
}

/**
 * Envía el enlace mágico. El enlace vuelve a la URL actual (origin + pathname), p. ej.
 * https://lord-jorx.github.io/ruta85/ o http://localhost:5173/. Debe abrirse en el mismo navegador.
 */
export async function signInWithEmail(email: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  })
  if (error) throw new Error(error.message)
}

/** Alternativa al enlace: inicia sesión con el código de 6 cifras del correo (útil en la PWA instalada). */
export async function verifyEmailCode(email: string, code: string): Promise<void> {
  const client = requireClient()
  const { error } = await client.auth.verifyOtp({
    email: normalizeEmail(email),
    token: code.trim(),
    type: 'email',
  })
  if (error) throw new Error(error.message)
}

/** Cierra la sesión. Los datos locales se conservan (local-first). */
export async function signOut(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw new Error(error.message)
}
