'use client';

import { useEffect, useState, useMemo } from 'react';
import { FixtureByDate } from '@/types';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NoData } from '@/components/ui/NoData';
import { MatchCard } from '@/components/matches/MatchCard';
import { useTranslation } from '@/i18n';
import { formatDisplayDate, localizeNumber } from '@/lib/utils';
import { ArrowUpDown, Calendar } from 'lucide-react';

interface FixtureGroup {
  date: string;
  fixtures: FixtureByDate[];
}

interface LeagueMatchesTabProps {
  leagueId: number;
  season: number;
  lng: string;
}

export function LeagueMatchesTab({ leagueId, season, lng }: LeagueMatchesTabProps) {
  const [fixtures, setFixtures] = useState<FixtureByDate[]>([]);
  const [loading, setLoading] = useState(true);
  const [ascending, setAscending] = useState(true);
  const { t } = useTranslation(lng);

  useEffect(() => {
    const fetchFixtures = async () => {
      setLoading(true);
      try {
        const data = await api.leagues.getFixtures(leagueId, season, lng);
        const groups = data as FixtureGroup[] | FixtureByDate[];
        if (Array.isArray(groups) && groups.length > 0 && 'fixtures' in groups[0]) {
          setFixtures((groups as FixtureGroup[]).flatMap((g) => g.fixtures || []));
        } else if (Array.isArray(groups)) {
          setFixtures(groups as FixtureByDate[]);
        } else {
          setFixtures([]);
        }
      } catch {
        setFixtures([]);
      } finally {
        setLoading(false);
      }
    };
    fetchFixtures();
  }, [leagueId, season, lng]);

  const groupedByDay = useMemo(() => {
    const valid = fixtures.filter((f) => f && f.status);
    const sorted = [...valid].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return ascending ? diff : -diff;
    });

    const map = new Map<string, FixtureByDate[]>();
    for (const fixture of sorted) {
      const dayKey = fixture.date.split('T')[0];
      const list = map.get(dayKey);
      if (list) {
        list.push(fixture);
      } else {
        map.set(dayKey, [fixture]);
      }
    }
    return Array.from(map.entries());
  }, [fixtures, ascending]);

  if (loading) return <LoadingSpinner />;
  if (!fixtures.length) return <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between px-1">
        <span className="text-[12px] text-gray-400">
          {localizeNumber(fixtures.filter((f) => f && f.status).length, lng)} {t('LeagueMatches')}
        </span>
        <button
          onClick={() => setAscending(!ascending)}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-gray-100"
        >
          <ArrowUpDown className="h-3.5 w-3.5" />
          {ascending ? t('Ascending') : t('Descending')}
        </button>
      </div>

      <div className="space-y-3">
        {groupedByDay.map(([dayKey, dayFixtures]) => (
          <div key={dayKey} className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-2.5 px-4 py-3">
              <Calendar className="h-4 w-4 text-gray-400" />
              <span className="text-[13px] font-semibold text-gray-700">
                {formatDisplayDate(new Date(dayKey + 'T12:00:00'), lng)}
              </span>
              <span className="text-[11px] text-gray-400">
                {localizeNumber(dayFixtures.length, lng)} {t('LeagueMatches')}
              </span>
            </div>
            <div className="border-t border-gray-100">
              {dayFixtures.map((fixture, i) => (
                <div key={fixture.id ?? i}>
                  {i > 0 && <div className="mx-4 border-t border-gray-50" />}
                  <MatchCard fixture={fixture} lng={lng} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
