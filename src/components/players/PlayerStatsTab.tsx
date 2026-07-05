'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { useTranslation } from '@/i18n';
import { localizeNumber, teamHref } from '@/lib/utils';
import { NoData } from '@/components/ui/NoData';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PlayerSeasonStatsModal, PlayerSeasonStat } from './PlayerSeasonStatsModal';

export interface PlayerSeasonTeam {
  id: number;
  name: string;
  logo: string;
  national?: boolean;
  statistics: PlayerSeasonStat[];
}

export interface PlayerSeasonTotal {
  appearences?: number | null;
  lineups?: number | null;
  bench?: number | null;
  minutes?: number | null;
  rating?: number | null;
  goals?: number | null;
  assists?: number | null;
  yellow?: number | null;
  red?: number | null;
}

interface PlayerStatsTabProps {
  playerId: number;
  total?: PlayerSeasonTotal | null;
  teams?: PlayerSeasonTeam[] | null;
  years?: number[] | null;
  lng: string;
}

// A team is meaningful only if it has at least one statistic with real playing time
function filterTeams(teams: PlayerSeasonTeam[] | null | undefined): PlayerSeasonTeam[] {
  if (!Array.isArray(teams)) return [];
  return teams.filter((team) =>
    team?.statistics?.some((s) =>
      [s.games?.appearences, s.games?.lineups, s.games?.minutes, s.substitutes?.in, s.substitutes?.out, s.substitutes?.bench]
        .some((v) => v != null && v > 0)
    )
  );
}

export function PlayerStatsTab({ playerId, total, teams, years, lng }: PlayerStatsTabProps) {
  const { t } = useTranslation(lng);

  const sortedYears = [...(years || [])].sort((a, b) => b - a);
  const [selectedYear, setSelectedYear] = useState<number | null>(sortedYears[0] ?? null);
  const [localTeams, setLocalTeams] = useState<PlayerSeasonTeam[]>(filterTeams(teams));
  const [localTotal, setLocalTotal] = useState<PlayerSeasonTotal | null>(total ?? null);
  const [selectedStat, setSelectedStat] = useState<PlayerSeasonStat | null>(null);
  const [loading, setLoading] = useState(false);

  const handleYearChange = async (year: number) => {
    setSelectedYear(year);
    setLoading(true);
    try {
      const data = await api.players.getInfo(playerId, lng, year) as {
        teams?: PlayerSeasonTeam[];
        total?: PlayerSeasonTotal;
      };
      setLocalTeams(filterTeams(data?.teams));
      setLocalTotal(data?.total ?? null);
    } catch {
      setLocalTeams([]);
      setLocalTotal(null);
    } finally {
      setLoading(false);
    }
  };

  const n = (v: number | string | null | undefined) => (v == null || v === '' ? localizeNumber(0, lng) : localizeNumber(v, lng));

  const totalCells = [
    { label: 'Play', value: n(localTotal?.appearences) },
    { label: 'Start', value: n(localTotal?.lineups) },
    { label: 'Bench', value: n(localTotal?.bench) },
    { label: 'Minutes', value: n(localTotal?.minutes) },
    { label: 'Goals', value: n(localTotal?.goals) },
    { label: 'Assists', value: n(localTotal?.assists) },
    { label: 'Yellow Cards', value: n(localTotal?.yellow) },
    { label: 'Red Cards', value: n(localTotal?.red) },
    { label: 'Rating', value: localTotal?.rating ? localizeNumber(Number(localTotal.rating).toFixed(2), lng) : n(null) },
  ];

  return (
    <div className="space-y-3">
      {/* Totals summary + year selector */}
      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-2.5">
          <span className="text-[13px] font-semibold text-gray-700">{t('Statistics')}</span>
          {sortedYears.length > 0 && (
            <select
              value={selectedYear ?? ''}
              onChange={(e) => handleYearChange(Number(e.target.value))}
              className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[12px] font-medium text-gray-700 outline-none transition-colors hover:border-gray-300 focus:ring-2 focus:ring-orange-500/20"
            >
              {sortedYears.map((year) => (
                <option key={year} value={year}>
                  {localizeNumber(year, lng)}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="grid grid-cols-3 gap-px border-t border-gray-100 bg-gray-100 sm:grid-cols-5">
          {totalCells.map((cell) => (
            <div key={cell.label} className="bg-white px-3 py-2.5 text-center">
              <p className="text-[11px] text-gray-500">{t(cell.label)}</p>
              <p className="text-[15px] font-bold text-gray-900">{cell.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Per-team league statistics */}
      {loading ? (
        <LoadingSpinner />
      ) : localTeams.length === 0 ? (
        <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />
      ) : (
        localTeams.map((team) => (
          <div key={team.id} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <Link
              href={teamHref(team.id, team.name)}
              className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
            >
              <div className="relative h-7 w-7 shrink-0">
                {team.logo ? (
                  <Image src={team.logo} alt={team.name} fill className="object-contain" unoptimized />
                ) : (
                  <div className="h-full w-full rounded bg-gray-100" />
                )}
              </div>
              <span className="text-[14px] font-bold text-gray-900 line-clamp-1">{team.name}</span>
            </Link>
            <div className="border-t border-gray-100">
              {[...team.statistics]
                .sort((a, b) => (b.games?.appearences ?? 0) - (a.games?.appearences ?? 0))
                .map((stat, i) => (
                  <div key={`${stat.league.id}-${i}`}>
                    {i > 0 && <div className="mx-4 border-t border-gray-50" />}
                    <button
                      type="button"
                      onClick={() => setSelectedStat(stat)}
                      className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-gray-50"
                    >
                      <div className="relative h-5 w-5 shrink-0">
                        {stat.league.logo ? (
                          <Image src={stat.league.logo} alt={stat.league.name} fill className="object-contain" unoptimized />
                        ) : (
                          <div className="h-full w-full rounded bg-gray-100" />
                        )}
                      </div>
                      <span className="flex-1 text-[13px] text-gray-800 line-clamp-1">{stat.league.name}</span>
                      <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-gray-100 px-2 text-[12px] font-bold text-gray-700">
                        {n(stat.games?.appearences)}
                      </span>
                    </button>
                  </div>
                ))}
            </div>
          </div>
        ))
      )}

      {selectedStat && (
        <PlayerSeasonStatsModal stat={selectedStat} lng={lng} onClose={() => setSelectedStat(null)} />
      )}
    </div>
  );
}
