// Canonicalizes the Unicode form of every page URL before routing. The same
// Arabic word can arrive precomposed (NFC, what browsers/search engines emit)
// or decomposed (NFD, what this app's slugify emitted historically), and the
// two are different byte sequences — so the prerender cache, links and indexed
// URLs split across duplicate paths. slugify now emits NFC (see lib/slug.ts);
// this proxy 301s any non-NFC request to the NFC form so old NFD links and
// indexed URLs consolidate onto the one canonical URL. Slug-vs-entity-name
// mismatches remain the pages' job (they 308 to their canonical).

import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';

import { logWebAuditEvent } from '@/lib/audit';
import { normalizeSlug } from '@/lib/slug';

export function proxy(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    // Malformed percent-encoding — not ours to fix; let routing handle it.
    return NextResponse.next();
  }

  const normalized = normalizeSlug(decoded);
  if (normalized === decoded) return NextResponse.next();

  // Assigning the decoded string re-percent-encodes it (as NFC bytes); the
  // query string is preserved untouched so RSC prefetches redirect correctly.
  const url = request.nextUrl.clone();
  url.pathname = normalized;

  // Fire-and-forget: waitUntil keeps the log write alive past the response
  // without delaying the redirect. Pathnames only — never the query string.
  event.waitUntil(
    logWebAuditEvent({
      eventType: 'slug_normalization_mismatch',
      requestedPath: decoded,
      normalizedPath: normalized,
      statusCode: 301,
      userAgent: request.headers.get('user-agent'),
      referer: request.headers.get('referer'),
      rayId: request.headers.get('cf-ray'),
    })
  );

  return NextResponse.redirect(url, 301);
}

export const config = {
  // Only page routes: skip API routes, Next internals/assets, metadata files
  // and anything with a file extension (static assets). Unicode normalization
  // can only matter on slugged page paths anyway.
  matcher: ['/((?!api|_next|favicon.ico|sitemap.xml|robots.txt|llms.txt|.*\\..*).*)'],
};
