// schema.org JSON-LD builders. Values may be null/undefined — the <JsonLd />
// component strips empty fields before rendering, so builders can map API data
// directly without defensive checks. Builders take a locale so the Arabic
// pages (/ar/...) emit Arabic names, Arabic URLs, and inLanguage: "ar".

import type { Team, League, Fixture, Player, Venue } from '@/types';
import type { SquadPlayer } from '@/lib/server-api';
import { SITE_URL, SITE_NAME, absoluteUrl, teamPath, playerPath, leaguePath, matchPath, Locale, DEFAULT_LOCALE } from '@/lib/seo';

const SPORT = 'Soccer';

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: absoluteUrl('/icon.png'),
    description:
      'Football Magic provides live football scores, fixtures, results, league standings, team squads, and player statistics for leagues and cups worldwide, in English and Arabic.',
  };
}

export function webSiteSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    inLanguage: ['en', 'ar'],
    publisher: { '@type': 'Organization', name: SITE_NAME, url: SITE_URL },
  };
}

function venueSchema(venue?: Venue | null) {
  if (!venue?.name) return undefined;
  return {
    '@type': 'StadiumOrArena',
    name: venue.name,
    address: venue.address || venue.city
      ? { '@type': 'PostalAddress', streetAddress: venue.address, addressLocality: venue.city }
      : undefined,
    maximumAttendeeCapacity: venue.capacity || undefined,
    image: venue.image,
  };
}

export function sportsTeamSchema(
  team: Team,
  options?: { leagueName?: string; squad?: SquadPlayer[]; locale?: Locale }
) {
  const locale = options?.locale ?? DEFAULT_LOCALE;
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsTeam',
    name: team.name,
    sport: SPORT,
    inLanguage: locale,
    url: absoluteUrl(teamPath(team.id, team.name, locale)),
    logo: team.logo,
    foundingDate: team.founded ? String(team.founded) : undefined,
    location: venueSchema(team.venue) ?? team.country?.name,
    memberOf: options?.leagueName
      ? { '@type': 'SportsOrganization', name: options.leagueName }
      : undefined,
    athlete: options?.squad?.slice(0, 40).map((p) => ({
      '@type': 'Person',
      name: p.name,
      url: absoluteUrl(playerPath(p.id, p.name, locale)),
      image: p.photo,
    })),
  };
}

export function personSchema(
  player: Player,
  options?: { teamName?: string; position?: string; locale?: Locale }
) {
  const locale = options?.locale ?? DEFAULT_LOCALE;
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: player.name,
    url: absoluteUrl(playerPath(player.id, player.name, locale)),
    image: player.photo,
    nationality: player.nationality,
    birthDate: player.birthDate,
    birthPlace: player.birthPlace,
    height: player.height ? `${player.height} cm` : undefined,
    weight: player.weight ? `${player.weight} kg` : undefined,
    jobTitle: options?.position || player.position || (locale === 'ar' ? 'لاعب كرة قدم' : 'Football Player'),
    affiliation: options?.teamName ? { '@type': 'SportsTeam', name: options.teamName, sport: SPORT } : undefined,
  };
}

// schema.org only defines scheduled/postponed/cancelled statuses for events.
function eventStatus(statusShort?: string) {
  if (!statusShort) return undefined;
  if (statusShort === 'PST') return 'https://schema.org/EventPostponed';
  if (['CANC', 'ABD'].includes(statusShort)) return 'https://schema.org/EventCancelled';
  return 'https://schema.org/EventScheduled';
}

export function sportsEventSchema(fixture: Fixture, locale: Locale = DEFAULT_LOCALE) {
  const home = fixture.teams?.home;
  const away = fixture.teams?.away;
  const joiner = locale === 'ar' ? 'ضد' : 'vs';
  const name = home?.name && away?.name ? `${home.name} ${joiner} ${away.name}` : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name,
    sport: SPORT,
    inLanguage: locale,
    url: absoluteUrl(matchPath(fixture.id, home?.name, away?.name, locale)),
    startDate: fixture.date,
    eventStatus: eventStatus(fixture.status?.short),
    location: venueSchema(fixture.venue),
    homeTeam: home?.name
      ? { '@type': 'SportsTeam', name: home.name, sport: SPORT, url: absoluteUrl(teamPath(home.id, home.name, locale)), logo: home.logo }
      : undefined,
    awayTeam: away?.name
      ? { '@type': 'SportsTeam', name: away.name, sport: SPORT, url: absoluteUrl(teamPath(away.id, away.name, locale)), logo: away.logo }
      : undefined,
    competitor: [home, away]
      .filter((t) => t?.name)
      .map((t) => ({ '@type': 'SportsTeam', name: t!.name, sport: SPORT, url: absoluteUrl(teamPath(t!.id, t!.name, locale)) })),
    superEvent: fixture.league?.name
      ? { '@type': 'EventSeries', name: fixture.league.name, url: absoluteUrl(leaguePath(fixture.league.id, fixture.league.name, locale)) }
      : undefined,
  };
}

export function sportsOrganizationSchema(league: League, locale: Locale = DEFAULT_LOCALE) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsOrganization',
    name: league.name,
    sport: SPORT,
    inLanguage: locale,
    url: absoluteUrl(leaguePath(league.id, league.name, locale)),
    logo: league.logo,
    areaServed: league.country?.name,
  };
}

export interface FaqItem {
  question: string;
  answer: string;
}

export function faqPageSchema(items: FaqItem[], locale: Locale = DEFAULT_LOCALE) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    inLanguage: locale,
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };
}
