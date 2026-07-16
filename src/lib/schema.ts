// schema.org JSON-LD builders. Values may be null/undefined — the <JsonLd />
// component strips empty fields before rendering, so builders can map API data
// directly without defensive checks. Builders take a locale so the Arabic
// pages (/ar/...) emit Arabic names, Arabic URLs, and inLanguage: "ar".

import type { Team, League, Fixture, Player, Venue } from '@/types';
import type { SquadPlayer } from '@/lib/server-api';
import { SITE_URL, SITE_NAME, absoluteUrl, teamPath, playerPath, leaguePath, matchPath, formatSeoDate, Locale, DEFAULT_LOCALE } from '@/lib/seo';

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
    sameAs: [
      'https://apps.apple.com/sa/app/football-magic-live-scores/id6495483675',
      'https://play.google.com/store/apps/details?id=com.magic.football',
    ],
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

// Pseudo-countries the football API uses for international competitions
// (league.country of e.g. "World Cup - Qualification Europe") — not valid
// postal-address countries, so they must not end up in addressCountry.
const PSEUDO_COUNTRIES = new Set([
  'world', 'international', 'europe', 'africa', 'asia',
  'south america', 'north america', 'oceania',
  'العالم', 'دولي', 'أوروبا', 'أفريقيا', 'آسيا', 'أمريكا الجنوبية', 'أمريكا الشمالية',
]);

function realCountryName(name?: string | null): string | undefined {
  const trimmed = name?.trim();
  if (!trimmed || PSEUDO_COUNTRIES.has(trimmed.toLowerCase())) return undefined;
  return trimmed;
}

/**
 * Google requires Event.location — an Event without it gets "Missing field
 * location" in Search Console, and <JsonLd /> silently strips an undefined
 * one. Always returns a Place (with a nested PostalAddress when any address
 * data exists; never a bare PostalAddress), falling back from the stadium to
 * the venue city, the league's country, and finally the home team's name —
 * for national teams that IS the country, and for clubs it is still the
 * truthful "at <home team>" place. Matches are physical events
 * (OfflineEventAttendanceMode), so a physical location is always appropriate.
 */
function eventLocationSchema(fixture: Fixture) {
  const venueName = fixture.venue?.name?.trim() || undefined;
  const city = fixture.venue?.city?.trim() || undefined;
  const street = fixture.venue?.address?.trim() || undefined;
  const country = realCountryName(fixture.league?.country?.name);

  const name = venueName ?? city ?? country ?? (fixture.teams?.home?.name?.trim() || undefined);
  if (!name && !country) {
    // Unreachable for real fixtures (home team always has a name); the guard
    // exists so a regression is loud in dev instead of silently shipping
    // Events that fail Google's required-field check again.
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[schema] SportsEvent for fixture ${fixture.id} has no resolvable location — it will fail Google's Event validation`);
    }
    return undefined;
  }
  return {
    '@type': 'Place',
    name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: street,
      addressLocality: city,
      addressCountry: country,
    },
  };
}

// schema.org only defines scheduled/postponed/cancelled statuses for events.
function eventStatus(statusShort?: string) {
  if (!statusShort) return undefined;
  if (statusShort === 'PST') return 'https://schema.org/EventPostponed';
  if (['CANC', 'ABD'].includes(statusShort)) return 'https://schema.org/EventCancelled';
  return 'https://schema.org/EventScheduled';
}

const FINISHED_EVENT_STATUSES = ['FT', 'AET', 'PEN'];

export function sportsEventSchema(fixture: Fixture, locale: Locale = DEFAULT_LOCALE) {
  const home = fixture.teams?.home;
  const away = fixture.teams?.away;
  const joiner = locale === 'ar' ? 'ضد' : 'vs';
  // schema.org has no dedicated score property, so the convention is to carry
  // the final score in the event name/description once the match finished.
  const finished =
    FINISHED_EVENT_STATUSES.includes(fixture.status?.short ?? '') &&
    fixture.goals?.home != null &&
    fixture.goals?.away != null;
  const name =
    home?.name && away?.name
      ? finished
        ? `${home.name} ${fixture.goals.home}–${fixture.goals.away} ${away.name}`
        : `${home.name} ${joiner} ${away.name}`
      : undefined;
  const description = name
    ? `${name} – ${fixture.league?.name ?? 'Football'}${fixture.date ? `, ${formatSeoDate(fixture.date, locale)}` : ''}`
    : undefined;
  return {
    '@context': 'https://schema.org',
    '@type': 'SportsEvent',
    name,
    description,
    sport: SPORT,
    inLanguage: locale,
    url: absoluteUrl(matchPath(fixture.id, home?.name, away?.name, locale)),
    startDate: fixture.date,
    eventStatus: eventStatus(fixture.status?.short),
    // Football matches are always physical events, which is also why a
    // physical location below is always emitted.
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: eventLocationSchema(fixture),
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

export interface BreadcrumbItem {
  name: string;
  path: string;
}

/** BreadcrumbList matching the page's place in the site (Home is prepended). */
export function breadcrumbSchema(locale: Locale, items: BreadcrumbItem[]) {
  const home: BreadcrumbItem = { name: locale === 'ar' ? 'الرئيسية' : 'Home', path: locale === 'ar' ? '/ar' : '/' };
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [home, ...items.filter((i) => i.name && i.path)].map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
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
