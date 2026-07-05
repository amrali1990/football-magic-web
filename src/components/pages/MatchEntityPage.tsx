// Shared server implementation of the match page, parameterized by locale.
// See TeamEntityPage.tsx for the en/ar route pattern.

import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getFixture } from '@/lib/server-api';
import { matchPath, teamPath, leaguePath, metaDescription, languageAlternates, requestedEntityPath, pathsMatch, SITE_NAME, Locale } from '@/lib/seo';
import { seoText } from '@/lib/seo-i18n';
import { sportsEventSchema } from '@/lib/schema';
import { JsonLd } from '@/components/seo/JsonLd';
import { SeoLinksSection, SeoLink } from '@/components/seo/SeoSections';
import { MatchPageClient } from '@/components/matches/MatchPageClient';
import type { Fixture } from '@/types';

export type MatchRouteParams = Promise<{ id: string; slug?: string[] }>;

async function loadMatch(id: string, locale: Locale) {
  const matchId = Number(id);
  if (!Number.isInteger(matchId) || matchId <= 0) return null;
  return getFixture(matchId, locale);
}

const otherLocale = (locale: Locale): Locale => (locale === 'ar' ? 'en' : 'ar');

async function matchAlternates(fixture: Fixture, locale: Locale) {
  const other = otherLocale(locale);
  const otherData = await getFixture(fixture.id, other);
  const otherFixture = otherData?.fixture ?? fixture;
  const localized = { home: fixture.teams.home.name, away: fixture.teams.away.name };
  const foreign = { home: otherFixture.teams.home.name, away: otherFixture.teams.away.name };
  const enNames = locale === 'en' ? localized : foreign;
  const arNames = locale === 'ar' ? localized : foreign;
  const en = matchPath(fixture.id, enNames.home, enNames.away, 'en');
  const ar = matchPath(fixture.id, arNames.home, arNames.away, 'ar');
  return { en, ar };
}

const FINISHED = ['FT', 'AET', 'PEN'];

function matchName(fixture: Fixture, locale: Locale): string {
  const played = FINISHED.includes(fixture.status?.short ?? '') && fixture.goals.home != null && fixture.goals.away != null;
  return seoText.matchName(
    locale,
    fixture.teams.home.name,
    fixture.teams.away.name,
    played ? fixture.goals.home : null,
    played ? fixture.goals.away : null
  );
}

export async function generateMatchMetadata(params: MatchRouteParams, locale: Locale): Promise<Metadata> {
  const { id } = await params;
  const data = await loadMatch(id, locale);
  if (!data) return { title: 'Match not found' };
  const { fixture } = data;
  const { en, ar } = await matchAlternates(fixture, locale);
  const canonical = locale === 'ar' ? ar : en;
  const name = matchName(fixture, locale);
  const title = seoText.matchTitle(locale, name, fixture.league?.name, fixture.date);
  const description = metaDescription(
    seoText.matchDescription(locale, fixture.teams.home.name, fixture.teams.away.name, fixture.league?.name, fixture.date)
  );
  return {
    title,
    description,
    alternates: { canonical, languages: languageAlternates(en, ar) },
    openGraph: {
      title: `${name} | ${SITE_NAME}`,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: 'website',
      locale: locale === 'ar' ? 'ar_AR' : 'en_US',
      images: fixture.league?.logo ? [{ url: fixture.league.logo, alt: fixture.league.name }] : undefined,
    },
    twitter: {
      card: 'summary',
      title: `${name} | ${SITE_NAME}`,
      description,
    },
  };
}

export async function MatchEntityPage({ params, locale }: { params: MatchRouteParams; locale: Locale }) {
  const { id, slug } = await params;
  const data = await loadMatch(id, locale);
  if (!data) notFound();

  const { fixture } = data;
  const canonical = matchPath(fixture.id, fixture.teams.home.name, fixture.teams.away.name, locale);
  const requested = requestedEntityPath('match', id, slug, locale);
  if (!pathsMatch(requested, canonical)) permanentRedirect(canonical);

  const statusShort = fixture.status?.short ?? '';
  const finished = FINISHED.includes(statusShort);
  const intro = seoText.matchIntro(locale, {
    home: fixture.teams.home.name,
    away: fixture.teams.away.name,
    league: fixture.league?.name,
    date: fixture.date,
    finished,
    goalsHome: fixture.goals.home,
    goalsAway: fixture.goals.away,
    round: fixture.round ?? undefined,
    venue: fixture.venue?.name ?? undefined,
    venueCity: fixture.venue?.city ?? undefined,
  });

  const links: SeoLink[] = [
    { href: teamPath(fixture.teams.home.id, fixture.teams.home.name, locale), label: fixture.teams.home.name },
    { href: teamPath(fixture.teams.away.id, fixture.teams.away.name, locale), label: fixture.teams.away.name },
    ...(fixture.league?.id ? [{ href: leaguePath(fixture.league.id, fixture.league.name, locale), label: fixture.league.name }] : []),
  ];

  return (
    <>
      <JsonLd data={sportsEventSchema(fixture, locale)} />
      <MatchPageClient
        matchId={fixture.id}
        initialData={data}
        initialLng={locale}
        intro={intro}
        introLabel={seoText.aboutMatchLabel(locale)}
      />
      <SeoLinksSection title={seoText.matchLinksTitle(locale)} links={links} />
    </>
  );
}
