// Shared server implementation of the match page, parameterized by locale.
// See TeamEntityPage.tsx for the en/ar route pattern.

import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import Link from 'next/link';
import { getFixture, getFixtureEvents, getFixtureLineup, RawMatchEvent, RawFixtureLineup, RawTeamLineup } from '@/lib/server-api';
import { matchPath, teamPath, leaguePath, playerPath, metaDescription, languageAlternates, requestedEntityPath, pathsMatch, SITE_NAME, Locale } from '@/lib/seo';
import { seoText } from '@/lib/seo-i18n';
import { sportsEventSchema, breadcrumbSchema } from '@/lib/schema';
import { JsonLd } from '@/components/seo/JsonLd';
import { SeoLinksSection, SeoLink, CollapsibleCard } from '@/components/seo/SeoSections';
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
      images: [{ url: `/og/match/${fixture.id}`, width: 1200, height: 630, alt: name }],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | ${SITE_NAME}`,
      description,
      images: [`/og/match/${fixture.id}`],
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

  // Events and starting line-ups go into the crawlable HTML (collapsed
  // sections); the interactive tabs keep their lazy client fetching.
  const [events, lineup] = await Promise.all([
    data.hasEvents ? getFixtureEvents(fixture.id, locale) : Promise.resolve([]),
    data.hasLineup ? getFixtureLineup(fixture.id, locale) : Promise.resolve(null),
  ]);

  const introParts = [
    seoText.matchIntro(locale, {
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
    }),
  ];
  // One self-contained goals sentence per team — the fact format AI answer
  // engines cite best ("Goals for France: K. Mbappé (54' (pen.)).").
  const GOAL_TYPES = [1, 2, 3];
  for (const side of [fixture.teams.home, fixture.teams.away]) {
    const scorers = events
      .filter((e) => GOAL_TYPES.includes(e.type) && e.teamId === side.id && e.player?.name)
      .map((e) => seoText.scorerEntry(locale, e.player!.name, e.time, e.type));
    if (scorers.length > 0) introParts.push(seoText.goalsFact(locale, side.name, scorers));
  }

  const links: SeoLink[] = [
    { href: teamPath(fixture.teams.home.id, fixture.teams.home.name, locale), label: fixture.teams.home.name },
    { href: teamPath(fixture.teams.away.id, fixture.teams.away.name, locale), label: fixture.teams.away.name },
    ...(fixture.league?.id ? [{ href: leaguePath(fixture.league.id, fixture.league.name, locale), label: fixture.league.name }] : []),
  ];

  const breadcrumb = breadcrumbSchema(locale, [
    ...(fixture.league?.id ? [{ name: fixture.league.name, path: leaguePath(fixture.league.id, fixture.league.name, locale) }] : []),
    { name: matchName(fixture, locale), path: canonical },
  ]);

  return (
    <>
      <JsonLd data={sportsEventSchema(fixture, locale)} />
      <JsonLd data={breadcrumb} />
      <MatchPageClient
        matchId={fixture.id}
        initialData={data}
        initialLng={locale}
        intro={introParts.join(' ')}
        introLabel={seoText.aboutMatchLabel(locale)}
      />
      <MatchEventsSection events={events} fixture={fixture} locale={locale} />
      <LineupsSection lineup={lineup} locale={locale} />
      <SeoLinksSection title={seoText.matchLinksTitle(locale)} links={links} />
    </>
  );
}

function MatchEventsSection({ events, fixture, locale }: { events: RawMatchEvent[]; fixture: Fixture; locale: Locale }) {
  const valid = events.filter((e) => e.player?.name && e.time != null);
  if (valid.length === 0) return null;
  const teamName = (teamId: number) =>
    teamId === fixture.teams.home.id ? fixture.teams.home.name : teamId === fixture.teams.away.id ? fixture.teams.away.name : '';
  return (
    <CollapsibleCard title={seoText.matchEventsTitle(locale)}>
      <ol className="space-y-1.5 px-4 pb-3">
        {valid.map((event) => {
          // Substitution events carry the incoming player in `assist` and the
          // outgoing player in `player` (mirrors the interactive Events tab);
          // an "(assist: …)" reading would mislabel the outgoing player.
          const isSubstitution = event.type === 8 && !!event.assist?.name;
          // Only actual goals (1 normal, 2 own goal, 3 penalty) have assists.
          const showAssist = [1, 2, 3].includes(event.type) && !!event.assist?.name;
          return (
            <li key={event.id} className="text-[13px] leading-relaxed text-gray-600">
              <span className="font-semibold text-gray-800">{seoText.minuteLabel(locale, event.time)}</span>{' '}
              {seoText.eventTypeLabel(locale, event.type)}
              {' – '}
              {isSubstitution ? (
                <>
                  {seoText.substitutionInLabel(locale)}:{' '}
                  {event.assist!.id ? (
                    <Link href={playerPath(event.assist!.id, event.assist!.name, locale)} className="font-medium text-gray-800 hover:text-orange-600">
                      {event.assist!.name}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-800">{event.assist!.name}</span>
                  )}
                  {locale === 'ar' ? '، ' : ', '}
                  {seoText.substitutionOutLabel(locale)}:{' '}
                  <Link href={playerPath(event.player!.id, event.player!.name, locale)} className="font-medium text-gray-800 hover:text-orange-600">
                    {event.player!.name}
                  </Link>
                </>
              ) : (
                <>
                  <Link href={playerPath(event.player!.id, event.player!.name, locale)} className="font-medium text-gray-800 hover:text-orange-600">
                    {event.player!.name}
                  </Link>
                  {showAssist ? ` (${seoText.assistLabel(locale)}: ${event.assist!.name})` : ''}
                </>
              )}
              {teamName(event.teamId) ? ` – ${teamName(event.teamId)}` : ''}
            </li>
          );
        })}
      </ol>
    </CollapsibleCard>
  );
}

function LineupsSection({ lineup, locale }: { lineup: RawFixtureLineup | null; locale: Locale }) {
  const sides = [lineup?.homeTeam, lineup?.awayTeam].filter(
    (side): side is RawTeamLineup => !!side?.team?.name && !!side.players?.length
  );
  if (sides.length === 0) return null;
  return (
    <CollapsibleCard title={seoText.lineupsTitle(locale)}>
      <div className="grid gap-4 px-4 pb-3 sm:grid-cols-2">
        {sides.map((side) => (
          <div key={side.team.id}>
            <h3 className="text-[13px] font-semibold text-gray-800">
              {side.team.name}
              {side.formation ? ` — ${seoText.formationLabel(locale)}: ${side.formation}` : ''}
            </h3>
            <ul className="mt-1.5 space-y-1">
              {(side.players ?? []).flat().map(({ player }) => (
                <li key={player.id} className="text-[13px] text-gray-600">
                  {player.number != null ? `${player.number}. ` : ''}
                  <Link href={playerPath(player.id, player.name, locale)} className="hover:text-orange-600">
                    {player.name}
                  </Link>
                  {player.pos ? ` (${player.pos})` : ''}
                </li>
              ))}
            </ul>
            {side.coach?.name && (
              <p className="mt-1.5 text-[12px] text-gray-500">
                {seoText.coachLabel(locale)}: {side.coach.name}
              </p>
            )}
          </div>
        ))}
      </div>
    </CollapsibleCard>
  );
}
