import type { NextRequest } from 'next/server';

import { logWebAuditEvent } from '@/lib/audit';

// Internal ingestion endpoint for the 404 audit logger (NotFoundAuditLogger).
// Browser-reachable, so treat the body as untrusted: validate the shape, keep
// only a same-site pathname (no query — it can carry tokens), clamp lengths,
// and always answer 204 — auditing must never signal anything to the caller.
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { path?: unknown; referer?: unknown };
    const path = typeof body.path === 'string' ? body.path.split('?')[0] : '';
    if (path.startsWith('/') && !path.startsWith('//') && path.length <= 500) {
      await logWebAuditEvent({
        eventType: 'not_found',
        requestedPath: path,
        statusCode: 404,
        userAgent: request.headers.get('user-agent'),
        referer: typeof body.referer === 'string' ? body.referer : null,
        rayId: request.headers.get('cf-ray'),
      });
    }
  } catch {
    // Malformed body or audit outage — nothing to do.
  }
  return new Response(null, { status: 204 });
}
