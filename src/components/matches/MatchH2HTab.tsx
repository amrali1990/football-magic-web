'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NoData } from '@/components/ui/NoData';
import { MatchCard } from '@/components/matches/MatchCard';
import { useTranslation } from '@/i18n';
import { formatDisplayDate } from '@/lib/utils';

interface MatchH2HTabProps {
  matchId: number;
  lng: string;
}

interface H2HMatch {
  id: number;
  date: string;
  league: { id: number; name: string; logo: string; country?: string; flag?: string };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
  score?: { penalty?: { home: number | null; away: number | null } };
  status: { short: string; long: string; elapsed: number | null };
}

export function MatchH2HTab({ matchId, lng }: MatchH2HTabProps) {
  const [matches, setMatches] = useState<H2HMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation(lng);

  useEffect(() => {
    const fetchH2H = async () => {
      try {
        const data = await api.matches.getFixtureH2H(matchId, lng) as H2HMatch[];
        setMatches(data || []);
      } catch {
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };
    fetchH2H();
  }, [matchId, lng]);

  if (loading) return <LoadingSpinner />;
  if (!matches.length) return <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />;

  const sorted = [...matches].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <div className="space-y-3">
      {sorted.map((match) => (
        <div key={match.id} className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-2.5">
            <span className="text-[11px] font-medium text-gray-500 line-clamp-1">{match.league?.name}</span>
            <span className="shrink-0 text-[11px] text-gray-400">
              {match.date ? formatDisplayDate(new Date(match.date), lng) : ''}
            </span>
          </div>
          <div className="border-t border-gray-50">
            <MatchCard fixture={match} lng={lng} />
          </div>
        </div>
      ))}
    </div>
  );
}
