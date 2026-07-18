'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Timer, TimerOff, Hourglass, Flag, Goal, AlarmClockPlus } from 'lucide-react';
import { FixtureTeam } from '@/types';
import { formatMatchTime, getMatchStatusColor, localizeNumber, matchHref } from '@/lib/utils';

// Status groups mirror the mobile app's MatchCard (screens/Matches/MatchCard.js)
const IN_PLAY = ['1H', '2H', 'LIVE'];
const HALF_TIME = ['BT', 'HT'];
const PENALTY = ['P', 'PEN'];
const EXTRA_TIME = ['ET', 'AET'];
const FINISHED = ['FT'];
const CANCELED = ['PST', 'CANC', 'ABD', 'AWD', 'WO', 'SUSP', 'INT'];
const NOT_STARTED = ['TBD', 'NS'];
// Statuses that show the live elapsed minute (mobile getTime)
const ELAPSED_LIVE = ['1H', '2H', 'ET', 'LIVE'];

// Structural shape — satisfied by Fixture, FixtureByDate, and the H2H match shape
interface MatchCardFixture {
  id: number;
  date: string;
  status: { short: string; elapsed: number | null };
  teams: { home: FixtureTeam; away: FixtureTeam };
  goals: { home: number | null; away: number | null };
  score?: { penalty?: { home: number | null; away: number | null } };
}

interface MatchCardProps {
  fixture: MatchCardFixture;
  lng: string;
}

// Mirrors the mobile app's checkFixtureStatus icon mapping
function StatusIcon({ short }: { short: string }) {
  const cls = 'h-[18px] w-[18px]';

  if (FINISHED.includes(short)) return <Flag className={`${cls} text-gray-700`} />;
  if (NOT_STARTED.includes(short)) return <Timer className={`${cls} text-gray-700`} />;
  if (PENALTY.includes(short)) return <Goal className={`${cls} text-gray-700`} />;
  if (EXTRA_TIME.includes(short)) return <AlarmClockPlus className={`${cls} text-gray-700`} />;
  if (HALF_TIME.includes(short)) return <Hourglass className={`${cls} text-gray-700`} />;
  if (CANCELED.includes(short)) return <TimerOff className={`${cls} text-red-500`} />;
  return null; // in-play / unknown — no icon (matches mobile behavior)
}

// Mirrors the mobile app's getTeamNameColor: winner green, loser red, draw/not-played dark gray
function teamNameColor(team: { winner?: boolean | null }, opponent: { winner?: boolean | null }) {
  if (team.winner) return 'text-green-600';
  if (opponent.winner) return 'text-red-600';
  return 'text-gray-800';
}

export function MatchCard({ fixture, lng }: MatchCardProps) {
  const statusShort = fixture.status.short;

  // Mobile checkStatus: show the score for in-play/finished/penalty/extra-time/half-time;
  // show the kickoff time for not-started and canceled/postponed matches.
  const showScore =
    IN_PLAY.includes(statusShort) ||
    FINISHED.includes(statusShort) ||
    PENALTY.includes(statusShort) ||
    EXTRA_TIME.includes(statusShort) ||
    HALF_TIME.includes(statusShort);

  const showElapsed = ELAPSED_LIVE.includes(statusShort) && fixture.status.elapsed != null;

  // Penalty result — mobile shows score.penalty for PEN/P. We also show it whenever a
  // shootout actually happened (penalty tally non-zero), so it still appears for matches
  // that finish after extra time (AET/FT) but were decided on penalties.
  const pen = fixture.score?.penalty;
  const hasPenaltyResult =
    pen != null &&
    pen.home != null &&
    pen.away != null &&
    (PENALTY.includes(statusShort) || Number(pen.home) > 0 || Number(pen.away) > 0);

  return (
    <Link
      href={matchHref(fixture.id, fixture.teams.home.name, fixture.teams.away.name, lng)}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50/80"
    >
      <div className="flex flex-1 items-center justify-end gap-2.5 text-right">
        <span className={`text-[13px] font-medium line-clamp-1 ${teamNameColor(fixture.teams.home, fixture.teams.away)}`}>
          {fixture.teams.home.name}
        </span>
        <div className="relative h-7 w-7 shrink-0">
          <Image
            src={fixture.teams.home.logo}
            alt={fixture.teams.home.name}
            fill
            className="object-contain"
            unoptimized
          />
        </div>
      </div>

      <div className="flex w-[76px] shrink-0 flex-col items-center">
        {showScore ? (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-[17px] font-bold text-gray-900">
                {localizeNumber(fixture.goals.home, lng)}
              </span>
              <span className="text-[13px] text-gray-300">-</span>
              <span className="text-[17px] font-bold text-gray-900">
                {localizeNumber(fixture.goals.away, lng)}
              </span>
            </div>
            {hasPenaltyResult ? (
              <span className="mt-0.5 whitespace-nowrap rounded bg-gray-100 px-1.5 py-px text-[10px] font-bold text-gray-600">
                {`${localizeNumber(pen!.home, lng)}-${localizeNumber(pen!.away, lng)}`}
              </span>
            ) : null}
          </>
        ) : (
          <span
            // Kickoff time renders in the visitor's timezone, which can differ
            // from the server-rendered HTML — patch instead of warning.
            suppressHydrationWarning
            className="rounded-md bg-gray-50 px-2.5 py-1 text-[13px] font-semibold text-gray-600"
          >
            {formatMatchTime(fixture.date, lng)}
          </span>
        )}
        {showElapsed ? (
          <span className={`mt-0.5 text-[11px] font-semibold ${getMatchStatusColor(statusShort)}`}>
            {`${localizeNumber(fixture.status.elapsed, lng)}'`}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 items-center gap-2.5">
        <div className="relative h-7 w-7 shrink-0">
          <Image
            src={fixture.teams.away.logo}
            alt={fixture.teams.away.name}
            fill
            className="object-contain"
            unoptimized
          />
        </div>
        <span className={`text-[13px] font-medium line-clamp-1 ${teamNameColor(fixture.teams.away, fixture.teams.home)}`}>
          {fixture.teams.away.name}
        </span>
      </div>

      <div className="flex w-5 shrink-0 items-center justify-center">
        <StatusIcon short={statusShort} />
      </div>
    </Link>
  );
}
