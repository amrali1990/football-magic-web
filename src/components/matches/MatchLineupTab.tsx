'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { api } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NoData } from '@/components/ui/NoData';
import { useTranslation } from '@/i18n';
import { localizeNumber, playerHref } from '@/lib/utils';
import { LineupPlayerStatsModal, LineupPlayer } from './LineupPlayerStatsModal';

interface MatchLineupTabProps {
  matchId: number;
  lng: string;
}

// Modal when stats exist, otherwise a link to the player page (mirrors the mobile behavior)
function PlayerClickable({
  player,
  onSelect,
  className,
  children,
}: {
  player: LineupPlayer;
  onSelect: (p: LineupPlayer) => void;
  className?: string;
  children: React.ReactNode;
}) {
  if (player.statistics) {
    return (
      <button type="button" onClick={() => onSelect(player)} className={className}>
        {children}
      </button>
    );
  }
  return (
    <Link href={playerHref(player.player.id, player.player.name)} className={className}>
      {children}
    </Link>
  );
}

interface TeamLineup {
  team: { id: number; name: string; logo: string };
  formation: string;
  coach: { id: number; name: string; photo: string } | null;
  players: LineupPlayer[][];
  substitutes: LineupPlayer[];
}

interface LineupResponse {
  homeTeam: TeamLineup;
  awayTeam: TeamLineup;
}

const POS_LABELS: Record<string, string> = { G: 'Goalkeeper', D: 'Defender', M: 'Midfielder', F: 'Attacker' };
const POS_ORDER = ['G', 'D', 'M', 'F'];

// Renders a formation (e.g. "4-3-3") with localized digits, reversed when the team's
// pitch is mirrored so the numbers read in the same direction as the players on the map.
function formatFormation(formation: string | undefined, lng: string, reverse: boolean) {
  if (!formation) return '';
  const parts = formation.split('-');
  const ordered = reverse ? [...parts].reverse() : parts;
  return ordered.map((part) => localizeNumber(part, lng)).join('-');
}

function PitchPlayerCard({ player, lng, onSelect }: { player: LineupPlayer; lng: string; onSelect: (p: LineupPlayer) => void }) {
  const rating = Number(player.statistics?.games?.rating);
  const shortName = player.player.name.length > 9
    ? player.player.name.slice(0, 9) + '..'
    : player.player.name;

  return (
    <PlayerClickable player={player} onSelect={onSelect} className="flex flex-col items-center gap-0.5">
      <div className="relative">
        <div className="relative h-11 w-11 overflow-hidden rounded-full border-2 border-white/60 bg-white/20 shadow-md">
          {player.player.photo ? (
            <Image src={player.player.photo} alt={player.player.name} fill className="object-cover" unoptimized />
          ) : (
            <div className="h-full w-full bg-white/30" />
          )}
        </div>
        <span className="absolute -top-0.5 -left-1 flex h-4 w-4 items-center justify-center rounded-full bg-gray-900/80 text-[8px] font-bold text-white shadow">
          {localizeNumber(player.player.number, lng)}
        </span>
        {rating > 0 ? (
          <span className="absolute -top-0.5 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/90 text-[7px] font-bold text-gray-800 shadow">
            {rating.toFixed(0)}
          </span>
        ) : null}
      </div>
      <span className="max-w-[64px] truncate text-center text-[9px] font-semibold text-white drop-shadow-md">
        {shortName}
      </span>
    </PlayerClickable>
  );
}

function HalfPitch({ players, lng, reverse, onSelect }: { players: LineupPlayer[][]; lng: string; reverse?: boolean; onSelect: (p: LineupPlayer) => void }) {
  const rows = players || [];
  return (
    <div className={`flex h-full flex-1 items-stretch justify-around ${reverse ? 'flex-row-reverse' : 'flex-row'}`}>
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="flex flex-col items-center justify-around py-3">
          {row.map((p) => (
            <PitchPlayerCard key={p.player.id ?? p.player.number} player={p} lng={lng} onSelect={onSelect} />
          ))}
        </div>
      ))}
    </div>
  );
}

