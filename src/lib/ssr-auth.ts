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
