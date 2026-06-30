'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setSeason } from '@/store/slices/leagueSeasonSlice';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { League, Season } from '@/types';
import { Tabs } from '@/components/ui/Tabs';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { LeagueMatchesTab } from '@/components/leagues/LeagueMatchesTab';
import { StandingsTable } from '@/components/leagues/StandingsTable';
import { LeaguePlayersStatsTab } from '@/components/leagues/LeaguePlayersStatsTab';
import { LeagueWinnersTab } from '@/components/leagues/LeagueWinnersTab';
import { LeagueInfoTab } from '@/components/leagues/LeagueInfoTab';
import { PageHeader } from '@/components/layout/PageHeader';
import { localizeNumber } from '@/lib/utils';

export default function LeaguePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const leagueId = Number(params.id);
  const dispatch = useAppDispatch();
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);
  const qName = searchParams.get('name');
  const qLogo = searchParams.get('logo');

  const [league, setLeague] = useState<League | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeague = async () => {
      try {
        const response = await api.leagues.getLeague(leagueId, lng) as {
          league?: { id: number; name: string; type: string; logo: string };
          country?: { id?: number; code: string; flag: string; name: string };
          seasons?: Array<{ seasonId: number; year: string; label: string; start: string; end: string; current: boolean }>;
          expandable?: boolean;
          winners?: boolean;
        };
        const leagueData: League = {
          id: response.league?.id ?? leagueId,
          name: response.league?.name ?? '',
          logo: response.league?.logo ?? '',
          type: response.league?.type ?? '',
          country: {
            name: response.country?.name ?? '',
            code: response.country?.code ?? '',
            flag: response.country?.flag ?? '',
          },
          seasons: response.seasons?.map((s) => ({
            id: s.seasonId,
            year: Number(s.year),
            start: s.start,
            end: s.end,
            current: s.current,
          })),
        };
        setLeague(leagueData);
        const current = leagueData.seasons?.find((s: Season) => s.current);
        const year = current?.year || leagueData.seasons?.[0]?.year || null;
        setSelectedSeason(year);
        if (current) dispatch(setSeason(current));
      } catch {
        setLeague(null);
      } finally {
        setLoading(false);
      }
    };
    fetchLeague();
  }, [leagueId, lng, dispatch]);

  if (loading) return <LoadingSpinner />;
  if (!league) return null;

  return (
    <div className="flex flex-col">
      <PageHeader>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative h-9 w-9 shrink-0">
            {(qLogo || league.logo) ? (
              <Image src={qLogo || league.logo} alt={qName || league.name} fill className="object-contain" unoptimized />
            ) : (
              <div className="h-full w-full rounded-lg bg-gray-100" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-bold text-gray-900 line-clamp-1">{qName || league.name}</h1>
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

      <div className="p-3">
        <Tabs
          tabs={[
            {
              key: 'matches',
              label: t('LeagueMatches'),
              content: selectedSeason ? <LeagueMatchesTab leagueId={leagueId} season={selectedSeason} lng={lng} /> : null,
            },
            {
              key: 'standings',
              label: t('Table'),
              content: selectedSeason ? <StandingsTable leagueId={leagueId} season={selectedSeason} lng={lng} /> : null,
            },
            {
              key: 'players',
              label: t('PlayersStatistics'),
              content: selectedSeason ? <LeaguePlayersStatsTab leagueId={leagueId} season={selectedSeason} lng={lng} /> : null,
            },
            {
              key: 'winners',
              label: t('LeagueWinners'),
              content: <LeagueWinnersTab leagueId={leagueId} lng={lng} />,
            },
            {
              key: 'info',
              label: t('LeagueInfo'),
              content: <LeagueInfoTab league={league} lng={lng} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
