// Shared server implementation of the league page, parameterized by locale.
// See TeamEntityPage.tsx for the en/ar route pattern.

import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getLeague, getLeagueStandings } from '@/lib/server-api';
import { leaguePath, teamPath, metaDescription, languageAlternates, requestedEntityPath, pathsMatch, ordinal, SITE_NAME, Locale } from '@/lib/seo';
import { seoText } from '@/lib/seo-i18n';
import { sportsOrganizationSchema, breadcrumbSchema } from '@/lib/schema';
import type { FaqItem } from '@/lib/schema';
import { JsonLd } from '@/components/seo/JsonLd';
import { FaqSection, SeoLinksSection, SeoLink } from '@/components/seo/SeoSections';
import { LeaguePageClient } from '@/components/leagues/LeaguePageClient';
import type { Standing } from '@/types';

export type LeagueRouteParams = Promise<{ id: string; slug?: string[] }>;

async function loadLeague(id: string, locale: Locale) {
  const leagueId = Number(id);
  if (!Number.isInteger(leagueId) || leagueId <= 0) return null;
  return getLeague(leagueId, locale);
}

const otherLocale = (locale: Locale): Locale => (locale === 'ar' ? 'en' : 'ar');

async function leagueAlternates(leagueId: number, locale: Locale, localizedName: string) {
  const other = otherLocale(locale);
  const otherData = await getLeague(leagueId, other);
  const otherName = otherData?.name ?? localizedName;
  const en = leaguePath(leagueId, locale === 'en' ? localizedName : otherName, 'en');
  const ar = leaguePath(leagueId, locale === 'ar' ? localizedName : otherName, 'ar');
  return { en, ar };
}

export async function generateLeagueMetadata(params: LeagueRouteParams, locale: Locale): Promise<Metadata> {
  const { id } = await params;
  const league = await loadLeague(id, locale);
  if (!league) return { title: 'League not found' };
  const { en, ar } = await leagueAlternates(league.id, locale, league.name);
  const canonical = locale === 'ar' ? ar : en;
  const currentSeason = league.seasons?.find((s) => s.current);
  const title = seoText.leagueTitle(locale, league.name);
  const description = metaDescription(seoText.leagueDescription(locale, league.name, league.country?.name, currentSeason?.year));
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
      images: [{ url: `/og/league/${league.id}`, width: 1200, height: 630, alt: `${league.name} – ${SITE_NAME}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: [`/og/league/${league.id}`],
    },
  };
}

export async function LeagueEntityPage({ params, locale }: { params: LeagueRouteParams; locale: Locale }) {
  const { id, slug } = await params;
  const league = await loadLeague(id, locale);
  if (!league) notFound();

  const canonical = leaguePath(league.id, league.name, locale);
  const requested = requestedEntityPath('league', id, slug, locale);
  if (!pathsMatch(requested, canonical)) permanentRedirect(canonical);

  const currentSeason = league.seasons?.find((s) => s.current) ?? league.seasons?.[0];
  const standings = currentSeason ? await getLeagueStandings(league.id, currentSeason.year, locale) : [];
  const allRows: Standing[] = standings.flat();
  // A league leader is only meaningful once matches have been played
  // (early-season tables list every team with 0 points).
  const leaderRow = allRows.find((row) => row.rank === 1);
  const leader = leaderRow && (leaderRow.all?.played ?? 0) > 0 ? leaderRow : null;
  const teamCount = new Set(allRows.map((row) => row.team?.id).filter(Boolean)).size;

  const intro = seoText.leagueIntro(locale, {
    name: league.name,
    isCup: league.type === 'Cup',
    country: league.country?.name,
    season: currentSeason?.year,
    teamCount: teamCount || undefined,
    leaderName: leader?.team.name,
    leaderPoints: leader?.points,
    leaderPlayed: leader?.all?.played,
  });

  const faqItems: FaqItem[] = [];
  if (leader) {
    faqItems.push(seoText.faqLeagueLeader(locale, league.name, leader.team.name, currentSeason?.year, leader.points, leader.all?.played));
  }
  if (teamCount > 0) {
    faqItems.push(seoText.faqLeagueTeamCount(locale, league.name, teamCount, currentSeason?.year));
  }
  if (currentSeason?.start && currentSeason?.end) {
    faqItems.push(seoText.faqLeagueSeasonDates(locale, league.name, currentSeason.year, currentSeason.start, currentSeason.end));
  }

  // League -> all teams internal links, ordered by current standings position.
  const teamLinks: SeoLink[] = allRows
    .sort((a, b) => (a.rank ?? 0) - (b.rank ?? 0))
    .filter((row, index, arr) => arr.findIndex((r) => r.team?.id === row.team?.id) === index)
    .map((row) => ({
      href: teamPath(row.team.id, row.team.name, locale),
      label: leader
        ? locale === 'ar'
          ? `${row.rank.toLocaleString('ar-EG')}. ${row.team.name}`
          : `${ordinal(row.rank)}: ${row.team.name}`
        : row.team.name,
    }));

  const breadcrumb = breadcrumbSchema(locale, [
    { name: locale === 'ar' ? 'البطولات' : 'Leagues', path: locale === 'ar' ? '/ar/leagues' : '/leagues' },
    { name: league.name, path: canonical },
  ]);

  return (
    <>
      <JsonLd data={sportsOrganizationSchema(league, locale)} />
      <JsonLd data={breadcrumb} />
      <LeaguePageClient
        leagueId={league.id}
        initialData={league}
        initialLng={locale}
        intro={intro}
        introLabel={seoText.aboutLabel(locale, league.name)}
      />
      <FaqSection title={seoText.faqTitle(locale, league.name)} items={faqItems} locale={locale} />
      <SeoLinksSection title={seoText.leagueTeamsTitle(locale, league.name, currentSeason?.year)} links={teamLinks} />
    </>
  );
}
