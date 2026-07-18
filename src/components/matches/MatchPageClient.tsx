'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { normalizeFixtureResponse, MatchData } from '@/lib/normalize';
import { leagueHref, teamHref, rememberLeagueName } from '@/lib/utils';
import { Tabs } from '@/components/ui/Tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MatchInfoTab } from '@/components/matches/MatchInfoTab';
import { MatchEventsTab } from '@/components/matches/MatchEventsTab';
import { MatchLineupTab } from '@/components/matches/MatchLineupTab';
import { MatchH2HTab } from '@/components/matches/MatchH2HTab';
import { PageHeader } from '@/components/layout/PageHeader';
import { SeoIntro } from '@/components/seo/SeoSections';
import { useRouteLanguageSync } from '@/lib/useRouteLanguageSync';
import { SidebarScope } from '@/lib/layout-context';
import { getMatchStatusColor, formatMatchTime, localizeNumber } from '@/lib/utils';

interface MatchPageClientProps {
  matchId: number;
  initialData: MatchData;
  /** Locale the server fetched initialData in ('en' route or '/ar' route). */
  initialLng?: string;
  /** Server-generated intro paragraph (SEO copy rendered into the static HTML). */
  intro?: string;
  introLabel?: string;
}

export function MatchPageClient({ matchId, initialData, initialLng = 'en', intro, introLabel }: MatchPageClientProps) {
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);
  useRouteLanguageSync(initialLng);

  const [data, setData] = useState<MatchData | null>(initialData);
  const [loading, setLoading] = useState(false);
  // The server fetched the initial data in the route's locale; only refetch
  // when the user's language differs (e.g. restored from persisted state).
  const fetchedLng = useRef(initialLng);

  useEffect(() => {
    if (lng === fetchedLng.current) return;
    fetchedLng.current = lng;
    let stale = false;
    const fetchFixture = async () => {
      setLoading(true);
      try {
        const response = await api.matches.getFixture(matchId, lng);
        const normalized = normalizeFixtureResponse(response);
        if (normalized && !stale) setData(normalized);
      } catch {
        // Keep showing the previously loaded data on refetch failure.
      } finally {
        if (!stale) setLoading(false);
      }
    };
    fetchFixture();
    return () => { stale = true; };
  }, [matchId, lng]);

  if (!data) return loading ? <LoadingSpinner /> : null;

  const { fixture, statistics, hasEvents, hasLineup } = data;

  const statusShort = fixture.status?.short ?? '';
  const isLive = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(statusShort);
  const isNotStarted = statusShort === 'NS' || statusShort === 'TBD';
  const pen = fixture.score?.penalty;
  const hasPenaltyResult =
    pen != null &&
    pen.home != null &&
    pen.away != null &&
    (['P', 'PEN'].includes(statusShort) || Number(pen.home) > 0 || Number(pen.away) > 0);

  const tabs = [
    { key: 'info', label: t('MatchInfo'), content: <MatchInfoTab fixture={fixture} statistics={statistics} lng={lng} /> },
    ...(hasEvents ? [{ key: 'events', label: t('Events'), content: <MatchEventsTab matchId={matchId} homeTeamId={fixture.teams.home.id} lng={lng} /> }] : []),
    ...(hasLineup ? [{ key: 'lineup', label: t('LineUp'), content: <MatchLineupTab matchId={matchId} lng={lng} /> }] : []),
    { key: 'h2h', label: t('Head2Head'), content: <MatchH2HTab matchId={matchId} lng={lng} /> },
  ];

  const scoreline = !isNotStarted && fixture.goals.home != null && fixture.goals.away != null
    ? `${fixture.teams.home.name} ${fixture.goals.home}–${fixture.goals.away} ${fixture.teams.away.name}`
    : `${fixture.teams.home.name} ${lng === 'ar' ? 'ضد' : 'vs'} ${fixture.teams.away.name}`;

  return (
    <div className="flex flex-col">
      {/* Sidebar shows top leagues/teams from this competition's country. */}
      {fixture.league?.id ? <SidebarScope params={{ leagueId: fixture.league.id }} /> : null}
      {/* The visual header is a logo/score grid; this gives the page its
          single H1 (the match itself) for the document outline. */}
      <h1 className="sr-only">{scoreline}</h1>
      <PageHeader>
        <Link href={leagueHref(fixture.league.id, fixture.league.name, undefined, lng)} onClick={() => rememberLeagueName(fixture.league.id, fixture.league.name, lng)} className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 transition-colors hover:bg-gray-50">
          {fixture.league.logo && (
            <div className="relative h-5 w-5">
              <Image src={fixture.league.logo} alt={fixture.league.name} fill className="object-contain" unoptimized />
            </div>
          )}
          <span className="text-xs font-medium text-gray-600">{fixture.league.name}</span>
        </Link>

        <div className="flex items-center justify-center gap-4 px-4 py-6">
          <Link href={teamHref(fixture.teams.home.id, fixture.teams.home.name, lng)} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative h-14 w-14">
              {fixture.teams.home.logo && (
                <Image src={fixture.teams.home.logo} alt={fixture.teams.home.name} fill className="object-contain" unoptimized />
              )}
            </div>
            <span className="text-center text-xs font-medium text-gray-900">{fixture.teams.home.name}</span>
          </Link>

          <div className="flex flex-col items-center">
            {isNotStarted ? (
              // Kickoff time renders in the visitor's timezone, which can
              // differ from the server-rendered HTML — patch, don't warn.
              <span suppressHydrationWarning className="text-lg font-bold text-gray-500">{formatMatchTime(fixture.date, lng)}</span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-gray-900">{localizeNumber(fixture.goals.home, lng)}</span>
                <span className="text-lg text-gray-400">-</span>
                <span className="text-3xl font-bold text-gray-900">{localizeNumber(fixture.goals.away, lng)}</span>
              </div>
            )}
            {hasPenaltyResult ? (
              <span className="mt-0.5 whitespace-nowrap text-xs font-semibold text-gray-500">
                {`${localizeNumber(pen!.home, lng)}-${localizeNumber(pen!.away, lng)}`}
              </span>
            ) : null}
            <span className={`mt-1 text-sm font-medium ${getMatchStatusColor(statusShort)}`}>
              {isLive && fixture.status.elapsed
                ? `${localizeNumber(fixture.status.elapsed, lng)}'`
                : t(`${statusShort}_LONG`) || t(statusShort) || statusShort}
            </span>
          </div>

          <Link href={teamHref(fixture.teams.away.id, fixture.teams.away.name, lng)} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative h-14 w-14">
              {fixture.teams.away.logo && (
                <Image src={fixture.teams.away.logo} alt={fixture.teams.away.name} fill className="object-contain" unoptimized />
              )}
            </div>
            <span className="text-center text-xs font-medium text-gray-900">{fixture.teams.away.name}</span>
          </Link>
        </div>
      </PageHeader>

      {intro && <SeoIntro label={introLabel ?? 'About this match'} text={intro} />}

      <div className="p-3">
        {loading ? <LoadingSpinner /> : <Tabs tabs={tabs} />}
      </div>
    </div>
  );
}
