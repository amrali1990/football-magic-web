// Server-side data layer for SEO/SSR pages. Uses native fetch (so Next.js can
// cache/revalidate requests) instead of the axios client in src/lib/api.ts,
// which stays in use for client-side interactions. Every getter is wrapped in
// React cache() so generateMetadata and the page component share one request.
// Entity getters return null only for a definitive API 404 (pages notFound()
// on it) and throw UpstreamApiError on transient failures; list getters
// degrade to empty results instead.

import { cache } from 'react';
import type { Standing } from '@/types';
import {
  normalizeTeamInfo,
  normalizeLeague,
  normalizeFixtureResponse,
  RawTeamInfo,
  RawLeagueResponse,
  TeamData,
  MatchData,
  PlayerData,
} from '@/lib/normalize';
import type { League, Fixture, LeagueWithFixtures, FixtureByDate } from '@/types';

import { getServerGuestToken, invalidateServerGuestToken, SSR_DEVICE_ID } from './guest-server';
import { ssrAuthHeaders } from './ssr-auth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.football-magic.com';
const CLIENT_KEY = process.env.CLIENT_KEY || process.env.NEXT_PUBLIC_CLIENT_KEY || '';

interface ServerFetchOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  lng?: string;
  revalidate?: number;
}

async function doFetch<T>(path: string, options: ServerFetchOptions, token: string): Promise<Response> {
  const { method = 'POST', body, params, headers, lng = 'en', revalidate = 3600 } = options;
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  const reqHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Device-Id': SSR_DEVICE_ID,
    lng,
    ...headers,
    // Trusted-SSR signature: bypasses gateway rate-limiting within the monthly quota.
    ...ssrAuthHeaders(method, `${path}${qs}`, body),
  };
  if (CLIENT_KEY) reqHeaders['X-Client-Key'] = CLIENT_KEY;
  return fetch(`${API_URL}${path}${qs}`, {
    method,
    headers: reqHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    next: { revalidate },
    signal: AbortSignal.timeout(15000),
  });
}

/**
 * A temporarily-failed upstream call (network error, 5xx, rate limit, auth
 * outage). Distinct from "the API says this entity does not exist": pages let
 * this error fail the render, so ISR never caches a 404 (or an empty page) it
 * would then serve — stale-while-revalidate keeps the last good version until
 * the API recovers. Swallowing these used to bake transient failures into the
 * prerender cache as permanent 404s.
 */
export class UpstreamApiError extends Error {
  constructor(path: string, cause: unknown) {
    super(`upstream API call failed: ${path} (${cause instanceof Error ? cause.message : String(cause)})`);
    this.name = 'UpstreamApiError';
  }
}

/**
 * Returns the parsed body, or null when the API definitively reports the
 * resource missing (404). Anything else — network failure, 5xx, 429, an
 * unrecoverable 401 — throws UpstreamApiError.
 */
async function serverFetch<T>(path: string, options: ServerFetchOptions = {}): Promise<T | null> {
  try {
    let token = await getServerGuestToken();
    let res = await doFetch<T>(path, options, token);
    // A stale cached guest token yields 401 — refresh once and retry.
    if (res.status === 401) {
      invalidateServerGuestToken();
      token = await getServerGuestToken();
      res = await doFetch<T>(path, options, token);
    }
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`status ${res.status}`);
    // Core's entity getters signal "does not exist" as 200 with an empty body
    // (their advice reserves error statuses for real failures) — treat it as a
    // definitive miss, not a parse failure.
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text) as T;
  } catch (err) {
    throw new UpstreamApiError(path, err);
  }
}

/**
 * serverFetch for list/enrichment data where a page can reasonably render
 * without it (standings, events, sidebars, sitemap inputs): transient upstream
 * failures degrade to null instead of failing the whole render. Entity getters
 * whose null means notFound() must use serverFetch directly.
 */
