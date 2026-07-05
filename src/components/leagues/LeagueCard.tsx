'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Trophy, Shield } from 'lucide-react';
import { leagueHref, rememberLeagueName } from '@/lib/utils';
import { useAppSelector } from '@/store/hooks';

interface LeagueCardProps {
  league: { id: number; name: string; logo?: string; type?: string };
}

export function LeagueCard({ league }: LeagueCardProps) {
  const { code: lng } = useAppSelector((state) => state.language.language);
  const isCup = league.type?.toLowerCase() === 'cup';

  return (
    <Link
      href={leagueHref(league.id, league.name, league.logo)}
      onClick={() => rememberLeagueName(league.id, league.name, lng)}
      className="flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-gray-50/80"
    >
      <div className="relative h-7 w-7 shrink-0">
        {league.logo ? (
          <Image
            src={league.logo}
            alt={league.name}
            fill
            className="object-contain"
            unoptimized
          />
        ) : (
          <div className={`flex h-full w-full items-center justify-center rounded-md ${isCup ? 'bg-amber-50' : 'bg-blue-50'}`}>
            {isCup
              ? <Trophy className="h-4 w-4 text-amber-400" />
              : <Shield className="h-4 w-4 text-blue-400" />}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="text-[13px] font-medium text-gray-900 line-clamp-1">{league.name}</h3>
      </div>
      <div className={`flex h-5 w-5 items-center justify-center rounded ${isCup ? 'bg-amber-50' : 'bg-blue-50'}`}>
        {isCup
          ? <Trophy className="h-3 w-3 text-amber-400" />
          : <Shield className="h-3 w-3 text-blue-400" />}
      </div>
    </Link>
  );
}
