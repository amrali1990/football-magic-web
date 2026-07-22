// Shared response normalizers for the Football Magic API. Used by both the
// server data layer (src/lib/server-api.ts) and the client pages when they
// refetch (e.g. after a language change), so both sides agree on shapes.

import type { Team, Country, Venue, League, Fixture, Player } from '@/types';
import type { PlayerSeasonTeam, PlayerSeasonTotal } from '@/components/players/PlayerStatsTab';

export interface TeamStats {
  team: { id: number; name: string; logo: string };
  shotsOnGoal: number;
  shotsOffGoal: number;
  totalShots: number;
  blockedShots: number;
  shotsInsidebox: number;
  shotsOutsidebox: number;
  fouls: number;
  cornerKicks: number;
  offsides: number;
  ballPossession: number;
  yellowCards: number;
  redCards: number;
  goalkeeperSaves: number;
  totalPasses: number;
  passesAccurate: number;
  passesPercentage: number;
  expectedGoals: number;
}

export interface MatchStatistics {
  homeTeam: TeamStats;
  awayTeam: TeamStats;
}

export interface TeamData {
  team: Team;
  coverage?: { transfers: boolean; squad: boolean; trophies: boolean };
}

// Raw shape returned by /teams/getTeamInformations: `venue` is a sibling of `team`,
// `country` is a plain string (the name) with `countryCode` provided separately, and
// tab availability comes back as top-level booleans (transfers/squad/winner).
export interface RawTeamInfo {
  team: Team & { country?: string | Country; countryCode?: string };
  venue?: Venue;
  transfers?: boolean;
  squad?: boolean;
  winner?: boolean;
}

export function normalizeTeamInfo(raw: RawTeamInfo): TeamData {
  const rawCountry = raw.team.country;
  const country: Country | undefined =
    typeof rawCountry === 'string'
      ? { name: rawCountry, code: raw.team.countryCode ?? '', flag: '' }
      : rawCountry;

  const team: Team = {
    ...raw.team,
    country,
    venue: raw.venue ?? raw.team.venue,
  };

  return {
    team,
    coverage: {
      transfers: !!raw.transfers,
      squad: !!raw.squad,
      trophies: !!raw.winner,
    },
  };
}

// Raw shape returned by /leagues/getLeague
export interface RawLeagueResponse {
  league?: { id: number; name: string; type: string; logo: string };
  country?: { id?: number; code: string; flag: string; name: string };
  seasons?: Array<{
    seasonId: number;
    year: string;
    label: string;
    start: string;
    end: string;
    current: boolean;
    coverage?: { standings?: boolean; statisticsPlayers?: boolean };
  }>;
  expandable?: boolean;
  winners?: boolean;
}

export function normalizeLeague(response: RawLeagueResponse, leagueId: number): League {
  return {
    id: response.league?.id ?? leagueId,
    name: response.league?.name ?? '',
    logo: response.league?.logo ?? '',
    type: response.league?.type ?? '',
    country: {
      name: response.country?.name ?? '',
      code: response.country?.code ?? '',
      flag: response.country?.flag ?? '',
    },
    seasons: response.seasons?.map((s) => ({
      id: s.seasonId,
      year: Number(s.year),
      start: s.start,
      end: s.end,
      current: s.current,
      coverage: {
        standings: !!s.coverage?.standings,
        statisticsPlayers: !!s.coverage?.statisticsPlayers,
      },
    })),
    winners: !!response.winners,
  };
}

export interface MatchData {
  fixture: Fixture;
  statistics: MatchStatistics | null;
  hasEvents: boolean;
  hasLineup: boolean;
}

// Raw shape returned by /fixtures/getFixture: `teams`, `goals`, `score`, `league`
// are siblings of the inner `fixture` object.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeFixtureResponse(response: any): MatchData | null {
  if (!response) return null;
  if (!response.fixture) {
    const fixture = response as Fixture;
    return fixture?.id ? { fixture, statistics: null, hasEvents: false, hasLineup: false } : null;
  }
  const fixture: Fixture = {
    id: response.fixture.id,
    referee: response.fixture.referee,
    date: response.fixture.date,
    timestamp: response.fixture.timestamp,
    round: response.fixture.round,
    venue: response.fixture.venue,
    status: response.fixture.status,
    league: {
      id: response.league?.id ?? 0,
      name: response.league?.name ?? '',
      logo: response.league?.logo ?? '',
      type: response.league?.type ?? '',
      country: { name: response.league?.country ?? '', code: '', flag: response.league?.flag ?? '' },
    },
    teams: response.teams ?? { home: { id: 0, name: '', logo: '', winner: null }, away: { id: 0, name: '', logo: '', winner: null } },
    goals: response.goals ?? { home: null, away: null },
    score: response.score ?? { halftime: { home: null, away: null }, fulltime: { home: null, away: null }, extratime: { home: null, away: null }, penalty: { home: null, away: null } },
  };
  return {
    fixture,
    statistics: response.statistics ?? null,
    hasEvents: !!response.events,
    hasLineup: !!response.lineup,
  };
}

export interface PlayerData {
  player: Player;
  total?: PlayerSeasonTotal;
  teams?: PlayerSeasonTeam[];
  years?: number[];
}
