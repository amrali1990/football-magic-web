// Shared server implementation of the leagues listing page, parameterized by
// locale. See TeamEntityPage.tsx for the en/ar route pattern.

import type { Metadata } from 'next';
import { getAllLeagues } from '@/lib/server-api';
import { metaDescription, languageAlternates, SITE_NAME, Locale } from '@/lib/seo';
import { seoText } from '@/lib/seo-i18n';
import { LeaguesPageClient, CountryGroup } from '@/components/leagues/LeaguesPageClient';

export function leaguesMetadata(locale: Locale): Metadata {
  const canonical = locale === 'ar' ? '/ar/leagues' : '/leagues';
  return {
    title: seoText.leaguesTitle(locale),
    description: metaDescription(seoText.leaguesDescription(locale)),
    alternates: { canonical, languages: languageAlternates('/leagues', '/ar/leagues') },
    openGraph: {
      siteName: SITE_NAME,
      type: 'website',
      locale: locale === 'ar' ? 'ar_AR' : 'en_US',
      images: [{ url: '/og/home', width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: 'summary_large_image',
      images: ['/og/home'],
    },
  };
}

export async function LeaguesEntityPage({ locale }: { locale: Locale }) {
  const raw = await getAllLeagues(locale);
  const initialGroups: CountryGroup[] = raw.map((c) => ({
    country: { name: c.name, code: c.code ?? '', flag: c.flag ?? '' },
    leagues: c.leagues || [],
  }));

  return <LeaguesPageClient initialGroups={initialGroups} initialLng={locale} />;
}
