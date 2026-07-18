'use client';

import Image from 'next/image';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { localizeNumber, leagueHref, rememberLeagueName } from '@/lib/utils';

export interface PlayerSeasonStat {
  league: { id: number; name: string; logo: string; season?: number };
  games?: { appearences: number | null; lineups: number | null; minutes: number | null; position: string | null; rating: string | number | null; captain?: boolean } | null;
  substitutes?: { in: number | null; out: number | null; bench: number | null } | null;
  shots?: { total: number | null; on: number | null } | null;
  goals?: { total: number | null; conceded: number | null; assists: number | null; saves: number | null } | null;
  passes?: { total: number | null; key: number | null; accuracy: number | string | null } | null;
  tackles?: { total: number | null; blocks: number | null; interceptions: number | null } | null;
  duels?: { total: number | null; won: number | null } | null;
  dribbles?: { attempts: number | null; success: number | null; past: number | null } | null;
  fouls?: { drawn: number | null; committed: number | null } | null;
  cards?: { yellow: number | null; red: number | null } | null;
  penalty?: { won: number | null; scored: number | null; missed: number | null; saved: number | null } | null;
}

interface PlayerSeasonStatsModalProps {
  stat: PlayerSeasonStat;
  lng: string;
  onClose: () => void;
}

function num(value: number | string | null | undefined, lng: string) {
  return value == null || value === '' ? localizeNumber(0, lng) : localizeNumber(value, lng);
}

export function PlayerSeasonStatsModal({ stat, lng, onClose }: PlayerSeasonStatsModalProps) {
  const { t } = useTranslation(lng);

  const groups: { title: string; rows: { label: string; value: string }[] }[] = [
    {
      title: t('Matches'),
      rows: [
        { label: 'Play', value: num(stat.games?.appearences, lng) },
        { label: 'Start', value: num(stat.games?.lineups, lng) },
        { label: 'Minutes', value: num(stat.games?.minutes, lng) },
        { label: 'Bench', value: num(stat.substitutes?.bench, lng) },
        { label: 'In', value: num(stat.substitutes?.in, lng) },
        { label: 'Out', value: num(stat.substitutes?.out, lng) },
        { label: 'Position', value: stat.games?.position ? t(stat.games.position) : '-' },
        { label: 'Rating', value: stat.games?.rating ? localizeNumber(Number(stat.games.rating).toFixed(2), lng) : '-' },
      ],
    },
    {
      title: t('Goals'),
      rows: [
        { label: 'Goals', value: num(stat.goals?.total, lng) },
        { label: 'Assists', value: num(stat.goals?.assists, lng) },
      ],
    },
    {
      title: t('Passes'),
      rows: [
        { label: 'Passes', value: num(stat.passes?.total, lng) },
        { label: 'Key', value: num(stat.passes?.key, lng) },
        { label: 'Accuracy', value: num(stat.passes?.accuracy, lng) },
      ],
    },
    {
      title: t('Tackles'),
      rows: [
        { label: 'Tackles', value: num(stat.tackles?.total, lng) },
        { label: 'Blocks', value: num(stat.tackles?.blocks, lng) },
        { label: 'Interceptions', value: num(stat.tackles?.interceptions, lng) },
      ],
    },
    {
      title: t('Duels'),
      rows: [
        { label: 'Duels', value: num(stat.duels?.total, lng) },
        { label: 'Won', value: num(stat.duels?.won, lng) },
      ],
    },
    {
      title: t('Dribbles'),
      rows: [
        { label: 'Dribbles', value: num(stat.dribbles?.attempts, lng) },
        { label: 'Success', value: num(stat.dribbles?.success, lng) },
        { label: 'Past', value: num(stat.dribbles?.past, lng) },
      ],
    },
    {
      title: t('Cards'),
      rows: [
        { label: 'Fouls Drawn', value: num(stat.fouls?.drawn, lng) },
        { label: 'Fouls Committed', value: num(stat.fouls?.committed, lng) },
        { label: 'Yellow Cards', value: num(stat.cards?.yellow, lng) },
        { label: 'Red Cards', value: num(stat.cards?.red, lng) },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-md flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <div className="relative h-9 w-9 shrink-0">
            {stat.league.logo && (
              <Image src={stat.league.logo} alt={stat.league.name} fill className="object-contain" unoptimized />
            )}
          </div>
          <Link href={leagueHref(stat.league.id, stat.league.name, undefined, lng)} onClick={() => rememberLeagueName(stat.league.id, stat.league.name, lng)} className="min-w-0 flex-1 truncate text-[15px] font-bold text-gray-900 hover:text-orange-500">
            {stat.league.name}
          </Link>
          <button
            onClick={onClose}
            aria-label={t('Close') || 'Close'}
            className="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 overflow-y-auto bg-gray-50 p-3">
          {groups.map((group) => (
            <div key={group.title} className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
              <div className="px-4 py-2.5">
                <span className="text-[13px] font-semibold text-gray-700">{group.title}</span>
              </div>
              <div className="divide-y divide-gray-50 border-t border-gray-100">
                {group.rows.map((row) => (
                  <div key={row.label} className="flex items-center justify-between px-4 py-2">
                    <span className="text-[13px] text-gray-600">{t(row.label)}</span>
                    <span className="text-[13px] font-semibold text-gray-900">{row.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
