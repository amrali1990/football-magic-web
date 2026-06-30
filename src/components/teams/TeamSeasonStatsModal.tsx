'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { X, House, Plane, ExternalLink } from 'lucide-react';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { localizeNumber, formatDisplayDate } from '@/lib/utils';
import { Fixture } from '@/types';
import { MatchCard } from '@/components/matches/MatchCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { NoData } from '@/components/ui/NoData';

interface StatTriple {
  home: number | string | null;
  away: number | string | null;
  total: number | string | null;
}

interface TimelinePeriod {
  period?: string;
  total: number | null;
  percentage: string | null;
}

export interface TeamStatistics {
  league: { id: number; name: string; logo: string };
  team?: { id: number; name: string; logo: string };
  fixtures: { played: StatTriple; wins: StatTriple; draws: StatTriple; loses: StatTriple };
  clean_sheet: StatTriple;
  failed_to_score: StatTriple;
  goals: {
    for: { total: StatTriple; average: StatTriple; minutes: TimelinePeriod[] };
    against: { total: StatTriple; average: StatTriple; minutes: TimelinePeriod[] };
  };
  cards: { yellow: TimelinePeriod[]; red: TimelinePeriod[] };
  penalty: {
    missed: { total: number | null; percentage: string | null };
    scored: { total: number | null; percentage: string | null };
  };
}

interface Season {
  year: number;
  label: string;
  start: string;
  end: string;
}

interface TeamSeasonStatsModalProps {
  stats: TeamStatistics;
  season: Season;
  teamId: number;
  leagueId: number;
  lng: string;
  onClose: () => void;
  /**
   * What the header title links to:
   * - 'league' (default): opened from a team context → show/link the league
   * - 'team': opened from a league context → show/link the team
   */
  header?: 'league' | 'team';
}

function num(value: number | string | null | undefined, lng: string) {
  return value == null || value === '' ? localizeNumber(0, lng) : localizeNumber(value, lng);
}

function fmtDate(value: string, lng: string) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return new Intl.DateTimeFormat(lng === 'ar' ? 'ar-EG' : 'en-US', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
  }).format(d);
}

function cardsSum(cards: TimelinePeriod[]) {
  return (cards || []).reduce((sum, c) => sum + (c.total ?? 0), 0);
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="px-4 py-2.5">
        <span className="text-[13px] font-semibold text-gray-700">{title}</span>
      </div>
      <div className="border-t border-gray-100">{children}</div>
    </div>
  );
}

function ColumnHeader() {
  return (
    <div className="flex items-center border-b border-gray-100 px-4 py-1.5">
      <span className="flex-1" />
      <span className="flex w-10 justify-center"><House className="h-3.5 w-3.5 text-gray-400" /></span>
      <span className="flex w-10 justify-center"><Plane className="h-3.5 w-3.5 text-gray-400" /></span>
      <span className="w-10 text-center text-[11px] font-semibold text-gray-400">#</span>
    </div>
  );
}

function TripleRow({ label, value, lng }: { label: string; value: StatTriple; lng: string }) {
  const { t } = useTranslation(lng);
  return (
    <div className="flex items-center px-4 py-2 hover:bg-gray-50">
      <span className="flex-1 text-[13px] text-gray-700">{t(label)}</span>
      <span className="w-10 text-center text-[13px] text-gray-600">{num(value.home, lng)}</span>
      <span className="w-10 text-center text-[13px] text-gray-600">{num(value.away, lng)}</span>
      <span className="w-10 text-center text-[13px] font-bold text-gray-900">{num(value.total, lng)}</span>
    </div>
  );
}

function Timeline({ data, lng }: { data: TimelinePeriod[]; lng: string }) {
  if (!data || data.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto px-4 py-2.5">
      {data.map((item, i) => (
        <div key={i} className="flex min-w-[52px] flex-col items-center rounded-lg bg-gray-50 px-2 py-1.5">
          <span className="text-[10px] text-gray-400">{item.period ? localizeNumber(item.period, lng) : ''}</span>
          <span className="text-[13px] font-bold text-gray-900">{num(item.total, lng)}</span>
          <span className="text-[10px] text-gray-400">{num(item.percentage, lng)}%</span>
        </div>
      ))}
    </div>
  );
}

