'use client';

import Link from 'next/link';
import { Fixture } from '@/types';
import { useTranslation } from '@/i18n';
import { MapPin, User, Calendar, Clock, Trophy, Flag } from 'lucide-react';
import { format } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { localizeNumber, leagueHref, rememberLeagueName } from '@/lib/utils';
import type { MatchStatistics } from '@/lib/normalize';

interface MatchInfoTabProps {
  fixture: Fixture;
  statistics?: MatchStatistics | null;
  lng: string;
}

const STAT_ROWS: { key: string; label: string; percent?: boolean }[] = [
  { key: 'ballPossession', label: 'Possession', percent: true },
  { key: 'passesAccurate', label: 'Passes_Accurate' },
  { key: 'passesPercentage', label: 'Passes_Percentage', percent: true },
  { key: 'totalPasses', label: 'Total_Passes' },
  { key: 'blockedShots', label: 'Blocked_Shots' },
  { key: 'goalkeeperSaves', label: 'GoalKeeper_Saves' },
  { key: 'cornerKicks', label: 'Corner_Kicks' },
  { key: 'fouls', label: 'Fouls' },
  { key: 'offsides', label: 'Offsides' },
  { key: 'redCards', label: 'Red_Cards' },
  { key: 'yellowCards', label: 'Yellow_Cards' },
  { key: 'shotsInsidebox', label: 'Shots_Inside_Box' },
  { key: 'shotsOffGoal', label: 'Shots_Off_Goal' },
  { key: 'shotsOnGoal', label: 'Shots_On_Goal' },
  { key: 'shotsOutsidebox', label: 'Shots_Outside_Box' },
  { key: 'totalShots', label: 'Total_Shots' },
  { key: 'expectedGoals', label: 'Expected_Goals' },
];

function StatBar({ label, home, away, percent, lng }: { label: string; home: number; away: number; percent?: boolean; lng: string }) {
  const total = home + away || 1;
  const homeWidth = (home / total) * 100;
  const awayWidth = (away / total) * 100;
  const suffix = percent ? '%' : '';

  return (
    <div className="space-y-1.5 px-4 py-2">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-semibold text-gray-900">{localizeNumber(home, lng)}{suffix}</span>
        <span className="text-[11px] text-gray-500">{label}</span>
        <span className="font-semibold text-gray-900">{localizeNumber(away, lng)}{suffix}</span>
      </div>
      <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        <div
          className="rounded-full transition-all"
          style={{ width: `${homeWidth}%`, backgroundColor: home >= away ? '#22c55e' : '#ef4444' }}
        />
        <div
          className="rounded-full transition-all"
          style={{ width: `${awayWidth}%`, backgroundColor: away >= home ? '#22c55e' : '#ef4444' }}
        />
      </div>
    </div>
  );
}

export function MatchInfoTab({ fixture, statistics, lng }: MatchInfoTabProps) {
  const { t } = useTranslation(lng);
  const locale = lng === 'ar' ? ar : enUS;

  const infoItems: Array<{
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value?: string | null;
    href?: string;
    onClick?: () => void;
  }> = [
    {
      icon: Trophy,
      label: t('Leagues'),
      value: fixture.league?.name,
      href: fixture.league?.id ? leagueHref(fixture.league.id, fixture.league.name, fixture.league.logo) : undefined,
      onClick: fixture.league?.id ? () => rememberLeagueName(fixture.league.id, fixture.league.name, lng) : undefined,
    },
    { icon: Flag, label: t('Round'), value: fixture.round ? localizeNumber(fixture.round, lng) : undefined },
    { icon: Calendar, label: t('Season'), value: fixture.date ? localizeNumber(format(new Date(fixture.date), 'EEEE, d MMMM yyyy', { locale }), lng) : '' },
    { icon: Clock, label: t('Minutes'), value: fixture.date ? localizeNumber(format(new Date(fixture.date), 'HH:mm', { locale }), lng) : '' },
    { icon: MapPin, label: t('Info'), value: fixture.venue?.name },
    { icon: MapPin, label: t('Info'), value: fixture.venue?.city },
    { icon: User, label: t('Info'), value: fixture.referee },
  ].filter((item) => item.value);

  return (
    <div className="space-y-3">
      {statistics && (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between px-4 py-3">
            <span className="text-[13px] font-semibold text-gray-700">{t('Statistics')}</span>
          </div>
          <div className="border-t border-gray-100">
            {STAT_ROWS.map((row) => {
              const home = (statistics.homeTeam as unknown as Record<string, number>)[row.key] ?? 0;
              const away = (statistics.awayTeam as unknown as Record<string, number>)[row.key] ?? 0;
              if (home === 0 && away === 0) return null;
              return (
                <StatBar
                  key={row.key}
                  label={t(row.label)}
                  home={home}
                  away={away}
                  percent={row.percent}
                  lng={lng}
                />
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-xl border border-gray-100 bg-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-[13px] font-semibold text-gray-700">{t('MatchInfo')}</span>
        </div>
        <div className="border-t border-gray-100">
          {infoItems.map((item, index) => {
            const content = (
              <div className="flex items-center gap-3 px-4 py-2.5">
                <item.icon className="h-4 w-4 shrink-0 text-gray-400" />
                {/* Dates/times format in the visitor's timezone, which can differ from the
                    server-rendered HTML — patch instead of warning on hydration. */}
                <span suppressHydrationWarning className="text-[13px] text-gray-900">{item.value}</span>
              </div>
            );
            return (
              <div key={index}>
                {index > 0 && <div className="mx-4 border-t border-gray-50" />}
                {item.href ? (
                  <Link href={item.href} onClick={item.onClick} className="block transition-colors hover:bg-gray-50">{content}</Link>
                ) : (
                  content
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
