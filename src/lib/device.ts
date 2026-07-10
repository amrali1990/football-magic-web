// Stable per-install device identifier sent as X-Device-Id (Phase 5). Persisted
// in localStorage so it survives reloads. Browser-only; returns '' on the server.

const STORAGE_KEY = 'device_id';

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for older browsers.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** Returns this browser's stable device id, creating and persisting one on first use. */
export function getDeviceId(): string {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = uuid();
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
