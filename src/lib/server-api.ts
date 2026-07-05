// Server-side data layer for SEO/SSR pages. Uses native fetch (so Next.js can
// cache/revalidate requests) instead of the axios client in src/lib/api.ts,
// which stays in use for client-side interactions. Every getter is wrapped in
// React cache() so generateMetadata and the page component share one request,
// and returns null instead of throwing so pages can notFound() gracefully.

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

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.football-magic.com';
const BASIC_AUTH_USERNAME = process.env.NEXT_PUBLIC_BASIC_AUTH_USERNAME || 'admin';
const BASIC_AUTH_PASSWORD = process.env.NEXT_PUBLIC_BASIC_AUTH_PASSWORD || 'admin123';

interface ServerFetchOptions {
  method?: 'GET' | 'POST';
  body?: unknown;
  params?: Record<string, string>;
  headers?: Record<string, string>;
  lng?: string;
  revalidate?: number;
}

async function serverFetch<T>(path: string, options: ServerFetchOptions = {}): Promise<T | null> {
  const { method = 'POST', body, params, headers, lng = 'en', revalidate = 3600 } = options;
  const auth = Buffer.from(`${BASIC_AUTH_USERNAME}:${BASIC_AUTH_PASSWORD}`).toString('base64');
  const qs = params ? `?${new URLSearchParams(params)}` : '';
  try {
    const res = await fetch(`${API_URL}${path}${qs}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Basic ${auth}`,
        lng,
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      next: { revalidate },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
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
  const raw = await serverFetch<TeamLeagueEntry[]>('/leagues/getLeaguesByTeam', { body: { teamId }, lng });
  return Array.isArray(raw) ? raw : [];
});

export const getTeamSeasonFixtures = cache(async (teamId: number, lng = 'en'): Promise<Fixture[]> => {
  const raw = await serverFetch<{ fixtures?: Fixture[] }>('/leagues/getLeaguesSeasonFixturesByTeam', { body: { teamId }, lng });
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
  const raw = await serverFetch<SquadPlayer[]>('/teams/getTeamSquad', { body: { teamId }, lng });
  return Array.isArray(raw) ? raw : [];
});

export const getLeague = cache(async (leagueId: number, lng = 'en'): Promise<League | null> => {
  const raw = await serverFetch<RawLeagueResponse>('/leagues/getLeague', { body: { leagueId }, lng });
  return raw?.league ? normalizeLeague(raw, leagueId) : null;
});

export const getLeagueStandings = cache(async (leagueId: number, season: number, lng = 'en'): Promise<Standing[][]> => {
  const raw = await serverFetch<{ standings?: Standing[][] }>('/leagues/getLeagueStandingsBySeason', {
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

export const getMatchesByDate = cache(
  async (date: string, page = 0, lng = 'en'): Promise<{ list: LeagueWithFixtures[]; totalPages: number }> => {
    const raw = await serverFetch<{ list?: LeagueWithFixtures[]; totalPages?: number }>('/leagues/getLeaguesByDate', {
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
  const raw = await serverFetch<LeagueGroup[]>('/leagues/getLeagues', { body: {}, lng, revalidate: 86400 });
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
  const raw = await serverFetch<TopTeam[]>('/teams/getTopTeams', { method: 'GET', lng, revalidate: 86400 });
  return Array.isArray(raw) ? raw : [];
});

export const getCountry = cache(async (code: string, lng = 'en'): Promise<{ name?: string; code?: string; flag?: string } | null> => {
  return serverFetch('/countries/getCountry', { method: 'GET', params: { code }, lng, revalidate: 86400 });
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
