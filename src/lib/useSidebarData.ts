'use client';

import { useState, useEffect } from 'react';
import { useAppSelector, useRehydrated } from '@/store/hooks';
import { useLayoutContext, SidebarTeam, SidebarLeague } from '@/lib/layout-context';
import { api } from '@/lib/api';

interface SidebarResponse {
  leagues?: SidebarLeague[];
  teams?: SidebarTeam[];
}

/**
 * Top leagues/teams for the right sidebar, scoped to the current page's
 * SidebarScope (date on home, country on country pages, entity scope on
 * league/team/match/player pages). Without a scope the server-rendered
 * global seed is used as-is for English (no client fetch at all); Arabic
 * users and scoped pages fetch from the context-aware /leagues/getSidebar
 * endpoint (cached 5 minutes on the backend).
 */
export function useSidebarData(limit = 5): { teams: SidebarTeam[]; leagues: SidebarLeague[] } {
  const { code: lng } = useAppSelector((state) => state.language.language);
  const rehydrated = useRehydrated();
  const { sidebarSeed, sidebarScope } = useLayoutContext();

  const seedTeams = sidebarSeed?.teams ?? [];
  const seedLeagues = sidebarSeed?.leagues ?? [];
  const [data, setData] = useState<{ teams: SidebarTeam[]; leagues: SidebarLeague[] } | null>(null);

  const scopeKey = sidebarScope ? JSON.stringify(sidebarScope) : '';

  useEffect(() => {
    // Unscoped English pages are fully served by the SSR seed.
    if (!rehydrated || (!scopeKey && lng === 'en')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setData(null);
      return;
    }
    let stale = false;
    const fetchData = async () => {
      try {
        const scope = scopeKey ? JSON.parse(scopeKey) : {};
        const response = await api.sidebar.get(scope, lng) as SidebarResponse;
        if (stale) return;
        setData({
          teams: Array.isArray(response?.teams) ? response.teams : [],
          leagues: Array.isArray(response?.leagues) ? response.leagues : [],
        });
      } catch {
        // The context-aware endpoint may not be deployed yet (or is down).
        // Fall back to the legacy global top lists so at least the language
        // is right — the English seed must never be shown to Arabic users.
        try {
          const [teamsData, leaguesData] = await Promise.all([
            api.teams.getTopTeams(lng) as Promise<SidebarTeam[]>,
            api.leagues.getTopLeagues(lng) as Promise<{ leagues?: SidebarLeague[] }>,
          ]);
          if (stale) return;
          setData({
            teams: Array.isArray(teamsData) ? teamsData : [],
            leagues: Array.isArray(leaguesData?.leagues) ? leaguesData.leagues : [],
          });
        } catch {
          // Keep whatever is currently shown (seed or previous scope's data).
        }
      }
    };
    fetchData();
    return () => { stale = true; };
  }, [scopeKey, lng, rehydrated]);

  return {
    teams: (data?.teams ?? seedTeams).slice(0, limit),
    leagues: (data?.leagues ?? seedLeagues).slice(0, limit),
  };
}
