/**
 * Arranque de la capa de datos: lee la sesión guardada y activa los disparadores de
 * sincronización. Idempotente; los hooks lo invocan solos, pero puede llamarse una vez en main.tsx.
 */
import { initAuth } from './auth'
import { startSync } from './sync'

let started = false

export function startDb(): void {
  if (started) return
  started = true
  initAuth()
  startSync()
}
