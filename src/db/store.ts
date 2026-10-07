/** Mini store observable, compatible con useSyncExternalStore (snapshots inmutables). */
export interface Store<T> {
  get(): T
  /** Fusiona un parche superficial; solo notifica si algún valor cambia. */
  set(patch: Partial<T>): void
  subscribe(listener: () => void): () => void
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<() => void>()
  return {
    get: () => state,
    set(patch) {
      const changed = (Object.keys(patch) as (keyof T)[]).some((k) => !Object.is(state[k], patch[k]))
      if (!changed) return
      state = { ...state, ...patch }
      for (const l of [...listeners]) l()
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }
}
