'use client';

import { TeamLeagueSeasonList } from './TeamLeagueSeasonList';

interface TeamSeasonsTabProps {
  teamId: number;
  lng: string;
}

export function TeamSeasonsTab({ teamId, lng }: TeamSeasonsTabProps) {
  return <TeamLeagueSeasonList teamId={teamId} lng={lng} source="seasons" />;
}
