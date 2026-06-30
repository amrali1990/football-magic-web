'use client';

import { useEffect, useState } from 'react';
import { Transfer } from '@/types';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NoData } from '@/components/ui/NoData';
import { useTranslation } from '@/i18n';
import { localizeNumber } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { TransferTeam } from '@/components/teams/TeamTransfersTab';

interface PlayerTransfersTabProps {
  playerId: number;
  lng: string;
}

export function PlayerTransfersTab({ playerId, lng }: PlayerTransfersTabProps) {
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation(lng);

  useEffect(() => {
    const fetchTransfers = async () => {
      try {
        const data = await api.players.getTransfers(playerId, lng) as Transfer[];
        setTransfers(data || []);
      } catch {
        setTransfers([]);
      } finally {
        setLoading(false);
      }
    };
    fetchTransfers();
  }, [playerId, lng]);

  if (loading) return <LoadingSpinner />;
  if (!transfers.length) return <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />;

  return (
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

          {/* Teams with directional arrow */}
          <div className="flex w-full items-start justify-center gap-3">
            <TransferTeam team={transfer.teams?.out} />
            <ArrowRight className="mt-1.5 h-4 w-4 shrink-0 text-gray-400" />
            <TransferTeam team={transfer.teams?.in} />
          </div>
        </div>
      ))}
    </div>
  );
}
