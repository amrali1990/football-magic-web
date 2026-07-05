// Shared server implementation of the team page, parameterized by locale.
// The English route (/team/...) and Arabic route (/ar/team/...) are thin
// wrappers around this module; each fetches API data in its own language and
// cross-links the other via hreflang alternates.

import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import {
  getTeamInfo,
  getTeamLeagues,
  getTeamSeasonFixtures,
  getTeamSquad,
  getLeagueStandings,
  findCurrentLeague,
  splitFixtures,
  findStandingRow,
} from '@/lib/server-api';
import { teamPath, playerPath, leaguePath, matchPath, metaDescription, languageAlternates, requestedEntityPath, pathsMatch, SITE_NAME, Locale } from '@/lib/seo';
import { seoText } from '@/lib/seo-i18n';
import { sportsTeamSchema } from '@/lib/schema';
import type { FaqItem } from '@/lib/schema';
import { JsonLd } from '@/components/seo/JsonLd';
import { FaqSection, SeoLinksSection, SeoLink } from '@/components/seo/SeoSections';
import { TeamPageClient } from '@/components/teams/TeamPageClient';
import type { Fixture } from '@/types';

export type TeamRouteParams = Promise<{ id: string; slug?: string[] }>;

async function loadTeam(id: string, locale: Locale) {
  const teamId = Number(id);
  if (!Number.isInteger(teamId) || teamId <= 0) return null;
  return getTeamInfo(teamId, locale);
}

const otherLocale = (locale: Locale): Locale => (locale === 'ar' ? 'en' : 'ar');

/** Canonical team URLs in both languages (needs each language's team name). */
async function teamAlternates(teamId: number, locale: Locale, localizedName: string) {
  const other = otherLocale(locale);
  const otherData = await getTeamInfo(teamId, other);
  const otherName = otherData?.team.name ?? localizedName;
  const en = teamPath(teamId, locale === 'en' ? localizedName : otherName, 'en');
  const ar = teamPath(teamId, locale === 'ar' ? localizedName : otherName, 'ar');
  return { en, ar };
}

export async function generateTeamMetadata(params: TeamRouteParams, locale: Locale): Promise<Metadata> {
  const { id } = await params;
  const data = await loadTeam(id, locale);
  if (!data) return { title: 'Team not found' };
  const { team } = data;
  const { en, ar } = await teamAlternates(team.id, locale, team.name);
  const canonical = locale === 'ar' ? ar : en;
  const title = seoText.teamTitle(locale, team.name);
  const description = metaDescription(seoText.teamDescription(locale, team.name, team.country?.name));
  return {
    title,
    description,
    alternates: { canonical, languages: languageAlternates(en, ar) },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: 'website',
      locale: locale === 'ar' ? 'ar_AR' : 'en_US',
      images: team.logo ? [{ url: team.logo, alt: `${team.name} logo` }] : undefined,
    },
    twitter: {
      card: 'summary',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: team.logo ? [team.logo] : undefined,
    },
  };
}

function opponentOf(fixture: Fixture, teamId: number): string {
  return fixture.teams.home.id === teamId ? fixture.teams.away.name : fixture.teams.home.name;
}

function isWin(fixture: Fixture, teamId: number): boolean {
  return (
    (fixture.teams.home.id === teamId && fixture.teams.home.winner === true) ||
    (fixture.teams.away.id === teamId && fixture.teams.away.winner === true)
  );
}

