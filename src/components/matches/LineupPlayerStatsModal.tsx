'use client';

import Image from 'next/image';
import Link from 'next/link';
import { X, ExternalLink, Shirt, User } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { localizeNumber, playerHref } from '@/lib/utils';

export interface LineupPlayerStats {
  games?: { minutes: number | null; rating: string | number | null; captain?: boolean } | null;
  offsides?: number | null;
  shots?: { total: number | null; on: number | null } | null;
  goals?: { total: number | null; conceded: number | null; assists: number | null; saves: number | null } | null;
  passes?: { total: number | null; key: number | null; accuracy: number | string | null } | null;
  duels?: { total: number | null; won: number | null } | null;
  dribbles?: { attempts: number | null; success: number | null } | null;
  fouls?: { drawn: number | null; committed: number | null } | null;
  cards?: { yellow: number | null; red: number | null } | null;
  penalty?: { won: number | null; scored: number | null; missed: number | null; saved: number | null } | null;
}

export interface LineupPlayer {
  player: { id: number; name: string; photo: string; number: number; pos: string; grid: string | null };
  statistics?: LineupPlayerStats | null;
}

interface LineupPlayerStatsModalProps {
  player: LineupPlayer;
  lng: string;
  onClose: () => void;
}

const POSITION_LABELS: Record<string, string> = {
  G: 'Goalkeeper',
  D: 'Defender',
  M: 'Midfielder',
  F: 'Attacker',
};

function num(value: number | string | null | undefined, lng: string) {
  return value == null || value === '' ? localizeNumber(0, lng) : localizeNumber(value, lng);
}

// "won/total (xx.xx%)" with localized digits, mirroring the mobile modal helpers
function ratio(part: number | null | undefined, total: number | null | undefined, lng: string) {
  if (part == null || total == null) return localizeNumber(0, lng);
  const pct = total ? (part / total) * 100 : 0;
  return localizeNumber(`${part}/${total} (${pct.toFixed(2)}%)`, lng);
}

export function LineupPlayerStatsModal({ player, lng, onClose }: LineupPlayerStatsModalProps) {
  const { t } = useTranslation(lng);
  const s = player.statistics || {};
  const isGK = player.player.pos === 'G';

  const rows: { label: string; value: string }[] = [
    { label: 'Minutes Played', value: num(s.games?.minutes, lng) },
    { label: 'Rating', value: num(s.games?.rating, lng) },
    { label: 'Offsides', value: num(s.offsides, lng) },
    { label: 'Shots', value: num(s.shots?.total, lng) },
    { label: 'Shots On Target', value: num(s.shots?.on, lng) },
    { label: 'Goals', value: num(s.goals?.total, lng) },
    ...(isGK
      ? [
          { label: 'Goals Conceded', value: num(s.goals?.conceded, lng) },
          { label: 'Goals Saved', value: num(s.goals?.saves, lng) },
        ]
      : []),
    { label: 'Assists', value: num(s.goals?.assists, lng) },
    { label: 'Accurate Passes', value: ratio(toNum(s.passes?.accuracy), s.passes?.total, lng) },
    { label: 'Key Passes', value: num(s.passes?.key, lng) },
    { label: 'Duels', value: ratio(s.duels?.won, s.duels?.total, lng) },
    { label: 'Dribbles', value: ratio(s.dribbles?.success, s.dribbles?.attempts, lng) },
    { label: 'Fouls Drawn', value: num(s.fouls?.drawn, lng) },
    { label: 'Fouls Committed', value: num(s.fouls?.committed, lng) },
    { label: 'Yellow Cards', value: num(s.cards?.yellow, lng) },
    { label: 'Red Cards', value: num(s.cards?.red, lng) },
    ...(isGK ? [{ label: 'Penalty Saved', value: num(s.penalty?.saved, lng) }] : []),
    { label: 'Penalty Won', value: num(s.penalty?.won, lng) },
    { label: 'Penalty Scored', value: num(s.penalty?.scored, lng) },
    { label: 'Penalty Missed', value: num(s.penalty?.missed, lng) },
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
          <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-gray-100">
            {player.player.photo ? (
              <Image src={player.player.photo} alt={player.player.name} fill className="object-cover" unoptimized />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <User className="h-6 w-6 text-gray-300" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link
              href={playerHref(player.player.id, player.player.name, lng)}
              className="flex items-center gap-1.5 text-[15px] font-bold text-gray-900 hover:text-orange-500"
            >
              <span className="truncate">{player.player.name}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            </Link>
            <div className="mt-0.5 flex items-center gap-2 text-[12px] text-gray-500">
              <span>{t(POSITION_LABELS[player.player.pos]) || POSITION_LABELS[player.player.pos] || ''}</span>
              {player.player.number != null && (
                <span className="flex items-center gap-1">
                  <Shirt className="h-3.5 w-3.5" />
                  {localizeNumber(player.player.number, lng)}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={t('Close') || 'Close'}
            className="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto bg-gray-50 p-3">
          <div className="divide-y divide-gray-50 rounded-xl border border-gray-100 bg-white">
            {rows.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-[13px] text-gray-600">{t(row.label)}</span>
                <span className="text-[13px] font-semibold text-gray-900">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function toNum(value: number | string | null | undefined): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
}
