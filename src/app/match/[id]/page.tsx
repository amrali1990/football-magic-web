'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useAppSelector } from '@/store/hooks';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { Fixture } from '@/types';
import { leagueHref } from '@/lib/utils';
import { Tabs } from '@/components/ui/Tabs';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MatchInfoTab } from '@/components/matches/MatchInfoTab';
import { MatchEventsTab } from '@/components/matches/MatchEventsTab';
import { MatchLineupTab } from '@/components/matches/MatchLineupTab';
import { MatchH2HTab } from '@/components/matches/MatchH2HTab';
import { PageHeader } from '@/components/layout/PageHeader';
import { getMatchStatusColor, formatMatchTime, localizeNumber } from '@/lib/utils';

export interface MatchStatistics {
  homeTeam: TeamStats;
  awayTeam: TeamStats;
}

export interface TeamStats {
  team: { id: number; name: string; logo: string };
  shotsOnGoal: number;
  shotsOffGoal: number;
  totalShots: number;
  blockedShots: number;
  shotsInsidebox: number;
  shotsOutsidebox: number;
  fouls: number;
  cornerKicks: number;
  offsides: number;
  ballPossession: number;
  yellowCards: number;
  redCards: number;
  goalkeeperSaves: number;
  totalPasses: number;
  passesAccurate: number;
  passesPercentage: number;
  expectedGoals: number;
}

export default function MatchPage() {
  const params = useParams();
  const matchId = Number(params.id);
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);

  const [fixture, setFixture] = useState<Fixture | null>(null);
  const [statistics, setStatistics] = useState<MatchStatistics | null>(null);
  const [hasEvents, setHasEvents] = useState(false);
  const [hasLineup, setHasLineup] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFixture = async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await api.matches.getFixture(matchId, lng) as any;
        if (response && response.fixture) {
          setFixture({
            id: response.fixture.id,
            referee: response.fixture.referee,
            date: response.fixture.date,
            timestamp: response.fixture.timestamp,
            round: response.fixture.round,
            venue: response.fixture.venue,
            status: response.fixture.status,
            league: {
              id: response.league?.id ?? 0,
              name: response.league?.name ?? '',
              logo: response.league?.logo ?? '',
              type: response.league?.type ?? '',
              country: { name: response.league?.country ?? '', code: '', flag: response.league?.flag ?? '' },
            },
            teams: response.teams ?? { home: { id: 0, name: '', logo: '', winner: null }, away: { id: 0, name: '', logo: '', winner: null } },
            goals: response.goals ?? { home: null, away: null },
            score: response.score ?? { halftime: { home: null, away: null }, fulltime: { home: null, away: null }, extratime: { home: null, away: null }, penalty: { home: null, away: null } },
          });
          if (response.statistics) setStatistics(response.statistics);
          if (response.events) setHasEvents(true);
          if (response.lineup) setHasLineup(true);
        } else {
          setFixture(response as Fixture);
        }
      } catch {
        setFixture(null);
      } finally {
        setLoading(false);
      }
    };
    fetchFixture();
  }, [matchId, lng]);

  if (loading) return <LoadingSpinner />;
  if (!fixture) return null;

  const statusShort = fixture.status?.short ?? '';
  const isLive = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'].includes(statusShort);
  const isNotStarted = statusShort === 'NS' || statusShort === 'TBD';
  const pen = fixture.score?.penalty;
  const hasPenaltyResult =
    pen != null &&
    pen.home != null &&
    pen.away != null &&
    (['P', 'PEN'].includes(statusShort) || Number(pen.home) > 0 || Number(pen.away) > 0);

  const tabs = [
    { key: 'info', label: t('MatchInfo'), content: <MatchInfoTab fixture={fixture} statistics={statistics} lng={lng} /> },
    ...(hasEvents ? [{ key: 'events', label: t('Events'), content: <MatchEventsTab matchId={matchId} homeTeamId={fixture.teams.home.id} lng={lng} /> }] : []),
    ...(hasLineup ? [{ key: 'lineup', label: t('LineUp'), content: <MatchLineupTab matchId={matchId} lng={lng} /> }] : []),
    { key: 'h2h', label: t('Head2Head'), content: <MatchH2HTab matchId={matchId} lng={lng} /> },
  ];

  return (
    <div className="flex flex-col">
      <PageHeader>
        <Link href={leagueHref(fixture.league.id, fixture.league.name, fixture.league.logo)} className="flex items-center gap-2 border-b border-gray-100 px-4 py-2.5 transition-colors hover:bg-gray-50">
          {fixture.league.logo && (
            <div className="relative h-5 w-5">
              <Image src={fixture.league.logo} alt={fixture.league.name} fill className="object-contain" unoptimized />
            </div>
          )}
          <span className="text-xs font-medium text-gray-600">{fixture.league.name}</span>
        </Link>

        <div className="flex items-center justify-center gap-4 px-4 py-6">
          <Link href={`/team/${fixture.teams.home.id}`} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative h-14 w-14">
              {fixture.teams.home.logo && (
                <Image src={fixture.teams.home.logo} alt={fixture.teams.home.name} fill className="object-contain" unoptimized />
              )}
            </div>
            <span className="text-center text-xs font-medium text-gray-900">{fixture.teams.home.name}</span>
          </Link>

          <div className="flex flex-col items-center">
            {isNotStarted ? (
              <span className="text-lg font-bold text-gray-500">{formatMatchTime(fixture.date, lng)}</span>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-3xl font-bold text-gray-900">{localizeNumber(fixture.goals.home, lng)}</span>
                <span className="text-lg text-gray-400">-</span>
                <span className="text-3xl font-bold text-gray-900">{localizeNumber(fixture.goals.away, lng)}</span>
              </div>
            )}
            {hasPenaltyResult ? (
              <span className="mt-0.5 whitespace-nowrap text-xs font-semibold text-gray-500">
                {`${localizeNumber(pen!.home, lng)}-${localizeNumber(pen!.away, lng)}`}
              </span>
            ) : null}
            <span className={`mt-1 text-sm font-medium ${getMatchStatusColor(statusShort)}`}>
              {isLive && fixture.status.elapsed
                ? `${localizeNumber(fixture.status.elapsed, lng)}'`
                : t(`${statusShort}_LONG`) || t(statusShort) || statusShort}
            </span>
          </div>

          <Link href={`/team/${fixture.teams.away.id}`} className="flex flex-1 flex-col items-center gap-2">
            <div className="relative h-14 w-14">
              {fixture.teams.away.logo && (
                <Image src={fixture.teams.away.logo} alt={fixture.teams.away.name} fill className="object-contain" unoptimized />
              )}
            </div>
            <span className="text-center text-xs font-medium text-gray-900">{fixture.teams.away.name}</span>
          </Link>
        </div>
      </PageHeader>

      <div className="p-3">
        <Tabs tabs={tabs} />
      </div>
    </div>
  );
}
