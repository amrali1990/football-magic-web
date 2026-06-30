'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useAppSelector } from '@/store/hooks';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { localizeNumber } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NoData } from '@/components/ui/NoData';
import { PageHeader } from '@/components/layout/PageHeader';
import { Loader2 } from 'lucide-react';

interface PlayerStat {
  playerId: number;
  playerName: string;
  playerPhoto: string;
  teamId: number;
  teamName: string;
  teamLogo: string;
  goals?: number;
  assists?: number;
  goalsAssists?: number;
  yellowCards?: number;
  redCards?: number;
  appearances?: number;
  minutes?: number;
  saves?: number;
}

interface PageResponse {
  content: PlayerStat[];
  totalPages: number;
  totalElements: number;
  number: number;
  last: boolean;
}

const STAT_VALUE_KEY: Record<string, keyof PlayerStat> = {
  topGoals: 'goals',
  topAssists: 'assists',
  topGoalsAssists: 'goalsAssists',
  topYellowCards: 'yellowCards',
  topRedCards: 'redCards',
  topAppearances: 'appearances',
  topMinutes: 'minutes',
  topSaves: 'saves',
};

export default function LeagueStatsPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const leagueId = Number(params.id);
  const category = params.category as string;
  const seasonParam = searchParams.get('season');
  const { code: lng } = useAppSelector((state) => state.language.language);
  const storedSeason = useAppSelector((state) => state.leagueSeason.season);
  const season = seasonParam ? Number(seasonParam) : (storedSeason?.year ?? 0);
  const { t } = useTranslation(lng);

  const [players, setPlayers] = useState<PlayerStat[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchPage = useCallback(async (pageNum: number) => {
    try {
      const data = await api.leagues.getTopPlayersByCategory(leagueId, season, category, pageNum, lng) as PageResponse;
      const items = data?.content || [];
      if (pageNum === 0) {
        setPlayers(items);
      } else {
        setPlayers((prev) => [...prev, ...items]);
      }
      setHasMore(!data?.last && items.length > 0);
    } catch {
      if (pageNum === 0) setPlayers([]);
      setHasMore(false);
    }
  }, [leagueId, season, category, lng]);

  useEffect(() => {
    setLoading(true);
    setPage(0);
    fetchPage(0).finally(() => setLoading(false));
  }, [fetchPage]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    setPage(nextPage);
    await fetchPage(nextPage);
    setLoadingMore(false);
  };

  const valueKey = STAT_VALUE_KEY[category];

  if (loading) return <LoadingSpinner />;
  if (!players.length) return <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />;

  return (
    <div className="flex flex-col">
      <PageHeader>
        <div className="px-4 py-3">
          <h1 className="text-[17px] font-bold text-gray-900">{t(category)}</h1>
          <span className="text-[12px] text-gray-500">
            {localizeNumber(players.length, lng)} {t('PlayersStatistics')}
          </span>
        </div>
      </PageHeader>

      <div className="p-3">
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          {players.map((stat, index) => {
            const value = valueKey ? stat[valueKey] : 0;
            return (
              <div key={`${stat.playerId}-${index}`}>
                {index > 0 && <div className="mx-4 border-t border-gray-50" />}
                <Link
                  href={`/player/${stat.playerId}`}
                  className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
                >
                  <span className="w-6 text-center text-[12px] font-semibold text-gray-400">
                    {localizeNumber(index + 1, lng)}
                  </span>
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-full bg-gray-100">
                    {stat.playerPhoto ? (
                      <Image src={stat.playerPhoto} alt={stat.playerName} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="h-full w-full bg-gray-200" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-medium text-gray-900 line-clamp-1">{stat.playerName}</p>
                    <div className="flex items-center gap-1.5">
                      {stat.teamLogo && (
                        <div className="relative h-3.5 w-3.5 shrink-0">
                          <Image src={stat.teamLogo} alt={stat.teamName} fill className="object-contain" unoptimized />
                        </div>
                      )}
                      <span className="text-[11px] text-gray-500 line-clamp-1">{stat.teamName}</span>
                    </div>
                  </div>
                  <span className="text-[15px] font-bold text-orange-500">{localizeNumber(value ?? 0, lng)}</span>
                </Link>
              </div>
            );
          })}
        </div>

        {hasMore && (
          <button
            onClick={loadMore}
            disabled={loadingMore}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white py-3 text-[13px] font-medium text-gray-600 transition-colors hover:bg-gray-50"
          >
            {loadingMore ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('Loading')}
              </>
            ) : (
              t('Load_More')
            )}
          </button>
        )}
      </div>
    </div>
  );
}
