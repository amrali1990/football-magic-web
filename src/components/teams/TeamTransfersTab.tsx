'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Transfer } from '@/types';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NoData } from '@/components/ui/NoData';
import { useTranslation } from '@/i18n';
import { localizeNumber, teamHref, playerHref } from '@/lib/utils';
import { InfiniteScrollTrigger } from '@/components/ui/InfiniteScrollTrigger';
import { ArrowRight, User } from 'lucide-react';

interface TeamTransfersTabProps {
  teamId: number;
  lng: string;
}

export type TransferTeamInfo = { id: number; name: string; logo: string } | null | undefined;

export function TransferTeam({ team, lng }: { team: TransferTeamInfo; lng: string }) {
  if (!team) {
    return (
      <div className="flex min-w-0 flex-col items-center gap-1">
        <div className="h-8 w-8 rounded-full bg-gray-100" />
        <span className="text-[11px] text-gray-400">-</span>
      </div>
    );
  }
  return (
    <Link href={teamHref(team.id, team.name, lng)} className="flex min-w-0 flex-col items-center gap-1 transition-colors hover:text-orange-500">
      <div className="relative h-8 w-8 shrink-0">
        {team.logo ? (
          <Image src={team.logo} alt={team.name} fill className="object-contain" unoptimized />
        ) : (
          <div className="h-full w-full rounded-full bg-gray-100" />
        )}
      </div>
      <span className="line-clamp-1 max-w-[88px] text-center text-[11px] text-gray-600">{team.name}</span>
    </Link>
  );
}

export function TeamTransfersTab({ teamId, lng }: TeamTransfersTabProps) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const { t } = useTranslation(lng);

  useEffect(() => {
    const fetchTransfers = async () => {
      setLoading(true);
      try {
        const data = await api.teams.getTransfers(teamId, page, lng) as { list?: Transfer[]; totalPages?: number };
        const list = data?.list || [];
        setTransfers((prev) => (page === 0 ? list : [...prev, ...list]));
        setHasMore(page + 1 < (data?.totalPages || 0));
      } catch {
        setHasMore(false);
      } finally {
        setLoading(false);
      }
    };
    fetchTransfers();
  }, [teamId, page, lng]);

  if (loading && page === 0) return <LoadingSpinner />;
  if (!transfers.length) return <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />;

  return (
    <div>
      <div className="space-y-3">
        {transfers.map((transfer, index) => (
          <div
            key={index}
            className="relative flex flex-col items-center rounded-xl border border-gray-100 bg-white px-4 pb-4 pt-7 shadow-sm"
          >
            {/* Corners: type (start) and date (end) */}
            <span className="absolute start-3 top-2.5 text-[11px] font-semibold text-orange-500">
              {t(transfer.type)}
            </span>
            <span className="absolute end-3 top-2.5 text-[11px] text-gray-400">
              {localizeNumber(transfer.date, lng)}
            </span>

            {/* Player photo */}
            <div className="relative h-16 w-16 overflow-hidden rounded-full bg-gray-100">
              {transfer.player.photo ? (
                <Image src={transfer.player.photo} alt={transfer.player.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-7 w-7 text-gray-300" />
                </div>
              )}
            </div>

            {/* Player name */}
            <Link
              href={playerHref(transfer.player.id, transfer.player.name, lng)}
              className="mt-2 line-clamp-1 text-center text-sm font-semibold text-gray-900 hover:text-orange-500"
            >
              {transfer.player.name}
            </Link>

            {/* Teams with directional arrow */}
            <div className="mt-3 flex w-full items-start justify-center gap-3">
              <TransferTeam team={transfer.teams?.out} lng={lng} />
              <ArrowRight className="mt-1.5 h-4 w-4 shrink-0 text-gray-400" />
              <TransferTeam team={transfer.teams?.in} lng={lng} />
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <InfiniteScrollTrigger onLoadMore={() => setPage((p) => p + 1)} loading={loading} />
      )}
    </div>
  );
}
