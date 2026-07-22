'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSeason } from '@/store/slices/leagueSeasonSlice';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import type { League, Season } from '@/types';
import { normalizeLeague, RawLeagueResponse } from '@/lib/normalize';
import { Tabs } from '@/components/ui/Tabs';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { LeagueMatchesTab } from '@/components/leagues/LeagueMatchesTab';
import { StandingsTable } from '@/components/leagues/StandingsTable';
import { LeaguePlayersStatsTab } from '@/components/leagues/LeaguePlayersStatsTab';
import { LeagueWinnersTab } from '@/components/leagues/LeagueWinnersTab';
import { LeagueInfoTab } from '@/components/leagues/LeagueInfoTab';
import { PageHeader } from '@/components/layout/PageHeader';
import { SeoIntro } from '@/components/seo/SeoSections';
import { useRouteLanguageSync } from '@/lib/useRouteLanguageSync';
import { SidebarScope } from '@/lib/layout-context';
import { localizeNumber, recallLeagueName } from '@/lib/utils';

interface LeaguePageClientProps {
  leagueId: number;
  initialData: League;
  /** Locale the server fetched initialData in ('en' route or '/ar' route). */
  initialLng?: string;
  /** Server-generated intro paragraph (SEO copy rendered into the static HTML). */
  intro?: string;
  introLabel?: string;
}

export function LeaguePageClient({ leagueId, initialData, initialLng = 'en', intro, introLabel }: LeaguePageClientProps) {
  const dispatch = useAppDispatch();
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);
  useRouteLanguageSync(initialLng);

  const [league, setLeague] = useState<League | null>(initialData);
  const initialSeason = initialData.seasons?.find((s) => s.current) ?? initialData.seasons?.[0];
  const [selectedSeason, setSelectedSeason] = useState<number | null>(initialSeason?.year ?? null);
  const [loading, setLoading] = useState(false);
  // The server fetched the initial data in the route's locale; only refetch
  // when the user's language differs (e.g. restored from persisted state).
  const fetchedLng = useRef(initialLng);

  // Display name passed from the page the user clicked (already localized
  // there). Used only while it matches the current language, so the header
  // shows the selected language even when the getLeague response has no
  // translation for this league.
  const [passedName, setPassedName] = useState<string | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPassedName(recallLeagueName(leagueId, lng));
  }, [leagueId, lng]);

  // Publish the current season to the store once on mount (mirrors the
  // behaviour of the previous client-fetching page).
  const seasonPublished = useRef(false);
  useEffect(() => {
    if (seasonPublished.current) return;
    seasonPublished.current = true;
    const current = initialData.seasons?.find((s: Season) => s.current);
    if (current) dispatch(setSeason(current));
  }, [dispatch, initialData]);

  useEffect(() => {
    if (lng === fetchedLng.current) return;
    fetchedLng.current = lng;
    let stale = false;
    const fetchLeague = async () => {
      setLoading(true);
      try {
        const response = await api.leagues.getLeague(leagueId, lng) as RawLeagueResponse;
        if (!stale) setLeague(normalizeLeague(response, leagueId));
      } catch {
        // Keep showing the previously loaded data on refetch failure.
      } finally {
        if (!stale) setLoading(false);
      }
    };
    fetchLeague();
    return () => { stale = true; };
  }, [leagueId, lng]);

  if (!league) return loading ? <LoadingSpinner /> : null;

  const displayName = passedName ?? league.name;

  // Mirror the mobile LeagueScreen: the Table and Players Statistics tabs are
  // shown only when the currently selected season covers them, and the Winners
  // tab only when the league has a winners history. Matches and Info are always
  // available.
  const selectedSeasonObj = league.seasons?.find((s) => s.year === selectedSeason);
  const showStandings = !!selectedSeasonObj?.coverage?.standings;
  const showPlayersStats = !!selectedSeasonObj?.coverage?.statisticsPlayers;
  const showWinners = !!league.winners;

  const tabs = [
    {
      key: 'matches',
      label: t('LeagueMatches'),
      content: selectedSeason ? <LeagueMatchesTab leagueId={leagueId} season={selectedSeason} lng={lng} /> : null,
    },
    ...(showStandings
      ? [{
          key: 'standings',
          label: t('Table'),
          content: selectedSeason ? <StandingsTable leagueId={leagueId} season={selectedSeason} lng={lng} /> : null,
        }]
      : []),
    ...(showPlayersStats
      ? [{
          key: 'players',
          label: t('PlayersStatistics'),
          content: selectedSeason ? <LeaguePlayersStatsTab leagueId={leagueId} season={selectedSeason} lng={lng} /> : null,
        }]
      : []),
    ...(showWinners
      ? [{
          key: 'winners',
          label: t('LeagueWinners'),
          content: <LeagueWinnersTab leagueId={leagueId} lng={lng} />,
        }]
      : []),
    {
      key: 'info',
      label: t('LeagueInfo'),
      content: <LeagueInfoTab league={league} lng={lng} />,
    },
  ];

  return (
    <div className="flex flex-col">
      {/* Sidebar shows top leagues/teams from this league's country. */}
      <SidebarScope params={{ leagueId }} />
      <PageHeader>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative h-9 w-9 shrink-0">
            {league.logo ? (
              <Image src={league.logo} alt={displayName} fill className="object-contain" unoptimized />
            ) : (
              <div className="h-full w-full rounded-lg bg-gray-100" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-bold text-gray-900 line-clamp-1">{displayName}</h1>
            <div className="flex items-center gap-1.5">
              {league.country?.flag && (
                <Image src={league.country.flag} alt={league.country.name} width={14} height={10} className="rounded-sm" unoptimized />
              )}
              <span className="text-[12px] text-gray-500">{league.country?.name}</span>
            </div>
          </div>

          {league.seasons && league.seasons.length > 0 && (
            <select
              value={selectedSeason || ''}
              onChange={(e) => {
                const year = Number(e.target.value);
                setSelectedSeason(year);
                const season = league.seasons?.find((s) => s.year === year);
                if (season) dispatch(setSeason(season));
              }}
              className="shrink-0 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 outline-none transition-colors hover:border-gray-300 focus:ring-2 focus:ring-orange-500/20"
            >
              {league.seasons.map((season) => (
                <option key={season.year} value={season.year}>
                  {localizeNumber(season.year, lng)}
                </option>
              ))}
            </select>
          )}

          <FavoriteButton entityId={league.id} entityType="LEAGUE" />
        </div>
      </PageHeader>

      {intro && <SeoIntro label={introLabel ?? `About ${league.name}`} text={intro} />}

      <div className="p-3">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <Tabs tabs={tabs} />
        )}
      </div>
    </div>
  );
}
