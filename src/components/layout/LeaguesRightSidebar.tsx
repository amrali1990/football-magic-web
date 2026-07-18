'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAppSelector } from '@/store/hooks';
import { useTranslation } from '@/i18n';
import { Trophy, ChevronRight, Shield } from 'lucide-react';
import { leagueHref, teamHref, rememberLeagueName } from '@/lib/utils';
import { useSidebarData } from '@/lib/useSidebarData';
import { AppPromo } from '@/components/layout/AppPromo';

/**
 * Default right sidebar (all pages except home): the mobile-app promo on top,
 * then top teams + top leagues scoped to the current page via SidebarScope.
 * Initial HTML comes from the server-side seed.
 */
export function LeaguesRightSidebar() {
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);
  const { teams, leagues } = useSidebarData();

  return (
    <div className="sticky top-0 h-screen overflow-y-auto py-5 ps-6 pe-4 scrollbar-hide">
      <div className="space-y-4">

        <AppPromo lng={lng} />

        {/* Top Teams */}
        {teams.length > 0 && (
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
                  href={teamHref(team.id, team.name, lng)}
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
                    {team.country && (
                      <span className="block text-[11px] text-gray-400 line-clamp-1 mt-0.5">{team.country}</span>
                    )}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        )}

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
                  href={leagueHref(league.id, league.name, league.logo, lng)}
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
                    {league.country && (
                      <span className="block text-[11px] text-gray-400 line-clamp-1 mt-0.5">{league.country}</span>
                    )}
                  </div>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-300 transition-transform group-hover:translate-x-0.5" />
                </Link>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
