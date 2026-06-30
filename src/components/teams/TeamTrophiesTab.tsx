'use client';

import { TeamLeagueSeasonList } from './TeamLeagueSeasonList';

interface TeamTrophiesTabProps {
  teamId: number;
  lng: string;
}

export function TeamTrophiesTab({ teamId, lng }: TeamTrophiesTabProps) {
  return <TeamLeagueSeasonList teamId={teamId} lng={lng} source="winners" />;
}
