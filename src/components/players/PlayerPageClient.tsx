'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAppSelector } from '@/store/hooks';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import type { PlayerData } from '@/lib/normalize';
import { Tabs } from '@/components/ui/Tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PlayerInfoTab } from '@/components/players/PlayerInfoTab';
import { PlayerStatsTab } from '@/components/players/PlayerStatsTab';
import { PlayerTransfersTab } from '@/components/players/PlayerTransfersTab';
import { PageHeader } from '@/components/layout/PageHeader';
import { SeoIntro } from '@/components/seo/SeoSections';
import { useRouteLanguageSync } from '@/lib/useRouteLanguageSync';

interface PlayerPageClientProps {
  playerId: number;
  initialData: PlayerData;
  /** Locale the server fetched initialData in ('en' route or '/ar' route). */
  initialLng?: string;
  /** Server-generated intro paragraph (SEO copy rendered into the static HTML). */
  intro?: string;
  introLabel?: string;
}

export function PlayerPageClient({ playerId, initialData, initialLng = 'en', intro, introLabel }: PlayerPageClientProps) {
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);
  useRouteLanguageSync(initialLng);

  const [data, setData] = useState<PlayerData | null>(initialData);
  const [loading, setLoading] = useState(false);
  // The server fetched the initial data in the route's locale; only refetch
  // when the user's language differs (e.g. restored from persisted state).
  const fetchedLng = useRef(initialLng);

  useEffect(() => {
    if (lng === fetchedLng.current) return;
    fetchedLng.current = lng;
    let stale = false;
    const fetchPlayer = async () => {
      setLoading(true);
      try {
        const result = await api.players.getInfo(playerId, lng) as PlayerData;
        if (!stale) setData(result);
      } catch {
        // Keep showing the previously loaded data on refetch failure.
      } finally {
        if (!stale) setLoading(false);
      }
    };
    fetchPlayer();
    return () => { stale = true; };
  }, [playerId, lng]);

  if (!data) return loading ? <LoadingSpinner /> : null;

  const { player, total, teams, years } = data;

  return (
    <div className="flex flex-col">
      <PageHeader>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100">
            <Image src={player.photo} alt={player.name} fill className="object-cover" unoptimized />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-bold text-gray-900 line-clamp-1">{player.name}</h1>
            <div className="flex items-center gap-2">
              {player.position && (
                <span className="text-[12px] font-medium text-orange-500">{t(player.position)}</span>
              )}
              {player.nationality && (
                <span className="text-[12px] text-gray-500">{player.nationality}</span>
              )}
            </div>
          </div>
        </div>
      </PageHeader>

      {intro && <SeoIntro label={introLabel ?? `About ${player.name}`} text={intro} />}

      <div className="p-3">
        {loading ? (
          <LoadingSpinner />
        ) : (
          <Tabs
            tabs={[
              { key: 'info', label: t('PlayerInfo'), content: <PlayerInfoTab player={player} lng={lng} /> },
              {
                key: 'seasons',
                label: t('PlayerSeasons'),
                content: <PlayerStatsTab playerId={playerId} total={total} teams={teams} years={years} lng={lng} />,
              },
              {
                key: 'transfers',
                label: t('PlayerTransfers'),
                content: <PlayerTransfersTab playerId={playerId} lng={lng} />,
              },
            ]}
          />
        )}
      </div>
    </div>
  );
}