async function serverFetchTolerant<T>(path: string, options: ServerFetchOptions = {}): Promise<T | null> {
  try {
    return await serverFetch<T>(path, options);
  } catch {
    return null;
  }
}

export const getTeamInfo = cache(async (teamId: number, lng = 'en'): Promise<TeamData | null> => {
  const raw = await serverFetch<RawTeamInfo>('/teams/getTeamInformations', { body: { teamId }, lng });
  return raw?.team ? normalizeTeamInfo(raw) : null;
});

// Shape returned by /leagues/getLeaguesByTeam
export interface TeamLeagueEntry {
  league: { id: number; name: string; type: string; logo: string };
  country?: { name?: string; code?: string; flag?: string };
  seasons?: Array<{ seasonId: number; year: string; label: string; start: string; end: string; current: boolean }>;
}

export const getTeamLeagues = cache(async (teamId: number, lng = 'en'): Promise<TeamLeagueEntry[]> => {
  const raw = await serverFetchTolerant<TeamLeagueEntry[]>('/leagues/getLeaguesByTeam', { body: { teamId }, lng });
  return Array.isArray(raw) ? raw : [];
});

export const getTeamSeasonFixtures = cache(async (teamId: number, lng = 'en'): Promise<Fixture[]> => {
  const raw = await serverFetchTolerant<{ fixtures?: Fixture[] }>('/leagues/getLeaguesSeasonFixturesByTeam', { body: { teamId }, lng });
  return Array.isArray(raw?.fixtures) ? raw.fixtures : [];
});

export interface SquadPlayer {
  id: number;
  name: string;
  age?: number;
  number?: number | null;
  position?: string;
  photo?: string;
}

export const getTeamSquad = cache(async (teamId: number, lng = 'en'): Promise<SquadPlayer[]> => {
  const raw = await serverFetchTolerant<SquadPlayer[]>('/teams/getTeamSquad', { body: { teamId }, lng });
  return Array.isArray(raw) ? raw : [];
});

export const getLeague = cache(async (leagueId: number, lng = 'en'): Promise<League | null> => {
  const raw = await serverFetch<RawLeagueResponse>('/leagues/getLeague', { body: { leagueId }, lng });
  return raw?.league ? normalizeLeague(raw, leagueId) : null;
});

export const getLeagueStandings = cache(async (leagueId: number, season: number, lng = 'en'): Promise<Standing[][]> => {
  const raw = await serverFetchTolerant<{ standings?: Standing[][] }>('/leagues/getLeagueStandingsBySeason', {
    body: { leagueId, season },
    lng,
  });
  return Array.isArray(raw?.standings) ? raw.standings : [];
});

export const getPlayer = cache(async (playerId: number, lng = 'en'): Promise<PlayerData | null> => {
  const raw = await serverFetch<PlayerData>('/player/getPlayerInformations', { body: { playerId }, lng });
  return raw?.player ? raw : null;
});

export const getFixture = cache(async (fixtureId: number, lng = 'en'): Promise<MatchData | null> => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await serverFetch<any>('/fixtures/getFixture', { body: { fixtureId }, lng, revalidate: 60 });
  return normalizeFixtureResponse(raw);
});

// Shape returned by /fixtures/getFixtureEvents. `type` codes (mirrors the
// client MatchEventsTab): 1 goal, 2 own goal, 3 penalty, 4 missed penalty,
// 5 yellow card, 6 second yellow, 7 red card, 8 substitution, 9-13 VAR.
export interface RawMatchEvent {
  id: number;
  teamId: number;
  time: number;
  type: number;
  details: string | null;
  player: { id: number; name: string; photo?: string } | null;
  assist: { id: number | null; name: string | null } | null;
}

export const getFixtureEvents = cache(async (fixtureId: number, lng = 'en'): Promise<RawMatchEvent[]> => {
  const raw = await serverFetchTolerant<RawMatchEvent[]>('/fixtures/getFixtureEvents', { body: { fixtureId }, lng, revalidate: 60 });
  return Array.isArray(raw) ? raw : [];
});

