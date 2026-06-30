'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { Standing } from '@/types';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NoData } from '@/components/ui/NoData';
import { useTranslation } from '@/i18n';
import { localizeNumber } from '@/lib/utils';
import { TableProperties } from 'lucide-react';
import { TeamSeasonStatsModal, TeamStatistics } from '@/components/teams/TeamSeasonStatsModal';

interface StandingsTableProps {
  leagueId: number;
  season: number;
  lng: string;
}

export function StandingsTable({ leagueId, season, lng }: StandingsTableProps) {
  const [standings, setStandings] = useState<Standing[][]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation(lng);

  // Team season statistics modal (reused from the team page)
  const [stats, setStats] = useState<TeamStatistics | null>(null);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const openTeamStats = async (teamId: number) => {
    setSelectedTeamId(teamId);
    setStatsLoading(true);
    try {
      const data = await api.teams.getStatistics(teamId, leagueId, season, lng) as TeamStatistics;
      setStats(data);
    } catch {
      setStats(null);
      setSelectedTeamId(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const closeTeamStats = () => {
    setStats(null);
    setSelectedTeamId(null);
  };

  useEffect(() => {
    const fetchStandings = async () => {
      setLoading(true);
      try {
        const data = await api.leagues.getStandings(leagueId, season, lng) as
          { standings?: Standing[][] } | Standing[][] | Standing[];
        let parsed: Standing[][] = [];
        if (data && typeof data === 'object' && 'standings' in data && Array.isArray(data.standings)) {
          parsed = data.standings;
        } else if (Array.isArray(data)) {
          if (data.length > 0 && Array.isArray(data[0])) {
            parsed = data as Standing[][];
          } else {
            parsed = [data as Standing[]];
          }
        }
        setStandings(parsed);
      } catch {
        setStandings([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();
  }, [leagueId, season, lng]);

  if (loading) return <LoadingSpinner />;
  if (!standings.length) return <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />;

  const n = (v: number) => localizeNumber(v, lng);

  return (
    <div className="space-y-3">
      {standings.map((group, groupIndex) => (
        <div key={groupIndex} className="rounded-xl border border-gray-100 bg-white shadow-sm">
          {group[0]?.group && standings.length > 1 && (
            <div className="flex items-center gap-2.5 px-4 py-3">
              <TableProperties className="h-4 w-4 text-gray-400" />
              <span className="text-[13px] font-semibold text-gray-700">{group[0].group}</span>
              <span className="text-[11px] text-gray-400">
                {n(group.length)} {t('Teams')}
              </span>
            </div>
          )}
          <div className={group[0]?.group && standings.length > 1 ? 'border-t border-gray-100' : ''}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500">
                    <th className="w-8 px-2 py-2 text-center">{t('standingRank')}</th>
                    <th className="px-2 py-2 text-left">{t('Teams')}</th>
                    <th className="w-8 px-1 py-2 text-center">{t('standingPlayed')}</th>
                    <th className="w-8 px-1 py-2 text-center">{t('standingWin')}</th>
                    <th className="w-8 px-1 py-2 text-center">{t('standingDraw')}</th>
                    <th className="w-8 px-1 py-2 text-center">{t('standingLose')}</th>
                    <th className="w-8 px-1 py-2 text-center">{t('standingGoalsFor')}</th>
                    <th className="w-8 px-1 py-2 text-center">{t('standingGoalsAgainst')}</th>
                    <th className="w-8 px-1 py-2 text-center">{t('standingGoalsDiff')}</th>
                    <th className="w-10 px-1 py-2 text-center font-semibold">{t('standingPoints')}</th>
                  </tr>
                </thead>
                <tbody>
                  {[...group].sort((a, b) => b.points - a.points || b.all.goals.for - a.all.goals.for).map((team) => (
                    <tr key={team.rank} className="border-b border-gray-50 transition-colors hover:bg-gray-50">
                      <td className="px-2 py-2 text-center text-xs font-medium text-gray-500">{n(team.rank)}</td>
                      <td className="px-2 py-2">
                        <button
                          type="button"
                          onClick={() => openTeamStats(team.team.id)}
                          disabled={statsLoading}
                          className="flex w-full items-center gap-2 text-left transition-colors hover:text-orange-600 disabled:opacity-60"
                        >
                          <div className="relative h-5 w-5 shrink-0">
                            {team.team.logo ? (
                              <Image src={team.team.logo} alt={team.team.name} fill className="object-contain" unoptimized />
                            ) : (
                              <div className="h-full w-full rounded bg-gray-100" />
                            )}
                          </div>
                          <span className="text-sm font-medium text-gray-900 line-clamp-1">{team.team.name}</span>
                        </button>
                      </td>
                      <td className="px-1 py-2 text-center text-xs">{n(team.all.played)}</td>
                      <td className="px-1 py-2 text-center text-xs">{n(team.all.win)}</td>
                      <td className="px-1 py-2 text-center text-xs">{n(team.all.draw)}</td>
                      <td className="px-1 py-2 text-center text-xs">{n(team.all.lose)}</td>
                      <td className="px-1 py-2 text-center text-xs">{n(team.all.goals.for)}</td>
                      <td className="px-1 py-2 text-center text-xs">{n(team.all.goals.against)}</td>
                      <td className="px-1 py-2 text-center text-xs">{n(team.goalsDiff)}</td>
                      <td className="px-1 py-2 text-center text-sm font-bold text-gray-900">{n(team.points)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}

      {stats && selectedTeamId != null && (
        <TeamSeasonStatsModal
          stats={stats}
          season={{ year: season, label: String(season), start: '', end: '' }}
          teamId={selectedTeamId}
          leagueId={leagueId}
          lng={lng}
          header="team"
          onClose={closeTeamStats}
        />
      )}
    </div>
  );
}
