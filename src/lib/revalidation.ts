// Single source of truth for ISR cache tags. The server data layer
// (src/lib/server-api.ts) attaches these tags to its fetches, and the
// revalidation endpoint (src/app/api/revalidate/route.ts) invalidates the exact
// same strings. Keeping both sides in this one module is what guarantees a tag
// set on a getter and a tag purged by an event can never drift apart.
//
// Tags are locale-agnostic on purpose: `getFixture(id,'en')` and
// `getFixture(id,'ar')` and the /og/match/[id] route all call the same getter,
// so one `match:{id}` tag covers the English page, the Arabic page, and the OG
// card in a single revalidateTag() call.

// --- per-entity tag builders ------------------------------------------------
export const teamTag = (id: number | string) => `team:${id}`;
export const leagueTag = (id: number | string) => `league:${id}`;
export const playerTag = (id: number | string) => `player:${id}`;
export const matchTag = (id: number | string) => `match:${id}`;
export const countryTag = (code: string) => `country:${code}`;
/** Home / today's-matches list, keyed by UTC day (YYYY-MM-DD). */
export const matchesByDateTag = (date: string) => `matches:${date}`;

// --- collection / shell tags ------------------------------------------------
export const TAG_TOP_TEAMS = 'top-teams';
export const TAG_TOP_LEAGUES = 'top-leagues';
export const TAG_LEAGUES_INDEX = 'leagues-index';
export const TAG_SITEMAP = 'sitemap';

/**
 * Tags purged for a coarse (fullAuditRequired / overflow) event: the shared
 * shells and discovery surfaces only — never a per-entity fan-out. Entity
 * bodies ride their own TTL. This is the frontend half of the engine's
 * seo.events.max-entities overflow rule.
 */
export const COARSE_TAGS: readonly string[] = [
  TAG_TOP_TEAMS,
  TAG_TOP_LEAGUES,
  TAG_LEAGUES_INDEX,
  TAG_SITEMAP,
];

// Entity types as emitted by the engine (SeoChangedEntityDTO.type).
export type ChangedEntityType = 'MATCH' | 'TEAM' | 'LEAGUE' | 'PLAYER' | 'COUNTRY';

export interface ChangedEntity {
  type: ChangedEntityType;
  /** Numeric core/RapidAPI id for MATCH/TEAM/LEAGUE/PLAYER; ISO code for COUNTRY. */
  id: number | string;
}

const ENTITY_TAG: Record<ChangedEntityType, (id: number | string) => string> = {
  MATCH: matchTag,
  TEAM: teamTag,
  LEAGUE: leagueTag,
  PLAYER: playerTag,
  COUNTRY: (id) => countryTag(String(id)),
};

/**
 * The cache tags a single changed entity should invalidate. One tag today; a
 * list so cross-references (e.g. a future team→league link) can be added here
 * without touching callers. Unknown types map to nothing (safe no-op).
 */
export function entityTags(entity: ChangedEntity): string[] {
  const build = ENTITY_TAG[entity.type];
  if (!build || entity.id == null || entity.id === '') return [];
  return [build(entity.id)];
}

/** Max entities accepted in one revalidation batch — mirrors the engine's
 *  seo.events.max-entities cap (SeoEventsProducer). Above it the engine already
 *  sends fullAuditRequired instead, so this is purely a defensive bound. */
export const MAX_ENTITIES_PER_BATCH = 500;
