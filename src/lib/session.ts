import type { User } from '@/types';

// Live view of the logged-in user for the API layer. The Redux store is
// created per StoreProvider mount (makeStore()), so lib/api.ts cannot import a
// store singleton; makeStore() registers each store instance here instead.
// Structural type (not RootState) to avoid a store.ts <-> api.ts import cycle.
interface SessionStore {
  getState(): { Authentication?: { user?: User | null } };
  dispatch(action: unknown): unknown;
}

let current: SessionStore | null = null;

export function registerSessionStore(store: SessionStore): void {
  current = store;
}

/** The logged-in user from the active Redux store, or null (also on the server). */
export function getSessionUser(): User | null {
  return current?.getState().Authentication?.user ?? null;
}

/** Dispatches into the active Redux store; no-op before a store is registered. */
export function sessionDispatch(action: unknown): void {
  current?.dispatch(action);
}
