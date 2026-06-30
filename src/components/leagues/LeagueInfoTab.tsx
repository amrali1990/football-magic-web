'use client';

import Image from 'next/image';
import Link from 'next/link';
import { League } from '@/types';
import { useTranslation } from '@/i18n';
import { localizeNumber } from '@/lib/utils';

interface LeagueInfoTabProps {
  league: League;
  lng: string;
}

export function LeagueInfoTab({ league, lng }: LeagueInfoTabProps) {
  const { t } = useTranslation(lng);

  return (
    <div className="space-y-4 py-2">
      <div className="flex items-center gap-4 rounded-xl bg-gray-50 px-4 py-4">
        <div className="relative h-16 w-16 shrink-0">
          <Image src={league.logo} alt={league.name} fill className="object-contain" unoptimized />
        </div>
        <div>
          <h2 className="text-lg font-bold text-gray-900">{league.name}</h2>
          <p className="text-sm capitalize text-gray-500">{league.type}</p>
        </div>
      </div>

      {league.country && (
        <Link
          href={`/country/${league.country.code}`}
          className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50"
        >
          {league.country.flag && (
            <Image
              src={league.country.flag}
              alt={league.country.name}
              width={24}
              height={16}
              className="rounded-sm"
              unoptimized
            />
          )}
          <div>
            <p className="text-xs text-gray-500">{t('Country')}</p>
            <p className="text-sm font-medium text-gray-900">{league.country.name}</p>
          </div>
        </Link>
      )}

      {league.seasons && league.seasons.length > 0 && (
        <div className="rounded-xl border border-gray-100 px-4 py-3">
          <p className="mb-2 text-xs text-gray-500">{t('Seasons')}</p>
          <div className="flex flex-wrap gap-2">
            {league.seasons.map((season) => (
              <span
                key={season.year}
                className={`rounded-full px-3 py-1 text-xs ${
                  season.current
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {localizeNumber(season.year, lng)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
