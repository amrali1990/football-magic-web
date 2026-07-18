'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NoData } from '@/components/ui/NoData';
import { useTranslation } from '@/i18n';
import { localizeNumber, playerHref } from '@/lib/utils';

interface MatchEventsTabProps {
  matchId: number;
  homeTeamId: number;
  lng: string;
}

interface MatchEvent {
  id: number;
  teamId: number;
  time: number;
  type: number;
  details: string | null;
  player: { id: number; name: string };
  assist: { id: number | null; name: string | null } | null;
}

function EventIcon({ type }: { type: number }) {
  if (type >= 9 && type <= 13) {
    return <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-600">VAR</span>;
  }
  if (type === 2) {
    return <span className="text-[14px]">⚽<span className="text-[10px] text-red-500">OG</span></span>;
  }
  if (type === 4) {
    return <span className="text-[14px]">⚽<span className="text-[10px] text-red-500">✕</span></span>;
  }
  if (type === 5) return <span className="inline-block h-4 w-3 rounded-sm bg-yellow-400" />;
  if (type === 6) {
    return (
      <span className="relative inline-flex gap-0.5">
        <span className="inline-block h-4 w-3 rounded-sm bg-yellow-400" />
        <span className="inline-block h-4 w-3 rounded-sm bg-red-500" />
      </span>
    );
  }
  if (type === 7) return <span className="inline-block h-4 w-3 rounded-sm bg-red-500" />;
  if (type === 1 || type === 3) return <span className="text-[14px]">⚽</span>;
  if (type === 8) return <span className="text-[14px]">🔄</span>;
  return <span className="text-[14px]">•</span>;
}

function EventContent({ event, lng, t, align }: { event: MatchEvent; lng: string; t: (k: string) => string; align: 'left' | 'right' }) {
  const isSub = event.type === 8;
  const isGoal = event.type >= 1 && event.type <= 3;
  const isVar = event.type >= 9 && event.type <= 13;
  const textAlign = align === 'left' ? 'text-left' : 'text-right';

  return (
    <div className={`min-w-0 ${textAlign}`}>
      {event.player?.id ? (
        <Link href={playerHref(event.player.id, event.player.name, lng)} className="text-[13px] font-medium text-gray-900 hover:underline">
          {event.player.name}
        </Link>
      ) : (
        <span className="text-[13px] font-medium text-gray-900">{event.player?.name}</span>
      )}
      {isSub && event.assist?.name && (
        <p className="text-[11px] text-green-600">
          ↑ {event.assist.id ? (
            <Link href={playerHref(event.assist.id, event.assist.name, lng)} className="hover:underline">{event.assist.name}</Link>
          ) : event.assist.name}
        </p>
      )}
      {isGoal && event.assist?.name && (
        <p className="text-[11px] text-gray-500">
          {t('Assisted_By')}: {event.assist.id ? (
            <Link href={playerHref(event.assist.id, event.assist.name, lng)} className="hover:underline">{event.assist.name}</Link>
          ) : event.assist.name}
        </p>
      )}
      {isVar && event.details && (
        <p className="text-[11px] text-blue-500">{event.details}</p>
      )}
    </div>
  );
}

export function MatchEventsTab({ matchId, homeTeamId, lng }: MatchEventsTabProps) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation(lng);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const data = await api.matches.getFixtureEvents(matchId, lng) as any;
        const list = Array.isArray(data) ? data : data?.events ?? [];
        setEvents(list);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [matchId, lng]);

  if (loading) return <LoadingSpinner />;
  if (!events.length) return <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />;

  const sorted = [...events].sort((a, b) => a.time - b.time || b.type - a.type);

  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      {sorted.map((event, index) => {
        const isHome = event.teamId === homeTeamId;

        return (
          <div key={event.id ?? index}>
            {index > 0 && <div className="mx-4 border-t border-gray-50" />}
            <div className="flex items-center px-4 py-2.5">
              {/* Home side */}
              <div className="flex flex-1 items-center justify-end gap-2">
                {isHome && (
                  <>
                    <EventContent event={event} lng={lng} t={t} align="right" />
                    <div className="shrink-0">
                      <EventIcon type={event.type} />
                    </div>
                  </>
                )}
              </div>

              {/* Center time column */}
              <div className="mx-3 flex w-10 shrink-0 items-center justify-center">
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-bold text-gray-500">
                  {localizeNumber(event.time, lng)}&apos;
                </span>
              </div>

              {/* Away side */}
              <div className="flex flex-1 items-center gap-2">
                {!isHome && (
                  <>
                    <div className="shrink-0">
                      <EventIcon type={event.type} />
                    </div>
                    <EventContent event={event} lng={lng} t={t} align="left" />
                  </>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
