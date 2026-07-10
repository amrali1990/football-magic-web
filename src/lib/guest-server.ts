// Server-side guest-token manager for the SSR/ISR data layer. Caches a single
// guest token in module scope (per server instance) and re-fetches on expiry or
// on demand. Replaces the shared Basic admin credential used by server-api.ts.

import { ssrAuthHeaders } from './ssr-auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.football-magic.com';
const CLIENT_KEY = process.env.CLIENT_KEY || process.env.NEXT_PUBLIC_CLIENT_KEY || '';
const EXPIRY_SKEW_MS = 30_000;
// Fixed device id for server-side rendering (no browser device available). Kept
// consistent between the guest-token request and downstream calls so token↔device
// binding holds and the require-device-id gate is satisfied for SSR traffic.
export const SSR_DEVICE_ID = 'ssr-server';

interface GuestTokenResponse {
  token: string;
  type: string;
  role: string;
  expiresInMs: number;
}

let cachedToken: string | null = null;
let cachedExp = 0;
let inflight: Promise<string> | null = null;

async function fetchGuestToken(): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client': 'web',
    'X-Device-Id': SSR_DEVICE_ID,
    // Trusted-SSR signature so the token fetch also bypasses gateway rate-limiting.
    ...ssrAuthHeaders('POST', '/auth/guest', { client: 'web' }),
  };
  if (CLIENT_KEY) headers['X-Client-Key'] = CLIENT_KEY;
  const res = await fetch(`${API_URL}/auth/guest`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ client: 'web' }),
    cache: 'no-store',
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`guest token request failed: ${res.status}`);
  const data = (await res.json()) as GuestTokenResponse;
  cachedToken = data.token;
  cachedExp = Date.now() + data.expiresInMs;
  return data.token;
}

/** Returns a valid guest token, fetching a fresh one when the cache is empty/expired. */
export async function getServerGuestToken(): Promise<string> {
  if (cachedToken && cachedExp > Date.now() + EXPIRY_SKEW_MS) return cachedToken;
  if (inflight) return inflight;
  inflight = fetchGuestToken().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** Invalidates the cached token so the next request re-fetches (used after a 401). */
export function invalidateServerGuestToken(): void {
  cachedToken = null;
  cachedExp = 0;
}
