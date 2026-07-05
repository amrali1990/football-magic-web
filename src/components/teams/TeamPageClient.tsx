'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { useAppSelector } from '@/store/hooks';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { normalizeTeamInfo, RawTeamInfo, TeamData } from '@/lib/normalize';
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
import { SeoIntro } from '@/components/seo/SeoSections';
import { useRouteLanguageSync } from '@/lib/useRouteLanguageSync';

interface TeamPageClientProps {
  teamId: number;
  initialData: TeamData;
  /** Locale the server fetched initialData in ('en' route or '/ar' route). */
  initialLng?: string;
  /** Server-generated intro paragraph (SEO copy rendered into the static HTML). */
  intro?: string;
  introLabel?: string;
}

export function TeamPageClient({ teamId, initialData, initialLng = 'en', intro, introLabel }: TeamPageClientProps) {
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);
  useRouteLanguageSync(initialLng);

  const [teamData, setTeamData] = useState<TeamData | null>(initialData);
  const [loading, setLoading] = useState(false);
  // The server fetched the initial data in the route's locale; only refetch
  // when the user's language differs (e.g. restored from persisted state).
  const fetchedLng = useRef(initialLng);

  useEffect(() => {
    if (lng === fetchedLng.current) return;
    fetchedLng.current = lng;
    let stale = false;
    const fetchTeam = async () => {
      setLoading(true);
      try {
        const data = await api.teams.getInfo(teamId, lng) as RawTeamInfo;
        if (!stale) setTeamData(normalizeTeamInfo(data));
      } catch {
        // Keep showing the previously loaded data on refetch failure.
      } finally {
        if (!stale) setLoading(false);
      }
    };
    fetchTeam();
    return () => { stale = true; };
  }, [teamId, lng]);

  if (!teamData) return loading ? <LoadingSpinner /> : null;

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

      {intro && <SeoIntro label={introLabel ?? `About ${team.name}`} text={intro} />}

      <div className="p-3">
        {loading ? <LoadingSpinner /> : <Tabs tabs={tabs} />}
      </div>
    </div>
  );
}
