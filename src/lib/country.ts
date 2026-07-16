// Browser-locale region (ISO 3166-1 alpha-2, e.g. "EG") sent as X-Country on
// every API call so gateway audit logs can attribute the call when server-side
// GeoIP cannot resolve the client IP. Browser-only; returns '' on the server.

let cached: string | null = null;

export function getCountry(): string {
  if (cached !== null) return cached;
  if (typeof navigator === 'undefined') return '';
  cached = '';
  try {
    const locale = navigator.language || navigator.languages?.[0] || '';
    const parsed = new Intl.Locale(locale);
    // maximize() infers the likely region when the tag has none ("en" → "US").
    const region = parsed.region || parsed.maximize().region || '';
    // Region can also be a 3-digit UN M49 area code ("419") — only keep alpha-2.
    if (/^[A-Za-z]{2}$/.test(region)) cached = region.toUpperCase();
  } catch {
    // No locale info — header is simply omitted and the gateway keeps "unknown".
  }
  return cached;
}
