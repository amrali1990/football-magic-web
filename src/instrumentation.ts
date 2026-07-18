import type { Instrumentation } from 'next';

// Reports every server render/route error to the audit service (the same
// table as slug-mismatch and 404 events), so cache-poisoning failures like
// the guest-token ISR crash are visible without Vercel log access. Pathname
// only — request.path includes the query string, which can carry tokens.
export const onRequestError: Instrumentation.onRequestError = async (error, request) => {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  try {
    const { logWebAuditEvent } = await import('@/lib/audit');
    const userAgent = request.headers['user-agent'];
    const referer = request.headers['referer'];
    await logWebAuditEvent({
      eventType: 'server_error',
      requestedPath: request.path.split('?')[0],
      statusCode: 500,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
      referer: Array.isArray(referer) ? referer[0] : referer,
      rayId: null,
    });
  } catch {
    // Error reporting must never throw into the server.
  }
};