export async function TeamEntityPage({ params, locale }: { params: TeamRouteParams; locale: Locale }) {
  const { id, slug } = await params;
  const data = await loadTeam(id, locale);
  if (!data) notFound();

  const { team } = data;
  const canonical = teamPath(team.id, team.name, locale);
  const requested = requestedEntityPath('team', id, slug, locale);
  if (!pathsMatch(requested, canonical)) permanentRedirect(canonical);

  const teamId = team.id;
  const [leagueEntries, seasonFixtures, squad] = await Promise.all([
    getTeamLeagues(teamId, locale),
    getTeamSeasonFixtures(teamId, locale),
    getTeamSquad(teamId, locale),
  ]);

  const currentLeague = findCurrentLeague(leagueEntries);
  const standings = currentLeague ? await getLeagueStandings(currentLeague.leagueId, currentLeague.season, locale) : [];
  const foundRow = findStandingRow(standings, teamId);
  // A standings position is only meaningful once matches have been played
  // (early-season tables list every team with 0 points).
  const standingRow = foundRow && (foundRow.all?.played ?? 0) > 0 ? foundRow : null;
  const { lastResults, upcoming } = splitFixtures(seasonFixtures);
  const nextFixture = upcoming[0];
  const lastFive = lastResults.slice(0, 5);
  const winsInLastFive = lastFive.filter((f) => isWin(f, teamId)).length;

  // Intro paragraph — every sentence is a self-contained factual claim built
  // from the loaded data (also what AI answer engines quote best).
  const intro = seoText.teamIntro(locale, {
    name: team.name,
    national: team.national,
    country: team.country?.name,
    founded: team.founded,
    rank: standingRow?.rank,
    points: standingRow?.points,
    played: standingRow?.all?.played,
    leagueName: currentLeague?.leagueName,
    winsInLastFive,
    lastFiveCount: lastFive.length,
    nextOpponent: nextFixture ? opponentOf(nextFixture, teamId) : undefined,
    nextDate: nextFixture?.date,
    nextLeague: nextFixture?.league?.name,
  });

  const faqItems: FaqItem[] = [];
  if (nextFixture) {
    faqItems.push(seoText.faqNextMatch(locale, team.name, opponentOf(nextFixture, teamId), nextFixture.date, nextFixture.league?.name));
  }
  const lastResult = lastFive[0];
  if (lastResult && lastResult.goals.home != null && lastResult.goals.away != null) {
    faqItems.push(
      seoText.faqLastResult(locale, team.name, lastResult.teams.home.name, lastResult.goals.home, lastResult.goals.away, lastResult.teams.away.name, lastResult.date)
    );
  }
  if (currentLeague) {
    faqItems.push(seoText.faqTeamLeague(locale, team.name, currentLeague.leagueName, currentLeague.season, standingRow?.rank));
  }
  if (!team.national && team.venue?.name) {
    faqItems.push(seoText.faqVenue(locale, team.name, team.venue.name, team.venue.city, team.venue.capacity));
  }
  if (team.founded) {
    faqItems.push(seoText.faqFounded(locale, team.name, team.founded));
  }

  const squadLinks: SeoLink[] = squad.slice(0, 30).map((p) => ({ href: playerPath(p.id, p.name, locale), label: p.name }));
  const seenLeagues = new Set<number>();
  const leagueLinks: SeoLink[] = leagueEntries
    .filter((e) => e.league?.id && !seenLeagues.has(e.league.id) && seenLeagues.add(e.league.id))
    .slice(0, 12)
    .map((e) => ({ href: leaguePath(e.league.id, e.league.name, locale), label: e.league.name }));
  const matchLinks: SeoLink[] = [...lastFive.slice(0, 3), ...upcoming.slice(0, 3)].map((f) => ({
    href: matchPath(f.id, f.teams.home.name, f.teams.away.name, locale),
    label: seoText.matchName(locale, f.teams.home.name, f.teams.away.name),
  }));

  return (
    <>
      <JsonLd data={sportsTeamSchema(team, { leagueName: currentLeague?.leagueName, squad, locale })} />
      <TeamPageClient
        teamId={teamId}
        initialData={data}
        initialLng={locale}
        intro={intro}
        introLabel={seoText.aboutLabel(locale, team.name)}
      />
      <FaqSection title={seoText.faqTitle(locale, team.name)} items={faqItems} locale={locale} />
      <SeoLinksSection title={seoText.squadTitle(locale, team.name)} links={squadLinks} />
      <SeoLinksSection title={seoText.competitionsTitle(locale)} links={leagueLinks} />
      <SeoLinksSection title={seoText.teamMatchesTitle(locale, team.name)} links={matchLinks} />
    </>
  );
}
