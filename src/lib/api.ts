import axios, { Method } from 'axios';
import { getGuestToken, clearGuestToken } from './guest';
import { getDeviceId } from './device';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.football-magic.com';
const CLIENT_KEY = process.env.NEXT_PUBLIC_CLIENT_KEY || '';
const API_TIMEOUT = 30000;

interface ApiCallParams {
  url: string;
  method: Method;
  data?: unknown;
  params?: Record<string, unknown>;
  token?: string;
  headers?: Record<string, string>;
  lng?: string;
}

axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // A stale/expired guest token also 401s — drop it so the next call re-fetches.
      clearGuestToken();
      if (typeof window !== 'undefined') {
        localStorage.removeItem('persist:root');
        window.dispatchEvent(new Event('auth:logout'));
      }
    }
    return Promise.reject(error);
  }
);

const apiCall = async ({
  url,
  method,
  data,
  params,
  token,
  headers: additionalHeaders,
  lng = 'en',
}: ApiCallParams): Promise<unknown> => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    lng,
    ...additionalHeaders,
  };
  if (CLIENT_KEY) headers['X-Client-Key'] = CLIENT_KEY;
  const deviceId = getDeviceId();
  if (deviceId) headers['X-Device-Id'] = deviceId;

  if (token && token.trim() !== '') {
    headers.Authorization = `Bearer ${token}`;
  } else {
    // No user session: authenticate as a scoped, read-only guest.
    headers.Authorization = `Bearer ${await getGuestToken()}`;
  }

  const response = await axios({
    method,
    url: `${API_URL}${url}`,
    data,
    params,
    headers,
    timeout: API_TIMEOUT,
  });
  return response.data;
};

export default apiCall;

