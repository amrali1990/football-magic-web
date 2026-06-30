'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAppSelector } from '@/store/hooks';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { LeagueCard } from '@/components/leagues/LeagueCard';
import { SearchBar } from '@/components/ui/SearchBar';
import { NoData } from '@/components/ui/NoData';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PageHeader } from '@/components/layout/PageHeader';
import { localizeNumber } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function LeaguesPage() {
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);

  interface CountryGroup {
    country: { name: string; code: string; flag: string };
    leagues: { id: number; name: string; logo: string; type: string }[];
  }

  const [groups, setGroups] = useState<CountryGroup[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeagues = async () => {
      try {
        const data = await api.leagues.getAll(lng) as {
          id: number; name: string; code: string; flag: string;
          leagues: { id: number; name: string; logo: string; type: string }[];
        }[];
        if (Array.isArray(data)) {
          setGroups(data.map((c) => ({
            country: { name: c.name, code: c.code, flag: c.flag },
            leagues: c.leagues || [],
          })));
        }
      } catch {
        setGroups([]);
      } finally {
        setLoading(false);
      }
    };
    fetchLeagues();
  }, [lng]);

  const grouped = useMemo(() => {
    if (!search) return groups;
    const q = search.toLowerCase();
    return groups
      .map((g) => ({
        ...g,
        leagues: g.leagues.filter((l) =>
          l.name.toLowerCase().includes(q) ||
          g.country.name.toLowerCase().includes(q)
        ),
      }))
      .filter((g) => g.leagues.length > 0);
  }, [groups, search]);

  return (
    <div className="flex flex-col">
      <PageHeader>
        <div className="px-4 pt-3 pb-1">
          <h1 className="text-xl font-bold text-gray-900">{t('Leagues')}</h1>
        </div>
        <div className="px-4 py-2">
          <SearchBar
            value={search}
            onChange={setSearch}
            placeholder={t('search_leagues')}
          />
        </div>
      </PageHeader>

      {loading ? (
        <LoadingSpinner />
      ) : grouped.length === 0 ? (
        <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />
      ) : (
        <div className="p-3 space-y-3">
          {grouped.map((group) => (
            <div key={group.country.name} className="rounded-xl border border-gray-100 bg-white shadow-sm">
              <Link
                href={group.country.code ? `/country/${group.country.code}` : '#'}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 rounded-t-xl"
              >
                {group.country.flag ? (
                  <div className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg">
                    <Image src={group.country.flag} alt={group.country.name} fill className="object-cover" unoptimized />
                  </div>
                ) : (
                  <div className="h-9 w-9 shrink-0 rounded-lg bg-gray-100" />
                )}
                <div className="min-w-0 flex-1">
                  <h2 className="text-[15px] font-bold text-gray-900 line-clamp-1">{group.country.name}</h2>
                  <span className="text-[12px] text-gray-500">{localizeNumber(group.leagues.length, lng)} {t('Leagues')}</span>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
              </Link>
              <div className="border-t border-gray-100">
                {group.leagues.map((league, i) => (
                  <div key={league.id}>
                    {i > 0 && <div className="mx-4 border-t border-gray-50" />}
                    <LeagueCard league={league} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
