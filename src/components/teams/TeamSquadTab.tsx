'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Player } from '@/types';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NoData } from '@/components/ui/NoData';
import { useTranslation } from '@/i18n';
import { localizeNumber, playerHref } from '@/lib/utils';

interface TeamSquadTabProps {
  teamId: number;
  lng: string;
}

interface SquadData {
  goalkeepers?: Player[];
  defenders?: Player[];
  midfielders?: Player[];
  attackers?: Player[];
  [key: string]: Player[] | undefined;
}

const POSITION_KEYS = [
  { key: 'goalkeepers', label: 'Goalkeepers' },
  { key: 'defenders', label: 'Defenders' },
  { key: 'midfielders', label: 'Midfielders' },
  { key: 'attackers', label: 'Attackers' },
];

export function TeamSquadTab({ teamId, lng }: TeamSquadTabProps) {
  const [squad, setSquad] = useState<SquadData>({});
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation(lng);

  useEffect(() => {
    const fetchSquad = async () => {
      try {
        const data = await api.teams.getSquad(teamId, lng);
        if (Array.isArray(data)) {
          const grouped: SquadData = {};
          (data as Player[]).forEach((p) => {
            const pos = (p.position || 'unknown').toLowerCase() + 's';
            if (!grouped[pos]) grouped[pos] = [];
            grouped[pos]!.push(p);
          });
          setSquad(grouped);
        } else {
          setSquad((data as SquadData) || {});
        }
      } catch {
        setSquad({});
      } finally {
        setLoading(false);
      }
    };
    fetchSquad();
  }, [teamId, lng]);

  if (loading) return <LoadingSpinner />;

  const hasPlayers = POSITION_KEYS.some((pos) => squad[pos.key]?.length);
  if (!hasPlayers) return <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />;

  return (
    <div className="space-y-6">
      {POSITION_KEYS.map((pos) => {
        const players = squad[pos.key];
        if (!players?.length) return null;

        return (
          <div key={pos.key}>
            <h3 className="mb-2 px-2 text-sm font-semibold text-orange-500">{t(pos.label)}</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {players.map((player) => (
                <Link
                  key={player.id}
                  href={playerHref(player.id, player.name, lng)}
                  className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3 transition-colors hover:bg-gray-50"
                >
                  <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-full bg-gray-100">
                    <Image src={player.photo} alt={player.name} fill className="object-cover" unoptimized />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 line-clamp-1">{player.name}</p>
                  </div>
                  {player.number != null && (
                    <span className="shrink-0 text-sm font-bold text-gray-400">
                      {localizeNumber(player.number, lng)}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
