import crypto from 'crypto';

// Proves to the API gateway that a request comes from the trusted server-side
// renderer, so it bypasses IP rate-limiting/blocklisting (within a monthly quota).
//
// SECURITY: the secret lives ONLY in a server-side env var (SSR_SHARED_SECRET) and
// is NEVER exposed to the browser (do not prefix it with NEXT_PUBLIC_). What goes on
// the wire is a rotating HMAC signature over a timestamp — not the secret itself — so
// a captured header is worthless after `freshness-seconds` and cannot be forged.
// Mirrors the gateway's GatewaySignatures / SsrAuthenticator scheme:
//   X-SSR-Auth = base64(HMAC-SHA256(secret, timestamp))

const SECRET = process.env.SSR_SHARED_SECRET || '';

/**
 * Returns the SSR authentication headers for one gateway call, or `{}` when no
 * secret is configured (feature disabled). `callId` should uniquely identify the
 * logical call (method + url + body) so the gateway can count unique calls against
 * the monthly quota; repeated re-renders of the same page share one call id.
 */
export function ssrAuthHeaders(method: string, url: string, body?: unknown): Record<string, string> {
  if (!SECRET) return {};
  const ts = Date.now().toString();
  const signature = crypto.createHmac('sha256', SECRET).update(ts, 'utf8').digest('base64');
  const callId = crypto
    .createHash('sha256')
    .update(`${method}\n${url}\n${body !== undefined ? JSON.stringify(body) : ''}`, 'utf8')
    .digest('base64');
  return {
    'X-SSR-Auth': signature,
    'X-SSR-Ts': ts,
    'X-SSR-Call-Id': callId,
  };
}

export type SsrAuthReason = 'ok' | 'no-secret' | 'missing-headers' | 'stale' | 'bad-signature';

export interface SsrAuthResult {
  ok: boolean;
  reason: SsrAuthReason;
}

/**
 * Verifies an INBOUND request carries a valid SSR signature — the mirror of
 * ssrAuthHeaders(), used by the revalidation endpoint to authenticate calls
 * from trusted internal services (e.g. seo-geo-crawler). Same scheme as the
 * gateway: X-SSR-Auth = base64(HMAC-SHA256(SSR_SHARED_SECRET, X-SSR-Ts)).
 *
 * FAILS CLOSED: with no secret configured it returns { ok: false,
 * reason: 'no-secret' } — the caller MUST reject (never treat a missing secret
 * as "auth disabled"). Freshness defaults to 60s (SSR_FRESHNESS_SECONDS),
 * matching the gateway, so a captured header cannot be replayed.
 */
export function verifySsrAuth(headers: Headers): SsrAuthResult {
  if (!SECRET) return { ok: false, reason: 'no-secret' };
  const ts = headers.get('x-ssr-ts');
  const sig = headers.get('x-ssr-auth');
  if (!ts || !sig) return { ok: false, reason: 'missing-headers' };
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return { ok: false, reason: 'missing-headers' };
  const freshnessMs = (Number(process.env.SSR_FRESHNESS_SECONDS) || 60) * 1000;
  if (Math.abs(Date.now() - tsNum) > freshnessMs) return { ok: false, reason: 'stale' };
  const expected = crypto.createHmac('sha256', SECRET).update(ts, 'utf8').digest('base64');
  const expectedBuf = Buffer.from(expected, 'utf8');
  const sigBuf = Buffer.from(sig, 'utf8');
  if (expectedBuf.length !== sigBuf.length || !crypto.timingSafeEqual(expectedBuf, sigBuf)) {
    return { ok: false, reason: 'bad-signature' };
  }
  return { ok: true, reason: 'ok' };
}
