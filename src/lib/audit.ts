// Server-side client for the platform audit service (SERVER-ONLY: it signs
// requests with the SSR secret and holds the guest token — never import it
// into client components). Events are routed through the API gateway to the
// audit microservice's POST /audit/web-events endpoint.
//
// Writes are best-effort telemetry: every failure is swallowed so an audit
// outage can never break or delay a user request. Callers on a hot path
// (proxy.ts) must not await this directly — pass it to event.waitUntil().
//
// PRIVACY: only pathnames are ever logged, never query strings — query params
// can carry tokens (e.g. password-reset links) and must not reach the audit DB.

import axios from 'axios';

import { getServerGuestToken, SSR_DEVICE_ID } from './guest-server';
import { ssrAuthHeaders } from './ssr-auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.football-magic.com';
const CLIENT_KEY = process.env.CLIENT_KEY || process.env.NEXT_PUBLIC_CLIENT_KEY || '';
const WEB_EVENTS_PATH = '/audit/web-events';

export type WebAuditEventType = 'slug_normalization_mismatch' | 'not_found' | 'server_error';

export interface WebAuditEvent {
  eventType: WebAuditEventType;
  /** Decoded pathname only — the caller must strip any query string. */
  requestedPath: string;
  /** Canonical pathname a mismatch was redirected to (normalization events). */
  normalizedPath?: string | null;
  statusCode: number;
  userAgent?: string | null;
  referer?: string | null;
  /** CDN request id (Cloudflare cf-ray) for cross-referencing edge logs. */
  rayId?: string | null;
}

/** Column widths of T_WEB_EVENT_AUDIT — truncate rather than let inserts fail. */
const clamp = (value: string | null | undefined, max: number): string | null =>
  value ? value.slice(0, max) : null;

export async function logWebAuditEvent(event: WebAuditEvent): Promise<void> {
  try {
    const body = {
      eventType: event.eventType,
      requestedPath: clamp(event.requestedPath.split('?')[0], 500),
      normalizedPath: clamp(event.normalizedPath?.split('?')[0], 500),
      statusCode: event.statusCode,
      userAgent: clamp(event.userAgent, 500),
      referer: clamp(event.referer, 500),
      rayId: clamp(event.rayId, 64),
    };
    const token = await getServerGuestToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      'X-Device-Id': SSR_DEVICE_ID,
      ...ssrAuthHeaders('POST', WEB_EVENTS_PATH, body),
    };
    if (CLIENT_KEY) headers['X-Client-Key'] = CLIENT_KEY;
    // axios (not fetch) for the same reason as guest-server.ts: it is invisible
    // to Next's patched fetch, so logging can never affect a route's caching.
    await axios.post(`${API_URL}${WEB_EVENTS_PATH}`, body, { headers, timeout: 3_000 });
  } catch {
    // Best-effort only — never surface audit failures to the request path.
  }
}
