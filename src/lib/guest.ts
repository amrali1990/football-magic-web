import axios from 'axios';
import { getDeviceId } from './device';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.football-magic.com';

// Client identity key required by the gateway (Phase 6). Distinct per client
// and rotateable via env — this is a "raise the bar" signal, not a secret.
const CLIENT_KEY = process.env.NEXT_PUBLIC_CLIENT_KEY || '';

const STORAGE_KEY = 'guest_token';
const STORAGE_EXP = 'guest_token_exp';
// Refresh a little before real expiry to avoid racing the clock.
const EXPIRY_SKEW_MS = 30_000;

interface GuestTokenResponse {
  token: string;
  type: string;
  role: string;
  expiresInMs: number;
}

let inflight: Promise<string> | null = null;

function readCached(): string | null {
  if (typeof window === 'undefined') return null;
  const token = window.localStorage.getItem(STORAGE_KEY);
  const exp = Number(window.localStorage.getItem(STORAGE_EXP) || '0');
  if (token && exp > Date.now() + EXPIRY_SKEW_MS) return token;
  return null;
}

function writeCached(token: string, expiresInMs: number): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, token);
  window.localStorage.setItem(STORAGE_EXP, String(Date.now() + expiresInMs));
}

/** Clears the cached guest token so the next call fetches a fresh one (used on 401). */
export function clearGuestToken(): void {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(STORAGE_EXP);
}

/**
 * Returns a valid guest access token, fetching a new one from /auth/guest when
 * the cache is empty or expired. Concurrent callers share a single in-flight
 * request. Replaces the old shared Basic admin credential.
 */
export async function getGuestToken(): Promise<string> {
  const cached = readCached();
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json', 'X-Client': 'web' };
      if (CLIENT_KEY) headers['X-Client-Key'] = CLIENT_KEY;
      const deviceId = getDeviceId();
      if (deviceId) headers['X-Device-Id'] = deviceId;
      const res = await axios.post<GuestTokenResponse>(
        `${API_URL}/auth/guest`,
        { client: 'web' },
        { headers, timeout: 30_000 },
      );
      writeCached(res.data.token, res.data.expiresInMs);
      return res.data.token;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