export interface RawLineupPlayer {
  player: { id: number; name: string; number?: number | null; pos?: string | null };
}

export interface RawTeamLineup {
  team: { id: number; name: string; logo?: string };
  formation?: string | null;
  coach?: { id: number; name: string } | null;
  players?: RawLineupPlayer[][];
  substitutes?: RawLineupPlayer[];
}

export interface RawFixtureLineup {
  homeTeam?: RawTeamLineup;
  awayTeam?: RawTeamLineup;
}

export const getFixtureLineup = cache(async (fixtureId: number, lng = 'en'): Promise<RawFixtureLineup | null> => {
  return serverFetchTolerant<RawFixtureLineup>('/fixtures/getFixtureLineup', { body: { fixtureId }, lng, revalidate: 60 });
});

export const getMatchesByDate = cache(
  async (date: string, page = 0, lng = 'en'): Promise<{ list: LeagueWithFixtures[]; totalPages: number }> => {
    const raw = await serverFetchTolerant<{ list?: LeagueWithFixtures[]; totalPages?: number }>('/leagues/getLeaguesByDate', {
      body: { date },
      headers: { page: String(page) },
      lng,
      revalidate: 60,
    });
    return { list: Array.isArray(raw?.list) ? raw.list : [], totalPages: raw?.totalPages ?? 0 };
  }
);

// Shape returned by /leagues/getLeagues: countries/groups with nested leagues
export interface LeagueGroup {
  id: number;
  name: string;
  code: string | null;
  flag: string | null;
  leagues: Array<{ id: number; name: string; logo: string; type: string }>;
}

export const getAllLeagues = cache(async (lng = 'en'): Promise<LeagueGroup[]> => {
  const raw = await serverFetchTolerant<LeagueGroup[]>('/leagues/getLeagues', { body: {}, lng, revalidate: 86400 });
  return Array.isArray(raw) ? raw : [];
});

export interface TopTeam {
  id: number;
  name: string;
  logo: string;
  national?: boolean;
  countryCode?: string;
}

export const getTopTeams = cache(async (lng = 'en'): Promise<TopTeam[]> => {
  const raw = await serverFetchTolerant<TopTeam[]>('/teams/getTopTeams', { method: 'GET', lng, revalidate: 86400 });
  return Array.isArray(raw) ? raw : [];
});

export interface TopLeaguesSidebarResponse {
  countryName?: string;
  leagues?: Array<{ id: number; name: string; logo: string; country: string; flag: string }>;
}

export const getTopLeagues = cache(async (lng = 'en'): Promise<TopLeaguesSidebarResponse['leagues']> => {
  const raw = await serverFetchTolerant<TopLeaguesSidebarResponse>('/leagues/getTopLeagues', { method: 'GET', lng, revalidate: 86400 });
  return Array.isArray(raw?.leagues) ? raw.leagues : [];
});

export const getCountry = cache(async (code: string, lng = 'en'): Promise<{ name?: string; code?: string; flag?: string } | null> => {
  return serverFetch('/countries/getCountry', { method: 'GET', params: { code }, lng, revalidate: 86400 });
});

// --- Slim sitemap endpoints -------------------------------------------------
// Lightweight {id|code, localized name, updatedAt} pages the backend exposes for
// sitemap generation. These use serverFetchTolerant so that if the endpoint is
// not deployed yet (404) or fails, the getter returns null and the sitemap
// collectors fall back to the legacy full-data getters — behaviour is unchanged
// until core ships these routes, then upgrades automatically.

export interface SitemapSlimRow {
  id: number;
  name: string;
  updatedAt?: string | null;
}
export interface CountrySlimRow {
  code: string;
  name?: string | null;
  updatedAt?: string | null;
}
export interface FixtureSlimRow {
  id: number;
  homeName?: string | null;
  awayName?: string | null;
  updatedAt?: string | null;
}
export interface SitemapSlimPage<T> {
  list: T[];
  totalPages: number;
  totalElements: number;
}

