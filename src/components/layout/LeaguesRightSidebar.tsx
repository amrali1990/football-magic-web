'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAppSelector, useRehydrated } from '@/store/hooks';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { Trophy, ChevronRight, Shield, Megaphone } from 'lucide-react';
import { leagueHref, teamHref, rememberLeagueName } from '@/lib/utils';
import { useLayoutContext, SidebarTeam, SidebarLeague } from '@/lib/layout-context';

interface TopLeaguesResponse {
  countryName: string;
  country: SidebarLeague[];
  international: SidebarLeague[];
  leagues: SidebarLeague[];
}

export function LeaguesRightSidebar() {
  const { code: lng } = useAppSelector((state) => state.language.language);
  // Wait for the persisted language before fetching, and drop responses from
  // an outdated language — otherwise a first-mount 'en' request can resolve
  // after (and overwrite) the correct-language one.
  const rehydrated = useRehydrated();
  const { t } = useTranslation(lng);
  // Server-fetched (English) seed puts the lists into the initial HTML;
  // refetch only when the user's language differs.
  const { sidebarSeed } = useLayoutContext();
  const [teams, setTeams] = useState<SidebarTeam[]>(sidebarSeed?.teams.slice(0, 8) ?? []);
  const [leagues, setLeagues] = useState<SidebarLeague[]>(sidebarSeed?.leagues.slice(0, 5) ?? []);
  const fetchedLng = useRef(sidebarSeed ? 'en' : '');

  useEffect(() => {
    if (!rehydrated || lng === fetchedLng.current) return;
    fetchedLng.current = lng;
    let stale = false;
    const fetchData = async () => {
      try {
        const [teamsData, leaguesData] = await Promise.all([
          api.teams.getTopTeams(lng) as Promise<SidebarTeam[]>,
          api.leagues.getTopLeagues(lng) as Promise<TopLeaguesResponse>,
        ]);
        if (stale) return;
        if (Array.isArray(teamsData)) setTeams(teamsData.slice(0, 8));
        if (leaguesData?.leagues) setLeagues(leaguesData.leagues.slice(0, 5));
      } catch { /* keep empty */ }
    };
    fetchData();
    return () => { stale = true; };
  }, [lng, rehydrated]);

  return (
    <div className="sticky top-0 h-screen overflow-y-auto py-5 ps-6 pe-4 scrollbar-hide">
      <div className="space-y-4">

        {/* Top Teams */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-gray-50 to-white ring-1 ring-gray-200/80">
          <div className="px-5 pt-5 pb-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <Shield className="h-4 w-4 text-blue-500" />
              </div>
              <h2 className="text-[17px] font-bold text-gray-900">{t('Top_Teams')}</h2>
            </div>
          </div>

          <div className="p-3 space-y-0.5">
            {teams.map((team) => (
              <Link
                key={team.id}
                href={teamHref(team.id, team.name)}
                className="group flex items-center gap-3.5 rounded-xl px-3 py-2.5 transition-all hover:bg-white hover:shadow-sm"
              >
                <div className="relative h-8 w-8 shrink-0 rounded-lg bg-white p-1 shadow-sm ring-1 ring-gray-100">
                  {team.logo ? (
                    <Image src={team.logo} alt={team.name} fill className="object-contain p-0.5" unoptimized />
                  ) : (
                    <div className="h-full w-full rounded bg-gray-100" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-gray-900 line-clamp-1">{team.name}</span>
                  <span className="block text-[11px] text-gray-400 line-clamp-1 mt-0.5">{team.country}</span>
                </div>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        </div>

        {/* Top Leagues */}
        {leagues.length > 0 && (
          <div className="overflow-hidden rounded-2xl bg-gradient-to-b from-gray-50 to-white ring-1 ring-gray-200/80">
            <div className="px-5 pt-5 pb-1">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500/10">
                  <Trophy className="h-4 w-4 text-orange-500" />
                </div>
                <h2 className="text-[17px] font-bold text-gray-900">{t('Top_Leagues')}</h2>
              </div>
            </div>

            <div className="p-3 space-y-0.5">
              {leagues.map((league) => (
                <Link
                  key={league.id}
                  href={leagueHref(league.id, league.name, league.logo)}
                  onClick={() => rememberLeagueName(league.id, league.name, lng)}
                  className="group flex items-center gap-3.5 rounded-xl px-3 py-2.5 transition-all hover:bg-white hover:shadow-sm"
                >
                  <div className="relative h-8 w-8 shrink-0 rounded-lg bg-white p-1 shadow-sm ring-1 ring-gray-100">
                    {league.logo ? (
                      <Image src={league.logo} alt={league.name} fill className="object-contain p-0.5" unoptimized />
                    ) : (
                      <div className="h-full w-full rounded bg-gray-100" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold text-gray-900 line-clamp-1">{league.name}</span>
                    <span className="block text-[11px] text-gray-400 line-clamp-1 mt-0.5">{league.country}</span>
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Ad / Promo Block */}
        <div className="overflow-hidden rounded-2xl ring-1 ring-gray-200/80 bg-gradient-to-br from-orange-50 via-white to-blue-50">
          <div className="px-5 py-6 text-center">
            <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
              <Megaphone className="h-5 w-5 text-orange-500" />
            </div>
            <h3 className="text-[14px] font-bold text-gray-900">{t('Get_the_App')}</h3>
            <p className="mt-1 text-[12px] text-gray-500 leading-relaxed">
              {t('Get_the_App_Desc')}
            </p>
            <div className="mt-4 flex justify-center gap-2">
              <span className="rounded-full bg-gray-900 px-4 py-1.5 text-[11px] font-semibold text-white">
                App Store
              </span>
              <span className="rounded-full bg-gray-900 px-4 py-1.5 text-[11px] font-semibold text-white">
                Google Play
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
