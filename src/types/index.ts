export interface User {
  id: number;
  username: string;
  email: string;
  accessToken: string;
  refreshToken: string;
  leagueIds: number[];
  teamIds: number[];
  gender?: string | number;
  birthDate?: string;
  countryId?: number;
  country?: Country;
}

export interface League {
  id: number;
  name: string;
  logo: string;
  type: string;
  country: Country;
  seasons?: Season[];
  currentSeason?: Season;
  coverage?: LeagueCoverage;
  /** Whether the league has a winners/trophies history (drives the Winners tab). */
  winners?: boolean;
}

export interface LeagueCoverage {
  standings: boolean;
  players: boolean;
  topScorers: boolean;
  topAssists: boolean;
  topCards: boolean;
  injuries: boolean;
  predictions: boolean;
  odds: boolean;
  lineups: boolean;
  statisticsFixtures: boolean;
  statisticsPlayers: boolean;
  events: boolean;
}

export interface Season {
  id: number;
  year: number;
  start: string;
  end: string;
  current: boolean;
  /** Per-season data availability; gates the Table and Players Statistics tabs. */
  coverage?: SeasonCoverage;
}

export interface SeasonCoverage {
  standings: boolean;
  statisticsPlayers: boolean;
}

export interface Country {
  id?: number;
  name: string;
  code: string;
  flag: string;
}

export interface Team {
  id: number;
  name: string;
  logo: string;
  country?: Country;
  founded?: number;
  national?: boolean;
  venue?: Venue;
  coverage?: TeamCoverage;
}

export interface TeamCoverage {
  transfers: boolean;
  squad: boolean;
  trophies: boolean;
}

export interface Venue {
  id: number;
  name: string;
  address: string;
  city: string;
  capacity: number;
  surface: string;
  image: string;
}

export interface Player {
  id: number;
  name: string;
  firstname: string;
  lastname: string;
  // camelCase fields returned by /player/getPlayerInformations
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  birthPlace?: string;
  birthCountry?: string;
  birthCountryCode?: string;
  nationalityCode?: string;
  injured?: boolean;
  photo: string;
  age: number;
  number?: number;
  nationality: string;
  height: string;
  weight: string;
  position: string;
  team?: Team;
}

export interface Fixture {
  id: number;
  referee: string;
  date: string;
  timestamp: number;
  round?: string;
  venue: Venue;
  status: FixtureStatus;
  league: League;
  teams: {
    home: FixtureTeam;
    away: FixtureTeam;
  };
  goals: {
    home: number | null;
    away: number | null;
  };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

export interface FixtureStatus {
  long: string;
  short: string;
  elapsed: number | null;
}

export interface FixtureTeam {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null;
}

export interface FixtureEvent {
  time: { elapsed: number; extra: number | null };
  team: { id: number; name: string; logo: string };
  player: { id: number; name: string };
  assist: { id: number | null; name: string | null };
  type: string;
  detail: string;
  comments: string | null;
}

export interface FixtureLineup {
  team: { id: number; name: string; logo: string };
  formation: string;
  startXI: LineupPlayer[];
  substitutes: LineupPlayer[];
  coach: { id: number; name: string; photo: string };
}

export interface LineupPlayer {
  player: {
    id: number;
    name: string;
    number: number;
    pos: string;
    grid: string | null;
  };
}

export interface Standing {
  rank: number;
  team: { id: number; name: string; logo: string };
  points: number;
  goalsDiff: number;
  group: string;
  form: string;
  status: string;
  description: string;
  all: StandingStats;
  home: StandingStats;
  away: StandingStats;
}

export interface StandingStats {
  played: number;
  win: number;
  draw: number;
  lose: number;
  goals: { for: number; against: number };
}

export interface Transfer {
  player: { id: number; name: string; photo?: string };
  date: string;
  type: string;
  value?: string;
  teams: {
    in: { id: number; name: string; logo: string } | null;
    out: { id: number; name: string; logo: string } | null;
  };
}

export interface PlayerStatistic {
  player: Player;
  statistics: Array<{
    team: Team;
    league: League;
    games: { appearances: number; lineups: number; minutes: number; position: string; rating: string };
    goals: { total: number; assists: number; saves: number };
    cards: { yellow: number; red: number };
    passes: { total: number; key: number; accuracy: number };
    tackles: { total: number; blocks: number; interceptions: number };
    duels: { total: number; won: number };
    dribbles: { attempts: number; success: number; past: number };
    fouls: { drawn: number; committed: number };
    penalty: { won: number; scored: number; missed: number; saved: number };
  }>;
}

export interface LeagueWithFixtures {
  id: number;
  name: string;
  type: string;
  logo: string;
  country: string;
  flag: string;
  season: string;
  round: string;
  expandable: boolean;
  fixtures: FixtureByDate[];
}

export interface FixtureByDate {
  id: number;
  referee: string;
  timezone: string;
  date: string;
  timestamp: number;
  round: string;
  status: FixtureStatus;
  goals: { home: number | null; away: number | null };
  teams: {
    home: FixtureTeam;
    away: FixtureTeam;
  };
  score: {
    halftime: { home: number | null; away: number | null };
    fulltime: { home: number | null; away: number | null };
    extratime: { home: number | null; away: number | null };
    penalty: { home: number | null; away: number | null };
  };
}

export interface NotificationPreference {
  id?: number;
  entityId: number;
  entityType: 'TEAM' | 'LEAGUE';
  goals: boolean;
  allEvents: boolean;
}
