// Shared server implementation of the home (today's matches) page,
// parameterized by locale. See TeamEntityPage.tsx for the en/ar route pattern.

import type { Metadata } from 'next';
import { getMatchesByDate } from '@/lib/server-api';
import { metaDescription, languageAlternates, SITE_NAME, Locale } from '@/lib/seo';
import { seoText } from '@/lib/seo-i18n';
import { HomeClient } from '@/components/matches/HomeClient';

export function homeMetadata(locale: Locale): Metadata {
  const canonical = locale === 'ar' ? '/ar' : '/';
  return {
    // Absolute: the home title already carries the brand, so skip the
    // layout's "%s | Football Magic" template to avoid doubling it.
    title: { absolute: seoText.homeTitle(locale) },
    description: metaDescription(seoText.homeDescription(locale)),
    alternates: { canonical, languages: languageAlternates('/', '/ar') },
    openGraph: {
      siteName: SITE_NAME,
      type: 'website',
      locale: locale === 'ar' ? 'ar_AR' : 'en_US',
    },
  };
}

export async function HomeEntityPage({ locale }: { locale: Locale }) {
  // The server renders "today" in UTC; the client keeps its own date state
  // afterwards, so visitors in other timezones simply refetch their local day.
  const today = new Date().toISOString().slice(0, 10);
  const { list, totalPages } = await getMatchesByDate(today, 0, locale);

  const matchCount = list.reduce((sum, league) => sum + (league.fixtures?.length ?? 0), 0);
  const intro = seoText.homeIntro(locale, {
    date: today,
    matchCount,
    leagueCount: list.length,
    topLeagues: list.slice(0, 3).map((l) => l.name),
  });

  return (
    <HomeClient
      initialDate={today}
      initialLeagues={list}
      initialTotalPages={totalPages}
      initialLng={locale}
      intro={intro}
      introLabel={seoText.homeIntroLabel(locale)}
    />
  );
}
