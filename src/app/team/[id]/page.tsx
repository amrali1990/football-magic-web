'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import { useAppSelector } from '@/store/hooks';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { Team, Country, Venue } from '@/types';
import { Tabs } from '@/components/ui/Tabs';
import { FavoriteButton } from '@/components/ui/FavoriteButton';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { TeamInfoTab } from '@/components/teams/TeamInfoTab';
import { TeamSeasonsTab } from '@/components/teams/TeamSeasonsTab';
import { TeamMatchesTab } from '@/components/teams/TeamMatchesTab';
import { TeamTransfersTab } from '@/components/teams/TeamTransfersTab';
import { TeamSquadTab } from '@/components/teams/TeamSquadTab';
import { TeamTrophiesTab } from '@/components/teams/TeamTrophiesTab';
import { PageHeader } from '@/components/layout/PageHeader';

interface TeamData {
  team: Team;
  coverage?: { transfers: boolean; squad: boolean; trophies: boolean };
}

// Raw shape returned by /teams/getTeamInformations: `venue` is a sibling of `team`,
// `country` is a plain string (the name) with `countryCode` provided separately, and
// tab availability comes back as top-level booleans (transfers/squad/winner).
interface RawTeamInfo {
  team: Team & { country?: string | Country; countryCode?: string };
  venue?: Venue;
  transfers?: boolean;
  squad?: boolean;
  winner?: boolean;
}

function normalizeTeam(raw: RawTeamInfo): TeamData {
  const rawCountry = raw.team.country;
  const country: Country | undefined =
    typeof rawCountry === 'string'
      ? { name: rawCountry, code: raw.team.countryCode ?? '', flag: '' }
      : rawCountry;

  const team: Team = {
    ...raw.team,
    country,
    venue: raw.venue ?? raw.team.venue,
  };

  return {
    team,
    coverage: {
      transfers: !!raw.transfers,
      squad: !!raw.squad,
      trophies: !!raw.winner,
    },
  };
}

export default function TeamPage() {
  const params = useParams();
  const teamId = Number(params.id);
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);

  const [teamData, setTeamData] = useState<TeamData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const data = await api.teams.getInfo(teamId, lng) as RawTeamInfo;
        setTeamData(normalizeTeam(data));
      } catch {
        setTeamData(null);
      } finally {
        setLoading(false);
      }
    };
    fetchTeam();
  }, [teamId, lng]);

  if (loading) return <LoadingSpinner />;
  if (!teamData) return null;

  const { team, coverage } = teamData;

  const tabs = [
    { key: 'info', label: t('TeamInfo'), content: <TeamInfoTab team={team} lng={lng} /> },
    { key: 'seasons', label: t('TeamSeasons'), content: <TeamSeasonsTab teamId={teamId} lng={lng} /> },
    { key: 'matches', label: t('TeamMatches'), content: <TeamMatchesTab teamId={teamId} lng={lng} /> },
  ];

  // Mirrors the mobile TeamScreen tab visibility: transfers only for clubs (not national teams)
  if (!team.national && coverage?.transfers) {
    tabs.push({ key: 'transfers', label: t('TeamTransfers'), content: <TeamTransfersTab teamId={teamId} lng={lng} /> });
  }
  if (coverage?.squad) {
    tabs.push({ key: 'squad', label: t('Squad'), content: <TeamSquadTab teamId={teamId} lng={lng} /> });
  }
  if (coverage?.trophies) {
    tabs.push({ key: 'trophies', label: t('TeamTrophies'), content: <TeamTrophiesTab teamId={teamId} lng={lng} /> });
  }

  return (
    <div className="flex flex-col">
      <PageHeader>
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="relative h-9 w-9 shrink-0">
            <Image src={team.logo} alt={team.name} fill className="object-contain" unoptimized />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-[17px] font-bold text-gray-900 line-clamp-1">{team.name}</h1>
            {team.country && (
              <div className="flex items-center gap-1.5">
                {team.country.flag && (
                  <Image src={team.country.flag} alt={team.country.name} width={14} height={10} className="rounded-sm" unoptimized />
                )}
                <span className="text-[12px] text-gray-500">{team.country.name}</span>
              </div>
            )}
          </div>
          <FavoriteButton entityId={team.id} entityType="TEAM" />
        </div>
      </PageHeader>

      <div className="p-3">
        <Tabs tabs={tabs} />
      </div>
    </div>
  );
}
