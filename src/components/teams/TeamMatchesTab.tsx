'use client';

import { useEffect, useState } from 'react';
import { Fixture } from '@/types';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NoData } from '@/components/ui/NoData';
import { MatchCard } from '@/components/matches/MatchCard';
import { useTranslation } from '@/i18n';
import { localizeNumber, formatDisplayDate } from '@/lib/utils';

interface TeamMatchesTabProps {
  teamId: number;
  lng: string;
}

interface SeasonOption {
  year: number;
  label: string;
}

interface FixturesResponse {
  fixtures: Fixture[];
  seasons: SeasonOption[];
}

export function TeamMatchesTab({ teamId, lng }: TeamMatchesTabProps) {
  const [seasons, setSeasons] = useState<SeasonOption[]>([]);
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation(lng);

  const fetchFixtures = async (season?: number) => {
    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data = await api.teams.getSeasonFixtures(teamId, season, lng) as any;
      const response: FixturesResponse = {
        fixtures: data?.fixtures || (Array.isArray(data) ? data : []),
        seasons: data?.seasons || [],
      };

      if (response.seasons.length > 0) {
        const sorted = [...response.seasons].sort((a, b) => b.year - a.year);
        setSeasons(sorted);
        if (!season) {
          setSelectedSeason(sorted[0].year);
        }
      }

      const sortedFixtures = [...response.fixtures].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setFixtures(sortedFixtures);
    } catch {
      setFixtures([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchFixtures();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId, lng]);

  const handleSeasonChange = (year: number) => {
    setSelectedSeason(year);
    fetchFixtures(year);
  };

  if (loading && !fixtures.length) return <LoadingSpinner />;

  return (
    <div>
      {seasons.length > 0 && (
        <div className="mb-3">
          <select
            value={selectedSeason || ''}
            onChange={(e) => handleSeasonChange(Number(e.target.value))}
            className="rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[12px] font-medium text-gray-700 outline-none transition-colors hover:border-gray-300 focus:ring-2 focus:ring-orange-500/20"
          >
            {seasons.map((season) => (
              <option key={season.year} value={season.year}>
                {localizeNumber(season.year, lng)}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <LoadingSpinner />
      ) : fixtures.length ? (
        <div className="space-y-3">
          {fixtures.map((fixture) => (
            <div key={fixture.id} className="rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[11px] font-medium text-gray-500 line-clamp-1">{fixture.league?.name}</span>
                <span className="shrink-0 text-[11px] text-gray-400">
                  {fixture.date ? formatDisplayDate(new Date(fixture.date), lng) : ''}
                </span>
              </div>
              <div className="border-t border-gray-50">
                <MatchCard fixture={fixture} lng={lng} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />
      )}
    </div>
  );
}