export const api = {
  auth: {
    signIn: (username: string, password: string) =>
      apiCall({ url: '/auth/signin', method: 'POST', data: { username, password } }),
    socialLogin: (provider: string, token: string, email: string) =>
      apiCall({ url: '/auth/login', method: 'POST', data: { provider, token, email } }),
    refreshToken: (refreshToken: string) =>
      apiCall({ url: '/auth/refreshToken', method: 'POST', data: { refreshToken } }),
    register: (data: Record<string, unknown>) =>
      apiCall({ url: '/registration/signup', method: 'POST', data }),
    updateProfile: (data: Record<string, unknown>, token: string) =>
      apiCall({ url: '/users/update', method: 'POST', data, token }),
    updatePassword: (data: Record<string, unknown>, token: string) =>
      apiCall({ url: '/users/updatePassword', method: 'POST', data, token }),
  },

  matches: {
    getByDate: (date: string, page: number, lng: string) =>
      apiCall({
        url: '/leagues/getLeaguesByDate',
        method: 'POST',
        data: { date },
        headers: { page: String(page) },
        lng,
      }),
    searchByDate: (date: string, search: string, lng: string) =>
      apiCall({
        url: '/leagues/getFixturesByDateWithSearch',
        method: 'POST',
        data: { date, search },
        lng,
      }),
    getFixture: (fixtureId: number, lng: string) =>
      apiCall({ url: '/fixtures/getFixture', method: 'POST', data: { fixtureId }, lng }),
    getFixtureEvents: (fixtureId: number, lng: string) =>
      apiCall({ url: '/fixtures/getFixtureEvents', method: 'POST', data: { fixtureId }, lng }),
    getFixtureLineup: (fixtureId: number, lng: string) =>
      apiCall({ url: '/fixtures/getFixtureLineup', method: 'POST', data: { fixtureId }, lng }),
    getFixtureH2H: (fixtureId: number, lng: string) =>
      apiCall({ url: '/fixtures/getFixtureHead2Head', method: 'POST', data: { fixtureId }, lng }),
  },

  leagues: {
    getAll: (lng: string) =>
      apiCall({ url: '/leagues/getLeagues', method: 'POST', data: {}, lng }),
    getTopLeagues: (lng: string) =>
      apiCall({ url: '/leagues/getTopLeagues', method: 'GET', lng }),
    getLeague: (leagueId: number, lng: string) =>
      apiCall({ url: '/leagues/getLeague', method: 'POST', data: { leagueId }, lng }),
    getFixtures: (leagueId: number, season: number, lng: string) =>
      apiCall({ url: '/leagues/getLeagueFixtures', method: 'POST', data: { leagueId, season }, lng }),
    getStandings: (leagueId: number, season: number, lng: string) =>
      apiCall({ url: '/leagues/getLeagueStandingsBySeason', method: 'POST', data: { leagueId, season }, lng }),
    getPlayersStatistics: (leagueId: number, season: number, lng: string) =>
      apiCall({ url: '/leagues/getLeaguePlayersStatistics', method: 'GET', params: { apiId: leagueId, year: String(season) }, lng }),
    getTopPlayersByCategory: (leagueId: number, season: number, category: string, page: number, lng: string) =>
      apiCall({ url: '/leagues/getLeagueTopPlayersByCategory', method: 'GET', params: { apiId: leagueId, year: String(season), category: category.replace('top', '').replace('Cards', '').toLowerCase() }, headers: { page: String(page), size: '10' }, lng }),
    getWinners: (leagueId: number, lng: string) =>
      apiCall({ url: '/leagues/getLeagueWinners', method: 'GET', params: { leagueId }, lng }),
    getByCountry: (countryCode: string, lng: string) =>
      apiCall({ url: '/leagues/getLeaguesByCountry', method: 'GET', params: { code: countryCode }, lng }),
    getByCountryCode: (countryCode: string, page: number, lng: string) =>
      apiCall({ url: '/leagues/getLeaguesByCountryCode', method: 'GET', params: { countryCode, page }, lng }),
  },

  teams: {
    getInfo: (teamId: number, lng: string) =>
      apiCall({ url: '/teams/getTeamInformations', method: 'POST', data: { teamId }, lng }),
    getStatistics: (teamId: number, leagueId: number, year: number, lng: string) =>
      apiCall({ url: '/teams/getTeamStatistics', method: 'POST', data: { teamId, leagueId, year }, lng }),
    getTransfers: (teamId: number, page: number, lng: string) =>
      apiCall({ url: '/teams/getTeamTransfers', method: 'POST', data: { teamId }, headers: { page: String(page) }, lng }),
    getSquad: (teamId: number, lng: string) =>
      apiCall({ url: '/teams/getTeamSquad', method: 'POST', data: { teamId }, lng }),
    getLeagues: (teamId: number, lng: string) =>
      apiCall({ url: '/leagues/getLeaguesByTeam', method: 'POST', data: { teamId }, lng }),
    getWinnersByTeam: (teamId: number, lng: string) =>
      apiCall({ url: '/leagues/getLeaguesWinnersByTeam', method: 'GET', params: { teamId }, lng }),
    getSeasonFixtures: (teamId: number, season: number | undefined, lng: string) =>
      apiCall({ url: '/leagues/getLeaguesSeasonFixturesByTeam', method: 'POST', data: season ? { teamId, season } : { teamId }, lng }),
    getTopTeams: (lng: string, token?: string) =>
      apiCall({ url: '/teams/getTopTeams', method: 'GET', lng, token }),
    getByCountryCode: (countryCode: string, page: number, national: boolean, lng: string) =>
      apiCall({ url: '/teams/getTeamsByCountryCode', method: 'GET', params: { code: countryCode, national, page }, lng }),
  },

  players: {
    getInfo: (playerId: number, lng: string, year?: number) =>
      apiCall({ url: '/player/getPlayerInformations', method: 'POST', data: year ? { playerId, year } : { playerId }, lng }),
    getTransfers: (playerId: number, lng: string) =>
      apiCall({ url: '/player/getPlayerTransfers', method: 'POST', data: { playerId }, lng }),
    getByCountryCode: (countryCode: string, page: number, lng: string) =>
      apiCall({ url: '/player/getPlayersByCountryCode', method: 'GET', params: { code: countryCode, page }, lng }),
  },

  sidebar: {
    // Context-aware top leagues/teams for the right sidebar (web-only endpoint).
    get: (params: { date?: string; countryCode?: string; leagueId?: number; teamId?: number }, lng: string) =>
      apiCall({ url: '/leagues/getSidebar', method: 'GET', params, lng }),
  },

  countries: {
    getAll: (lng: string) =>
      apiCall({ url: '/countries/getCountries', method: 'GET', lng }),
    getCountry: (countryCode: string, lng: string) =>
      apiCall({ url: '/countries/getCountry', method: 'GET', params: { code: countryCode }, lng }),
  },

  favorites: {
    get: (token: string, lng: string) =>
      apiCall({ url: '/favorites/get', method: 'GET', token, lng }),
    save: (data: Record<string, unknown>, token: string) =>
      apiCall({ url: '/favorites/save', method: 'POST', data, token }),
    delete: (data: Record<string, unknown>, token: string) =>
      apiCall({ url: '/favorites/delete', method: 'DELETE', data, token }),
    updateLanguage: (language: string, token: string) =>
      apiCall({ url: '/favorites/updateLanguage', method: 'PUT', data: { language }, token }),
  },

  notifications: {
    get: (token: string, lng: string) =>
      apiCall({ url: '/notification/get', method: 'GET', token, lng }),
    save: (data: Record<string, unknown>, token: string) =>
      apiCall({ url: '/notification/save', method: 'POST', data, token }),
  },
};
