'use client';

import { useEffect } from 'react';

/**
 * Renders nothing; reports one 'not_found' audit event for the current 404
 * view. 404 pages are served from the prerender cache without invoking any
 * server code, so the only place that sees every real 404 *view* (and its
 * user agent/referrer) is the browser — it posts to an internal API route
 * that forwards to the audit service with server-side credentials.
 * Only the pathname is sent: query strings can carry tokens.
 */
export function NotFoundAuditLogger() {
  useEffect(() => {
    try {
      void fetch('/api/audit/not-found', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: window.location.pathname,
          referer: document.referrer || null,
        }),
        keepalive: true,
      }).catch(() => {});
    } catch {
      // Logging must never affect the page.
    }
  }, []);

  return null;
}
