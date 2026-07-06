// Shared server implementation of the player page, parameterized by locale.
// See TeamEntityPage.tsx for the en/ar route pattern.

import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { getPlayer } from '@/lib/server-api';
import { playerPath, teamPath, metaDescription, languageAlternates, requestedEntityPath, pathsMatch, SITE_NAME, Locale } from '@/lib/seo';
import { seoText } from '@/lib/seo-i18n';
import { personSchema, breadcrumbSchema } from '@/lib/schema';
import { JsonLd } from '@/components/seo/JsonLd';
import { SeoLinksSection, SeoLink } from '@/components/seo/SeoSections';
import { PlayerPageClient } from '@/components/players/PlayerPageClient';
import type { PlayerData } from '@/lib/normalize';

export type PlayerRouteParams = Promise<{ id: string; slug?: string[] }>;

async function loadPlayer(id: string, locale: Locale) {
  const playerId = Number(id);
  if (!Number.isInteger(playerId) || playerId <= 0) return null;
  return getPlayer(playerId, locale);
}

const otherLocale = (locale: Locale): Locale => (locale === 'ar' ? 'en' : 'ar');

async function playerAlternates(playerId: number, locale: Locale, localizedName: string) {
  const other = otherLocale(locale);
  const otherData = await getPlayer(playerId, other);
  const otherName = otherData?.player.name ?? localizedName;
  const en = playerPath(playerId, locale === 'en' ? localizedName : otherName, 'en');
  const ar = playerPath(playerId, locale === 'ar' ? localizedName : otherName, 'ar');
  return { en, ar };
}

/** Current club: prefer the first non-national team the player has stats for. */
function currentTeam(data: PlayerData) {
  const teams = data.teams ?? [];
  return teams.find((t) => !t.national) ?? teams[0];
}

function currentPosition(data: PlayerData): string | undefined {
  if (data.player.position) return data.player.position;
  for (const team of data.teams ?? []) {
    for (const stat of team.statistics ?? []) {
      if (stat.games?.position) return stat.games.position;
    }
  }
  return undefined;
}

export async function generatePlayerMetadata(params: PlayerRouteParams, locale: Locale): Promise<Metadata> {
  const { id } = await params;
  const data = await loadPlayer(id, locale);
  if (!data) return { title: 'Player not found' };
  const { player } = data;
  const { en, ar } = await playerAlternates(player.id, locale, player.name);
  const canonical = locale === 'ar' ? ar : en;
  const team = currentTeam(data);
  const position = currentPosition(data);
  const title = seoText.playerTitle(locale, player.name);
  const description = metaDescription(seoText.playerDescription(locale, player.name, position, team?.name, player.nationality));
  return {
    title,
    description,
    alternates: { canonical, languages: languageAlternates(en, ar) },
    openGraph: {
      title: `${title} | ${SITE_NAME}`,
      description,
      url: canonical,
      siteName: SITE_NAME,
      type: 'profile',
      locale: locale === 'ar' ? 'ar_AR' : 'en_US',
      images: player.photo ? [{ url: player.photo, alt: player.name }] : undefined,
    },
    twitter: {
      card: 'summary',
      title: `${title} | ${SITE_NAME}`,
      description,
      images: player.photo ? [player.photo] : undefined,
    },
  };
}

export async function PlayerEntityPage({ params, locale }: { params: PlayerRouteParams; locale: Locale }) {
  const { id, slug } = await params;
  const data = await loadPlayer(id, locale);
  if (!data) notFound();

  const { player, total } = data;
  const canonical = playerPath(player.id, player.name, locale);
  const requested = requestedEntityPath('player', id, slug, locale);
  if (!pathsMatch(requested, canonical)) permanentRedirect(canonical);

  const team = currentTeam(data);
  const position = currentPosition(data);

  const intro = seoText.playerIntro(locale, {
    name: player.name,
    position,
    nationality: player.nationality,
    team: team?.name,
    birthDate: player.birthDate,
    birthPlace: player.birthPlace,
    age: player.age,
    apps: total?.appearences ?? undefined,
    goals: total?.goals ?? undefined,
    assists: total?.assists ?? undefined,
  });

  const teamLinks: SeoLink[] = (data.teams ?? [])
    .filter((t) => t.id && t.name)
    .slice(0, 6)
    .map((t) => ({ href: teamPath(t.id, t.name, locale), label: t.name }));

  const breadcrumb = breadcrumbSchema(locale, [
    ...(team?.id && team.name ? [{ name: team.name, path: teamPath(team.id, team.name, locale) }] : []),
    { name: player.name, path: canonical },
  ]);

  return (
    <>
      <JsonLd data={personSchema(player, { teamName: team?.name, position, locale })} />
      <JsonLd data={breadcrumb} />
      <PlayerPageClient
        playerId={player.id}
        initialData={data}
        initialLng={locale}
        intro={intro}
        introLabel={seoText.aboutLabel(locale, player.name)}
      />
      <SeoLinksSection title={seoText.playerTeamsTitle(locale, player.name)} links={teamLinks} />
    </>
  );
}
