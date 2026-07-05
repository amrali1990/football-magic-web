'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NoData } from '@/components/ui/NoData';
import { useTranslation } from '@/i18n';
import { localizeNumber, playerHref } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface LeaguePlayersStatsTabProps {
  leagueId: number;
  season: number;
  lng: string;
}

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

interface PlayersStatsData {
  [key: string]: PlayerStat[] | undefined;
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

const STAT_CATEGORIES = [
  'topMinutes',
  'topAppearances',
  'topGoals',
  'topAssists',
  'topGoalsAssists',
  'topRedCards',
  'topYellowCards',
  'topSaves',
];

export function LeaguePlayersStatsTab({ leagueId, season, lng }: LeaguePlayersStatsTabProps) {
  const [data, setData] = useState<PlayersStatsData>({});
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation(lng);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      try {
        const result = await api.leagues.getPlayersStatistics(leagueId, season, lng) as PlayersStatsData;
        setData(result || {});
      } catch {
        setData({});
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [leagueId, season, lng]);

  if (loading) return <LoadingSpinner />;

  const available = STAT_CATEGORIES.filter((key) => data[key]?.length);
  if (!available.length) return <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />;

  return (
    <div className="space-y-3">
      {available.map((category) => {
        const players = data[category] || [];
        const valueKey = STAT_VALUE_KEY[category];
        return (
          <div key={category} className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-[13px] font-semibold text-gray-700">{t(category)}</span>
              <Link
                href={`/league/${leagueId}/stats/${category}?season=${season}`}
                className="flex items-center gap-0.5 text-[12px] font-medium text-blue-500"
              >
                {t('Show_All')}
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="border-t border-gray-100">
              {players.map((stat, index) => {
                const value = valueKey ? stat[valueKey] : 0;
                return (
                  <div key={stat.playerId ?? index}>
                    {index > 0 && <div className="mx-4 border-t border-gray-50" />}
                    <Link
                      href={playerHref(stat.playerId, stat.playerName)}
                      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50"
                    >
                      <span className="w-5 text-center text-[12px] font-semibold text-gray-400">
                        {localizeNumber(index + 1, lng)}
                      </span>
                      <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-100">
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
          </div>
        );
      })}
    </div>
  );
}