const SITEMAP_REVALIDATE = 86400;

export const getTeamsSitemapPage = cache(async (page: number, size: number, lng = 'en'): Promise<SitemapSlimPage<SitemapSlimRow> | null> => {
  return serverFetchTolerant<SitemapSlimPage<SitemapSlimRow>>('/teams/getTeamsForSitemap', { method: 'GET', params: { page: String(page), size: String(size) }, lng, revalidate: SITEMAP_REVALIDATE });
});

export const getPlayersSitemapPage = cache(async (page: number, size: number, lng = 'en'): Promise<SitemapSlimPage<SitemapSlimRow> | null> => {
  return serverFetchTolerant<SitemapSlimPage<SitemapSlimRow>>('/player/getPlayersForSitemap', { method: 'GET', params: { page: String(page), size: String(size) }, lng, revalidate: SITEMAP_REVALIDATE });
});

export const getLeaguesSitemapPage = cache(async (page: number, size: number, lng = 'en'): Promise<SitemapSlimPage<SitemapSlimRow> | null> => {
  return serverFetchTolerant<SitemapSlimPage<SitemapSlimRow>>('/leagues/getLeaguesForSitemap', { method: 'GET', params: { page: String(page), size: String(size) }, lng, revalidate: SITEMAP_REVALIDATE });
});

export const getCountriesSitemapPage = cache(async (page: number, size: number, lng = 'en'): Promise<SitemapSlimPage<CountrySlimRow> | null> => {
  return serverFetchTolerant<SitemapSlimPage<CountrySlimRow>>('/countries/getCountriesForSitemap', { method: 'GET', params: { page: String(page), size: String(size) }, lng, revalidate: SITEMAP_REVALIDATE });
});

export const getFixturesSitemapPage = cache(async (page: number, size: number, lng = 'en'): Promise<SitemapSlimPage<FixtureSlimRow> | null> => {
  return serverFetchTolerant<SitemapSlimPage<FixtureSlimRow>>('/fixtures/getFixturesForSitemap', { method: 'GET', params: { page: String(page), size: String(size) }, lng, revalidate: 3600 });
});

/**
 * The team's primary domestic competition (type "League" with a current
 * season), falling back to any competition with a current season.
 */
export function findCurrentLeague(entries: TeamLeagueEntry[]): { leagueId: number; leagueName: string; season: number } | null {
  const withCurrent = entries
    .map((entry) => {
      const current = entry.seasons?.find((s) => s.current);
      return current ? { entry, year: Number(current.year) } : null;
    })
    .filter((x): x is { entry: TeamLeagueEntry; year: number } => x !== null);
  if (withCurrent.length === 0) return null;
  const domestic = withCurrent.find((x) => x.entry.league?.type === 'League') ?? withCurrent[0];
  return { leagueId: domestic.entry.league.id, leagueName: domestic.entry.league.name, season: domestic.year };
}

const FINISHED_STATUSES = ['FT', 'AET', 'PEN'];

/** Split a season fixture list into recent results (newest first) and upcoming matches (soonest first). */
export function splitFixtures(fixtures: Fixture[] | FixtureByDate[]): { lastResults: Fixture[]; upcoming: Fixture[] } {
  const now = Date.now();
  const all = [...(fixtures as Fixture[])];
  const lastResults = all
    .filter((f) => FINISHED_STATUSES.includes(f.status?.short ?? ''))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const upcoming = all
    .filter((f) => (f.status?.short === 'NS' || f.status?.short === 'TBD') && new Date(f.date).getTime() >= now)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  return { lastResults, upcoming };
}

/** Find a team's standings row across all groups of a league table. */
export function findStandingRow(standings: Standing[][], teamId: number): Standing | null {
  for (const group of standings) {
    const row = group.find((r) => r.team?.id === teamId);
    if (row) return row;
  }
  return null;
}