function MatchesTab({ teamId, leagueId, year, lng }: { teamId: number; leagueId: number; year: number; lng: string }) {
  const { t } = useTranslation(lng);
  const [fixtures, setFixtures] = useState<Fixture[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.teams.getSeasonFixtures(teamId, year, lng) as { fixtures?: Fixture[] } | Fixture[];
        const list = Array.isArray(data) ? data : data?.fixtures || [];
        const filtered = list
          .filter((f) => f.league?.id === leagueId)
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (active) setFixtures(filtered);
      } catch {
        if (active) setFixtures([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [teamId, leagueId, year, lng]);

  if (loading) return <LoadingSpinner />;
  if (!fixtures.length) return <NoData title={t('NoDataTitle')} subtitle={t('NoDataSubtitle')} />;

  return (
    <div className="space-y-3">
      {fixtures.map((fixture) => (
        <div key={fixture.id} className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-end px-4 py-2">
            <span className="text-[11px] text-gray-400">
              {fixture.date ? formatDisplayDate(new Date(fixture.date), lng) : ''}
            </span>
          </div>
          <div className="border-t border-gray-50">
            <MatchCard fixture={fixture} lng={lng} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TeamSeasonStatsModal({ stats, season, teamId, leagueId, lng, onClose, header = 'league' }: TeamSeasonStatsModalProps) {
  const { t } = useTranslation(lng);
  const [activeTab, setActiveTab] = useState<'stats' | 'matches'>('stats');

  // Header title links to the league (team context) or the team (league context)
  const isTeamHeader = header === 'team';
  const headerEntity = isTeamHeader
    ? { name: stats.team?.name ?? '', logo: stats.team?.logo ?? '', href: `/team/${stats.team?.id ?? teamId}` }
    : { name: stats.league.name, logo: stats.league.logo, href: `/league/${stats.league.id ?? leagueId}` };
  const headerSubtitle = isTeamHeader
    ? stats.league.name
    : `${fmtDate(season.start, lng)} - ${fmtDate(season.end, lng)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-3"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3">
          <div className="relative h-9 w-9 shrink-0">
            {headerEntity.logo && (
              <Image src={headerEntity.logo} alt={headerEntity.name} fill className="object-contain" unoptimized />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link href={headerEntity.href} className="flex items-center gap-1.5 text-[15px] font-bold text-gray-900 hover:text-orange-500">
              <span className="truncate">{headerEntity.name}</span>
              <ExternalLink className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            </Link>
            {headerSubtitle.trim() && headerSubtitle.trim() !== '-' && (
              <p className="truncate text-[12px] text-gray-500">{headerSubtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label={t('Close') || 'Close'}
            className="shrink-0 rounded-full p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100">
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex-1 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
              activeTab === 'stats'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('Statistics')}
          </button>
          <button
            onClick={() => setActiveTab('matches')}
            className={`flex-1 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
              activeTab === 'matches'
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('Matches')}
          </button>
        </div>

        {/* Body */}
        <div className="space-y-3 overflow-y-auto bg-gray-50 p-3">
          {activeTab === 'matches' ? (
            <MatchesTab teamId={teamId} leagueId={leagueId} year={season.year} lng={lng} />
          ) : (
          <>
          {/* Matches stats group */}
          <Section title={t('Matches')}>
            <ColumnHeader />
            <div className="divide-y divide-gray-50">
              <TripleRow label="Played" value={stats.fixtures.played} lng={lng} />
              <TripleRow label="Wins" value={stats.fixtures.wins} lng={lng} />
              <TripleRow label="Draws" value={stats.fixtures.draws} lng={lng} />
              <TripleRow label="Loses" value={stats.fixtures.loses} lng={lng} />
              <TripleRow label="clean_sheet" value={stats.clean_sheet} lng={lng} />
              <TripleRow label="failed_to_score" value={stats.failed_to_score} lng={lng} />
            </div>
          </Section>

          {/* Goals */}
          <Section title={t('Goals')}>
            <div className="divide-y divide-gray-50">
              <TripleRow label="Scored" value={stats.goals.for.total} lng={lng} />
              <TripleRow label="Scored Avg" value={stats.goals.for.average} lng={lng} />
            </div>
            <Timeline data={stats.goals.for.minutes} lng={lng} />
            <div className="divide-y divide-gray-50 border-t border-gray-100">
              <TripleRow label="Conceded" value={stats.goals.against.total} lng={lng} />
              <TripleRow label="Conceded Avg" value={stats.goals.against.average} lng={lng} />
            </div>
            <Timeline data={stats.goals.against.minutes} lng={lng} />
          </Section>

          {/* Cards */}
          <Section title={t('Cards')}>
            <div className="flex items-center gap-2.5 px-4 py-2.5">
              <span className="inline-block h-4 w-3 rounded-sm bg-yellow-400" />
              <span className="text-[14px] font-bold text-gray-900">{num(cardsSum(stats.cards.yellow), lng)}</span>
            </div>
            <Timeline data={stats.cards.yellow} lng={lng} />
            <div className="flex items-center gap-2.5 border-t border-gray-100 px-4 py-2.5">
              <span className="inline-block h-4 w-3 rounded-sm bg-red-500" />
              <span className="text-[14px] font-bold text-gray-900">{num(cardsSum(stats.cards.red), lng)}</span>
            </div>
            <Timeline data={stats.cards.red} lng={lng} />
          </Section>

          {/* Penalties */}
          <Section title={t('Penalties')}>
            <div className="flex divide-x divide-gray-100">
              <div className="flex w-1/2 flex-col items-center px-4 py-3">
                <span className="text-[12px] font-medium text-gray-500">{t('Missed Penalties')}</span>
                <span className="mt-1 text-[15px] font-bold text-gray-900">{num(stats.penalty.missed.total, lng)}</span>
                <span className="text-[12px] text-orange-500">{num(stats.penalty.missed.percentage, lng)}</span>
              </div>
              <div className="flex w-1/2 flex-col items-center px-4 py-3">
                <span className="text-[12px] font-medium text-gray-500">{t('Scored Penalties')}</span>
                <span className="mt-1 text-[15px] font-bold text-gray-900">{num(stats.penalty.scored.total, lng)}</span>
                <span className="text-[12px] text-green-600">{num(stats.penalty.scored.percentage, lng)}</span>
              </div>
            </div>
          </Section>
          </>
          )}
        </div>
      </div>
    </div>
  );
}
