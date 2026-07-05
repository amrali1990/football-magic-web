'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight } from 'lucide-react';
import { leagueHref, rememberLeagueName } from '@/lib/utils';
import { LeagueWithFixtures } from '@/types';
import { MatchCard } from './MatchCard';

interface LeagueMatchGroupProps {
  leagueWithFixtures: LeagueWithFixtures;
  lng: string;
}

export function LeagueMatchGroup({ leagueWithFixtures, lng }: LeagueMatchGroupProps) {
  const { id, name, logo, country, flag, fixtures } = leagueWithFixtures;

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <Link
        href={leagueHref(id, name, logo)}
        onClick={() => rememberLeagueName(id, name, lng)}
        className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-gray-50 rounded-t-xl"
      >
        <div className="relative h-9 w-9 shrink-0">
          {logo && (
            <Image
              src={logo}
              alt={name}
              fill
              className="object-contain"
              unoptimized
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold text-gray-900 line-clamp-1">{name}</h3>
          <div className="flex items-center gap-1.5 mt-0.5">
            {flag && (
              <Image
                src={flag}
                alt={country}
                width={14}
                height={10}
                className="rounded-sm"
                unoptimized
              />
            )}
            <span className="text-[12px] text-gray-500">{country}</span>
          </div>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
      </Link>

      <div className="border-t border-gray-100">
        {[...(fixtures || [])]
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((fixture, i) => (
          <div key={fixture.id}>
            {i > 0 && <div className="mx-4 border-t border-gray-50" />}
            <MatchCard fixture={fixture} lng={lng} />
          </div>
        ))}
      </div>
    </div>
  );
}
