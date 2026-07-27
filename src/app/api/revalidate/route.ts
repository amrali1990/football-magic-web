// POST /api/revalidate — event-driven ISR invalidation sink.
//
// Trusted internal callers (seo-geo-crawler, relaying engine task-completed
// events) post the set of changed entities; this endpoint maps each to its ISR
// cache tag (src/lib/revalidation.ts) and calls revalidateTag(), so exactly the
// affected pages regenerate instead of waiting out their TTL. A fullAuditRequired
// (bulk / overflow) event purges only the coarse shell/discovery tags — never a
// per-entity fan-out.
//
// SECURITY: FAILS CLOSED. With no SSR_SHARED_SECRET configured, or an invalid /
// stale HMAC signature, the request is rejected and nothing is invalidated. A
// missing secret is never treated as "auth disabled".
//
// OPERATIONAL: REVALIDATION_ENABLED=false is a kill switch that reverts to pure
// TTL behaviour without a deploy (still authenticates, still supports dry-run,
// but performs no purge). ?dryRun=true returns exactly what WOULD be invalidated.

import { revalidateTag } from 'next/cache';
import type { NextRequest } from 'next/server';

import { verifySsrAuth } from '@/lib/ssr-auth';
import { logWebAuditEvent } from '@/lib/audit';
import {
  entityTags,
  COARSE_TAGS,
  MAX_ENTITIES_PER_BATCH,
  type ChangedEntity,
  type ChangedEntityType,
} from '@/lib/revalidation';

// revalidateTag requires the Node.js runtime (not Edge).
export const runtime = 'nodejs';
// This route must never be statically optimized or cached — it mutates cache state.
export const dynamic = 'force-dynamic';

const VALID_TYPES: ReadonlySet<string> = new Set<ChangedEntityType>(['MATCH', 'TEAM', 'LEAGUE', 'PLAYER', 'COUNTRY']);

interface RevalidatePayload {
  eventId?: unknown;
  taskName?: unknown;
  changedEntities?: unknown;
  fullAuditRequired?: unknown;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

/** Parse + validate the incoming entity list; silently drops malformed rows. */
function parseEntities(raw: unknown): ChangedEntity[] {
  if (!Array.isArray(raw)) return [];
  const out: ChangedEntity[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const { type, id } = item as { type?: unknown; id?: unknown };
    if (typeof type !== 'string' || !VALID_TYPES.has(type)) continue;
    if (typeof id !== 'number' && typeof id !== 'string') continue;
    out.push({ type: type as ChangedEntityType, id });
  }
  return out;
}

export async function POST(request: NextRequest): Promise<Response> {
  // 1. Authenticate — fail closed on missing secret or bad/stale signature.
  const auth = verifySsrAuth(request.headers);
  if (!auth.ok) {
    // 'no-secret' is a server misconfiguration (503); everything else is a
    // rejected caller (401). Never reveal which to an unauthenticated client
    // beyond the status code.
    return auth.reason === 'no-secret'
      ? json({ error: 'revalidation not configured' }, 503)
      : json({ error: 'unauthorized' }, 401);
  }

  // 2. Parse body.
  let payload: RevalidatePayload;
  try {
    payload = (await request.json()) as RevalidatePayload;
  } catch {
    return json({ error: 'invalid JSON' }, 400);
  }

  const eventId = typeof payload.eventId === 'string' ? payload.eventId : null;
  const taskName = typeof payload.taskName === 'string' ? payload.taskName : 'unknown';
  const fullAuditRequired = payload.fullAuditRequired === true;
  const entities = parseEntities(payload.changedEntities);

  // Defensive bound — the engine already degrades to fullAuditRequired above its
  // own cap, so a batch this large is a contract violation, not normal traffic.
  if (!fullAuditRequired && entities.length > MAX_ENTITIES_PER_BATCH) {
    return json({ error: `too many entities (max ${MAX_ENTITIES_PER_BATCH})` }, 413);
  }

  // 3. Map to tags. Coarse events purge only the shared shells/discovery.
  const counts: Partial<Record<ChangedEntityType, number>> = {};
  const tagSet = new Set<string>();
  const skipped: ChangedEntity[] = [];

  if (fullAuditRequired) {
    for (const tag of COARSE_TAGS) tagSet.add(tag);
  } else {
    for (const entity of entities) {
      const tags = entityTags(entity);
      if (tags.length === 0) {
        skipped.push(entity);
        continue;
      }
      counts[entity.type] = (counts[entity.type] ?? 0) + 1;
      for (const tag of tags) tagSet.add(tag);
    }
  }

  const tags = [...tagSet];
  const dryRun = request.nextUrl.searchParams.get('dryRun') === 'true';
  // Kill switch: authenticate + compute as normal, but perform no purge.
  const killed = process.env.REVALIDATION_ENABLED === 'false';
  const applied = !dryRun && !killed;

  if (applied) {
    // { expire: 0 } = immediate expiration (Next 16). This is the documented
    // pattern for external webhooks needing deterministic freshness: the very
    // next fetch of a tagged page (e.g. the crawler's own audit request) is a
    // blocking revalidate that sees fresh data — unlike profile 'max', which
    // would serve that fetch stale while refreshing in the background.
    for (const tag of tags) revalidateTag(tag, { expire: 0 });
  }

  // 4. Best-effort audit (reuses T_WEB_EVENT_AUDIT). requestedPath carries a
  //    non-path summary here by design; normalizedPath carries the tag list.
  await logWebAuditEvent({
    eventType: 'revalidation',
    requestedPath: `revalidation:${taskName}${dryRun ? ':dryRun' : killed ? ':disabled' : ''}`,
    normalizedPath: tags.join(','),
    statusCode: 200,
    userAgent: request.headers.get('user-agent'),
    referer: null,
    rayId: request.headers.get('cf-ray'),
  });

  return json(
    {
      eventId,
      taskName,
      dryRun,
      applied,
      disabled: killed,
      coarse: fullAuditRequired,
      invalidated: tags,
      counts,
      skipped,
    },
    200
  );
}