function TeamSubstitutes({ lineup, lng, t, onSelect }: { lineup: TeamLineup; lng: string; t: (k: string) => string; onSelect: (p: LineupPlayer) => void }) {
  const subsByPos = POS_ORDER.map((pos) => ({
    pos,
    label: t(POS_LABELS[pos]) || POS_LABELS[pos],
    players: (lineup.substitutes || []).filter((p) => p.player.pos === pos),
  })).filter((g) => g.players.length > 0);

  if (!subsByPos.length) return null;

  return (
    <div className="border-t border-gray-100">
      {subsByPos.map((group, gi) => (
        <div key={group.pos}>
          {gi > 0 && <div className="mx-4 border-t border-gray-100" />}
          <div className="px-4 py-2">
            <span className="text-[11px] font-semibold uppercase text-orange-500">{group.label}</span>
          </div>
          {group.players.map((p, i) => (
            <div key={p.player.id ?? i}>
              {i > 0 && <div className="mx-4 border-t border-gray-50" />}
              <PlayerClickable
                player={p}
                onSelect={onSelect}
                className="flex w-full items-center gap-3 px-4 py-2 text-left transition-colors hover:bg-gray-50"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-bold text-gray-600">
                  {localizeNumber(p.player.number, lng)}
                </span>
                <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-full bg-gray-100">
                  {p.player.photo ? (
                    <Image src={p.player.photo} alt={p.player.name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="h-full w-full bg-gray-200" />
                  )}
                </div>
                <span className="flex-1 text-[13px] font-medium text-gray-900 line-clamp-1">{p.player.name}</span>
                <span className="text-[11px] text-gray-400">{p.player.pos}</span>
              </PlayerClickable>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

export function MatchLineupTab({ matchId, lng }: MatchLineupTabProps) {
  const [data, setData] = useState<LineupResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<LineupPlayer | null>(null);
  const { t } = useTranslation(lng);

  useEffect(() => {
    const fetchLineup = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const res = await api.matches.getFixtureLineup(matchId, lng) as any;
        if (res && res.homeTeam) {
          setData(res as LineupResponse);
        } else if (Array.isArray(res) && res.length >= 2) {
          setData({ homeTeam: res[0], awayTeam: res[1] });
        }
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchLineup();
  }, [matchId, lng]);

  if (loading) return <LoadingSpinner />;
  if (!data) return <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />;

  const home = data.homeTeam;
  const away = data.awayTeam;

  return (
    <div className="space-y-3">
      {/* Formation badges */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          {home?.team.logo && (
            <div className="relative h-4 w-4 shrink-0">
              <Image src={home.team.logo} alt={home.team.name} fill className="object-contain" unoptimized />
            </div>
          )}
          {home?.formation && (
            <span className="rounded-full bg-green-700 px-3 py-0.5 text-[11px] font-bold text-white">
              {formatFormation(home.formation, lng, false)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {away?.formation && (
            <span className="rounded-full bg-green-700 px-3 py-0.5 text-[11px] font-bold text-white">
              {formatFormation(away.formation, lng, true)}
            </span>
          )}
          {away?.team.logo && (
            <div className="relative h-4 w-4 shrink-0">
              <Image src={away.team.logo} alt={away.team.name} fill className="object-contain" unoptimized />
            </div>
          )}
        </div>
      </div>

      {/* Full pitch with both teams */}
      <div className="relative mx-auto w-full overflow-hidden rounded-xl" style={{ height: 420 }}>
        {/* Green pitch */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-700 via-green-600 to-green-700">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'repeating-linear-gradient(to right, transparent, transparent 12.5%, rgba(255,255,255,0.3) 12.5%, rgba(255,255,255,0.3) 25%)',
          }} />
        </div>

        {/* Horizontal pitch markings */}
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 500 420" preserveAspectRatio="none" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="1">
          <rect x="6" y="6" width="488" height="408" rx="2" />
          {/* Center line */}
          <line x1="250" y1="6" x2="250" y2="414" />
          {/* Center circle */}
          <circle cx="250" cy="210" r="40" />
          <circle cx="250" cy="210" r="1.5" fill="rgba(255,255,255,0.25)" />
          {/* Left penalty area */}
          <rect x="6" y="95" width="55" height="230" />
          <rect x="6" y="140" width="22" height="140" />
          <path d="M 61 155 A 40 40 0 0 1 61 265" />
          {/* Right penalty area */}
          <rect x="439" y="95" width="55" height="230" />
          <rect x="472" y="140" width="22" height="140" />
          <path d="M 439 155 A 40 40 0 0 0 439 265" />
        </svg>

        {/* Both teams on the pitch — home left→right, away right→left */}
        <div className="relative flex h-full flex-row">
          {home && <HalfPitch players={home.players} lng={lng} onSelect={setSelectedPlayer} />}
          {away && <HalfPitch players={away.players} lng={lng} reverse onSelect={setSelectedPlayer} />}
        </div>
      </div>

      {/* Substitutes — side by side, each under its team */}
      <div className="grid grid-cols-2 gap-3">
        {home && (
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3">
              {home.team.logo && (
                <div className="relative h-5 w-5 shrink-0">
                  <Image src={home.team.logo} alt={home.team.name} fill className="object-contain" unoptimized />
                </div>
              )}
              <span className="text-[12px] font-semibold text-gray-700 line-clamp-1">{t('Bench')}</span>
            </div>
            <TeamSubstitutes lineup={home} lng={lng} t={t} onSelect={setSelectedPlayer} />
            {home.coach?.name && (
              <div className="border-t border-gray-100">
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-gray-100">
                    {home.coach.photo ? (
                      <Image src={home.coach.photo} alt={home.coach.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="h-full w-full bg-gray-200" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-gray-500">Coach</span>
                    <p className="text-[12px] font-medium text-gray-900 line-clamp-1">{home.coach.name}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        {away && (
          <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center gap-2 px-4 py-3">
              {away.team.logo && (
                <div className="relative h-5 w-5 shrink-0">
                  <Image src={away.team.logo} alt={away.team.name} fill className="object-contain" unoptimized />
                </div>
              )}
              <span className="text-[12px] font-semibold text-gray-700 line-clamp-1">{t('Bench')}</span>
            </div>
            <TeamSubstitutes lineup={away} lng={lng} t={t} onSelect={setSelectedPlayer} />
            {away.coach?.name && (
              <div className="border-t border-gray-100">
                <div className="flex items-center gap-3 px-4 py-2.5">
                  <div className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-gray-100">
                    {away.coach.photo ? (
                      <Image src={away.coach.photo} alt={away.coach.name} fill className="object-cover" unoptimized />
                    ) : (
                      <div className="h-full w-full bg-gray-200" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] text-gray-500">Coach</span>
                    <p className="text-[12px] font-medium text-gray-900 line-clamp-1">{away.coach.name}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedPlayer && (
        <LineupPlayerStatsModal player={selectedPlayer} lng={lng} onClose={() => setSelectedPlayer(null)} />
      )}
    </div>
  );
}
