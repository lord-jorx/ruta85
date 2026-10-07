/**
 * Cliente de Supabase. Es `null` si faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY:
 * la app funciona entonces en modo solo local (Dexie), sin errores ni red.
 *
 * Flujo PKCE: la app usa HashRouter, y el flujo implícito pondría los tokens en el hash
 * (#access_token=…) pisando la ruta. Con PKCE el enlace mágico vuelve con `?code=…`, que
 * se canjea por la sesión y después se limpia de la URL sin tocar el hash de la ruta.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()

export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: { flowType: 'pkce', persistSession: true, detectSessionInUrl: true },
      })
    : null

/** true si hay credenciales de Supabase configuradas (la nube está disponible). */
export const cloudConfigured = supabase !== null

const AUTH_PARAMS = ['code', 'error', 'error_code', 'error_description']

/** Quita de la URL los parámetros del retorno de auth conservando la ruta y el hash del router. */
export function cleanAuthParams(href: string): string | null {
  const u = new URL(href)
  const hasAuth = u.searchParams.has('code') || u.searchParams.has('error_description')
  let changed = false
  if (hasAuth) {
    for (const k of AUTH_PARAMS) {
      if (u.searchParams.has(k)) {
        u.searchParams.delete(k)
        changed = true
      }
    }
  }
  // Errores de auth en el hash (#error=…) que HashRouter interpretaría como ruta.
  if (/^#(error|error_code|error_description)=/.test(u.hash)) {
    u.hash = ''
    changed = true
  }
  return changed ? u.pathname + u.search + u.hash : null
}

if (supabase && typeof window !== 'undefined') {
  // initialize() termina cuando se ha canjeado el ?code= (si lo había).
  void supabase.auth
    .initialize()
    .then(() => {
      const clean = cleanAuthParams(window.location.href)
      if (clean) window.history.replaceState(window.history.state, '', clean)
    })
    .catch(() => {
      /* sin red o sin sesión: nada que limpiar */
    })
}
