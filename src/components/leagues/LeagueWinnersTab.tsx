'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Trophy, Medal, ExternalLink, Shield } from 'lucide-react';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NoData } from '@/components/ui/NoData';
import { useTranslation } from '@/i18n';
import { localizeNumber } from '@/lib/utils';

interface LeagueWinnersTabProps {
  leagueId: number;
  lng: string;
}

type TeamInfo = { id: number; name: string; logo: string } | null | undefined;

interface Winner {
  season: { seasonId: number; year: string; label: string } | number | null;
  winner?: TeamInfo;
  runnerUp?: TeamInfo;
}

function getSeasonLabel(season: Winner['season']): string {
  if (typeof season === 'object' && season !== null) return season.label || season.year || '';
  return season != null ? String(season) : '';
}

function WinnerRow({ team, label, variant }: { team: NonNullable<TeamInfo>; label: string; variant: 'winner' | 'runnerUp' }) {
  const isWinner = variant === 'winner';
  return (
    <Link
      href={`/team/${team.id}`}
      className={`flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 ${isWinner ? 'bg-amber-50/40' : ''}`}
    >
      <div className="relative h-9 w-9 shrink-0">
        {team.logo ? (
          <Image src={team.logo} alt={team.name} fill className="object-contain" unoptimized />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-gray-100">
            <Shield className="h-4 w-4 text-gray-300" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5">
          {isWinner ? (
            <Trophy className="h-3 w-3 text-amber-500" />
          ) : (
            <Medal className="h-3 w-3 text-gray-400" />
          )}
          <span className={`text-[11px] font-semibold uppercase tracking-wide ${isWinner ? 'text-amber-600' : 'text-gray-400'}`}>
            {label}
          </span>
        </div>
        <p className="truncate text-[14px] font-bold text-gray-900">{team.name}</p>
      </div>
      <ExternalLink className="h-4 w-4 shrink-0 text-gray-300" />
    </Link>
  );
}

export function LeagueWinnersTab({ leagueId, lng }: LeagueWinnersTabProps) {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation(lng);

  useEffect(() => {
    const fetchWinners = async () => {
      try {
        const data = await api.leagues.getWinners(leagueId, lng) as Winner[];
        setWinners(data || []);
      } catch {
        setWinners([]);
      } finally {
        setLoading(false);
      }
    };
    fetchWinners();
  }, [leagueId, lng]);

  if (loading) return <LoadingSpinner />;
  if (!winners.length) return <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />;

  return (
    <div className="space-y-3">
      {winners.map((w, i) => {
        const label = getSeasonLabel(w.season);
        return (
          <div key={label || i} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            {/* Season header */}
            <div className="flex items-center gap-2 border-b border-gray-100 bg-gray-50/60 px-4 py-2.5">
              <Trophy className="h-4 w-4 text-amber-500" />
              <span className="text-[13px] font-bold text-gray-800">{localizeNumber(label, lng)}</span>
            </div>

            {/* Winner & runner-up */}
            <div className="divide-y divide-gray-50">
              {w.winner && <WinnerRow team={w.winner} label={t('winner')} variant="winner" />}
              {w.runnerUp && <WinnerRow team={w.runnerUp} label={t('runnerUp')} variant="runnerUp" />}
            </div>
          </div>
        );
      })}
    </div>
  );
}
