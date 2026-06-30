'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trophy } from 'lucide-react';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NoData } from '@/components/ui/NoData';
import { useTranslation } from '@/i18n';
import { localizeNumber, leagueHref } from '@/lib/utils';
import { TeamSeasonStatsModal, TeamStatistics } from './TeamSeasonStatsModal';

interface Season {
  year: number;
  label: string;
  start: string;
  end: string;
  current: boolean;
}

interface TeamLeagueResponse {
  league: { id: number; name: string; logo: string; type?: string };
  country?: { code: string; flag: string; name: string };
  seasons: Season[];
}

interface TeamLeagueSeasonListProps {
  teamId: number;
  lng: string;
  /** 'seasons' = all leagues the team played; 'winners' = only leagues the team won */
  source: 'seasons' | 'winners';
}

export function TeamLeagueSeasonList({ teamId, lng, source }: TeamLeagueSeasonListProps) {
  const [leagues, setLeagues] = useState<TeamLeagueResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation(lng);

  // Selected-season statistics modal state
  const [stats, setStats] = useState<TeamStatistics | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<Season | null>(null);
  const [selectedLeagueId, setSelectedLeagueId] = useState<number | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchLeagues = async () => {
      setLoading(true);
      try {
        const data = (source === 'winners'
          ? await api.teams.getWinnersByTeam(teamId, lng)
          : await api.teams.getLeagues(teamId, lng)) as TeamLeagueResponse[];
        if (active) setLeagues(data || []);
      } catch {
        if (active) setLeagues([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchLeagues();
    return () => {
      active = false;
    };
  }, [teamId, lng, source]);

  const openSeasonStats = async (league: TeamLeagueResponse, season: Season) => {
    setSelectedSeason(season);
    setSelectedLeagueId(league.league.id);
    setStatsLoading(true);
    try {
      const data = await api.teams.getStatistics(teamId, league.league.id, season.year, lng) as TeamStatistics;
      setStats(data);
    } catch {
      setStats(null);
      setSelectedSeason(null);
      setSelectedLeagueId(null);
    } finally {
      setStatsLoading(false);
    }
  };

  const closeStats = () => {
    setStats(null);
    setSelectedSeason(null);
    setSelectedLeagueId(null);
  };

  if (loading) return <LoadingSpinner />;
  if (!leagues.length) return <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />;

  return (
    <div className="space-y-3">
      {leagues.map((item) => (
        <div key={item.league.id} className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <Link
            href={leagueHref(item.league.id, item.league.name, item.league.logo)}
            className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 rounded-t-xl"
          >
            <div className="relative h-7 w-7 shrink-0">
              {item.league.logo ? (
                <Image src={item.league.logo} alt={item.league.name || ''} fill className="object-contain" unoptimized />
              ) : (
                <div className="h-full w-full rounded bg-gray-100" />
              )}
            </div>
            <p className="min-w-0 flex-1 text-[13px] font-medium text-gray-900 line-clamp-1">{item.league.name}</p>
            {source === 'winners' && <Trophy className="h-4 w-4 shrink-0 text-yellow-500" />}
          </Link>

          {item.seasons && item.seasons.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3">
              {[...item.seasons]
                .sort((a, b) => a.year - b.year)
                .map((season) => (
                  <button
                    key={season.year}
                    onClick={() => openSeasonStats(item, season)}
                    disabled={statsLoading}
                    className="rounded-md bg-gray-100 px-3 py-1 text-[12px] font-semibold text-gray-700 transition-colors hover:bg-orange-50 hover:text-orange-600 disabled:opacity-50"
                  >
                    {localizeNumber(season.label ?? season.year, lng)}
                  </button>
                ))}
            </div>
          )}
        </div>
      ))}

      {stats && selectedSeason && selectedLeagueId != null && (
        <TeamSeasonStatsModal
          stats={stats}
          season={selectedSeason}
          teamId={teamId}
          leagueId={selectedLeagueId}
          lng={lng}
          onClose={closeStats}
        />
      )}
    </div>
  );
}
