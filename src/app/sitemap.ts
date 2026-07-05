import type { MetadataRoute } from 'next';
import { getAllLeagues, getTopTeams, getMatchesByDate } from '@/lib/server-api';
import { absoluteUrl, leaguePath, teamPath, matchPath, languageAlternates } from '@/lib/seo';

// Regenerate the sitemap at most once per hour.
export const revalidate = 3600;

// Matches from yesterday through the next week keep fresh fixtures indexed.
const MATCH_WINDOW_DAYS = { back: 1, forward: 7 };

function dateString(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

type Entry = MetadataRoute.Sitemap[number];
type ChangeFrequency = 'hourly' | 'daily' | 'weekly';

/** One entry per language, each cross-referencing both via hreflang alternates. */
function bilingualEntries(
  enPath: string,
  arPath: string,
  lastModified: Date,
  changeFrequency: ChangeFrequency,
  priority: number
): Entry[] {
  const alternates = { languages: languageAlternates(enPath, arPath) };
  return [
    { url: absoluteUrl(enPath), lastModified, changeFrequency, priority, alternates },
    { url: absoluteUrl(arPath), lastModified, changeFrequency, priority, alternates },
  ];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const dayOffsets = Array.from(
    { length: MATCH_WINDOW_DAYS.back + MATCH_WINDOW_DAYS.forward + 1 },
    (_, i) => i - MATCH_WINDOW_DAYS.back
  );

  const [leaguesEn, leaguesAr, teamsEn, teamsAr, ...matchDays] = await Promise.all([
    getAllLeagues('en'),
    getAllLeagues('ar'),
    getTopTeams('en'),
    getTopTeams('ar'),
    ...dayOffsets.map((offset) => getMatchesByDate(dateString(offset), 0, 'en')),
    ...dayOffsets.map((offset) => getMatchesByDate(dateString(offset), 0, 'ar')),
  ]);
  const matchDaysEn = matchDays.slice(0, dayOffsets.length);
  const matchDaysAr = matchDays.slice(dayOffsets.length);

  const entries: Entry[] = [
    ...bilingualEntries('/', '/ar', now, 'hourly', 1),
    ...bilingualEntries('/leagues', '/ar/leagues', now, 'weekly', 0.8),
  ];

  // Leagues — Arabic names looked up by id for the /ar URLs.
  const arLeagueNames = new Map<number, string>();
  for (const group of leaguesAr) {
    for (const league of group.leagues ?? []) arLeagueNames.set(league.id, league.name);
  }
  for (const group of leaguesEn) {
    for (const league of group.leagues ?? []) {
      entries.push(
        ...bilingualEntries(
          leaguePath(league.id, league.name, 'en'),
          leaguePath(league.id, arLeagueNames.get(league.id) ?? league.name, 'ar'),
          now,
          'daily',
          0.8
        )
      );
    }
  }

  // Top teams
  const arTeamNames = new Map<number, string>(teamsAr.map((t) => [t.id, t.name]));
  for (const team of teamsEn) {
    entries.push(
      ...bilingualEntries(
        teamPath(team.id, team.name, 'en'),
        teamPath(team.id, arTeamNames.get(team.id) ?? team.name, 'ar'),
        now,
        'daily',
        0.7
      )
    );
  }

  // Matches in the rolling window
  const arMatchNames = new Map<number, { home: string; away: string }>();
  for (const day of matchDaysAr) {
    for (const league of day.list) {
      for (const fixture of league.fixtures ?? []) {
        arMatchNames.set(fixture.id, { home: fixture.teams?.home?.name, away: fixture.teams?.away?.name });
      }
    }
  }
  const seenMatches = new Set<number>();
  let matchCount = 0;
  for (const day of matchDaysEn) {
    for (const league of day.list) {
      for (const fixture of league.fixtures ?? []) {
        if (seenMatches.has(fixture.id) || matchCount >= 10000) continue;
        seenMatches.add(fixture.id);
        matchCount++;
        const ar = arMatchNames.get(fixture.id);
        entries.push(
          ...bilingualEntries(
            matchPath(fixture.id, fixture.teams?.home?.name, fixture.teams?.away?.name, 'en'),
            matchPath(fixture.id, ar?.home ?? fixture.teams?.home?.name, ar?.away ?? fixture.teams?.away?.name, 'ar'),
            now,
            'hourly',
            0.6
          )
        );
      }
    }
  }

  // Player pages are intentionally not enumerated here: the API exposes no
  // bulk player listing, so crawlers discover them through squad and match
  // links on team/league pages instead.
  const seen = new Set<string>();
  return entries.filter((entry) => !seen.has(entry.url) && seen.add(entry.url));
}
