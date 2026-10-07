/** API pública de la capa de datos (Dexie local-first + sincronización con Supabase). */
export { cloudConfigured, supabase } from './client'
export { clearLocalData, db } from './local'
export * from './repo'
export { mergeLww, refreshPending, requestSync, startSync, stopSync, syncNow, syncStore } from './sync'
export { authStore, initAuth, signInWithEmail, signOut, verifyEmailCode } from './auth'
export { startDb } from './start'
export {
  useActivities,
  useAuth,
  useBodyLogs,
  useFavorites,
  useFoodLogs,
  useFoodLogsRange,
  useImports,
  useSessionsWithSets,
  useSettings,
  useShifts,
  useSyncStatus,
} from './hooks'
export type * from './types'
