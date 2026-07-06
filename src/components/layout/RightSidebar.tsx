'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppSelector, useRehydrated } from '@/store/hooks';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { Trophy, ChevronRight } from 'lucide-react';
import { leagueHref, rememberLeagueName } from '@/lib/utils';
import { useLayoutContext, SidebarLeague } from '@/lib/layout-context';

interface TopLeaguesResponse {
  countryName: string;
  country: SidebarLeague[];
  international: SidebarLeague[];
  leagues: SidebarLeague[];
}

export function RightSidebar() {
  const { code: lng } = useAppSelector((state) => state.language.language);
  // Wait for the persisted language before fetching, and drop responses from
  // an outdated language — otherwise a first-mount 'en' request can resolve
  // after (and overwrite) the correct-language one.
  const rehydrated = useRehydrated();
  const { t } = useTranslation(lng);
  // Server-fetched (English) seed puts the list into the initial HTML;
  // refetch only when the user's language differs.
  const { sidebarSeed } = useLayoutContext();
  const [leagues, setLeagues] = useState<SidebarLeague[]>(sidebarSeed?.leagues ?? []);
  const fetchedLng = useRef(sidebarSeed ? 'en' : '');

  useEffect(() => {
    if (!rehydrated || lng === fetchedLng.current) return;
    fetchedLng.current = lng;
    let stale = false;
    const fetchLeagues = async () => {
      try {
        const data = await api.leagues.getTopLeagues(lng) as TopLeaguesResponse;
        if (!stale) setLeagues(data?.leagues || []);
      } catch { /* keep empty */ }
    };
    fetchLeagues();
    return () => { stale = true; };
  }, [lng, rehydrated]);

  return (
    <div className="sticky top-0 h-screen py-5 ps-6 pe-4">
      <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-gray-50 to-white ring-1 ring-gray-200/80">
        <div className="px-5 pt-5 pb-1">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
              <Trophy className="h-4 w-4 text-orange-500" />
            </div>
            <h2 className="text-[17px] font-bold text-gray-900">{t('Leagues')}</h2>
          </div>
        </div>

        <div className="p-3 space-y-0.5">
          {leagues.map((league) => (
            <Link
              key={league.id}
              href={leagueHref(league.id, league.name, league.logo)}
              onClick={() => rememberLeagueName(league.id, league.name, lng)}
              className="group flex items-center gap-3.5 rounded-xl px-3 py-3 transition-all hover:bg-white hover:shadow-sm"
            >
              <div className="relative h-9 w-9 shrink-0 rounded-lg bg-white p-1 shadow-sm ring-1 ring-gray-100">
                {league.logo && (
                  <Image src={league.logo} alt={league.name} fill className="object-contain p-0.5" unoptimized />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <span className="block text-[14px] font-semibold text-gray-900 line-clamp-1">{league.name}</span>
                <span className="block text-[11px] text-gray-400 line-clamp-1 mt-0.5">{league.country}</span>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
        </div>

        <div className="mx-3 mb-3">
          <Link
            href="/leagues"
            className="flex items-center justify-center gap-1.5 rounded-xl bg-orange-50 py-3 text-[13px] font-bold text-orange-500 transition-colors hover:bg-orange-100"
          >
            {t('Show_All')}
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
