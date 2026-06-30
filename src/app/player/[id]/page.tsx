'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useAppSelector } from '@/store/hooks';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { Player } from '@/types';
import { Tabs } from '@/components/ui/Tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PlayerInfoTab } from '@/components/players/PlayerInfoTab';
import { PlayerStatsTab, PlayerSeasonTeam, PlayerSeasonTotal } from '@/components/players/PlayerStatsTab';
import { PlayerTransfersTab } from '@/components/players/PlayerTransfersTab';
import { PageHeader } from '@/components/layout/PageHeader';

interface PlayerData {
  player: Player;
  total?: PlayerSeasonTotal;
  teams?: PlayerSeasonTeam[];
  years?: number[];
}

export default function PlayerPage() {
  const params = useParams();
  const playerId = Number(params.id);
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);

  const [data, setData] = useState<PlayerData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayer = async () => {
      try {
        const result = await api.players.getInfo(playerId, lng) as PlayerData;
        setData(result);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchPlayer();
  }, [playerId, lng]);

  if (loading) return <LoadingSpinner />;
  if (!data) return null;

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

      <div className="p-3">
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
      </div>
    </div>
  );
}
