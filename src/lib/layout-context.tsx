'use client';

import { createContext, useContext, useState, useLayoutEffect, ReactNode, useCallback } from 'react';

export interface SidebarTeam {
  id: number;
  name: string;
  logo: string;
  country?: string | null;
  countryCode?: string | null;
}

export interface SidebarLeague {
  id: number;
  name: string;
  logo: string;
  country?: string | null;
  flag?: string | null;
}

/** Top teams/leagues fetched server-side (English) so the sidebars render
 *  into the initial HTML instead of appearing only after a client fetch. */
export interface SidebarSeedData {
  teams: SidebarTeam[];
  leagues: SidebarLeague[];
}

/**
 * Page context for the right sidebar: which slice of "top leagues/teams" the
 * current page wants (a date on the home page, a country on country pages,
 * the entity's scope on league/team/match/player pages). Null means the
 * global top lists.
 */
export interface SidebarScopeParams {
  date?: string;
  countryCode?: string;
  leagueId?: number;
  teamId?: number;
}

interface LayoutContextType {
  rightSidebar: ReactNode | null;
  setRightSidebar: (node: ReactNode | null) => void;
  sidebarSeed: SidebarSeedData | null;
  sidebarScope: SidebarScopeParams | null;
  setSidebarScope: (scope: SidebarScopeParams | null) => void;
}

const LayoutContext = createContext<LayoutContextType>({
  rightSidebar: null,
  setRightSidebar: () => {},
  sidebarSeed: null,
  sidebarScope: null,
  setSidebarScope: () => {},
});

export function LayoutProvider({ children, sidebarSeed = null }: { children: ReactNode; sidebarSeed?: SidebarSeedData | null }) {
  const [rightSidebar, setRightSidebarState] = useState<ReactNode | null>(null);
  const [sidebarScope, setSidebarScope] = useState<SidebarScopeParams | null>(null);
  const setRightSidebar = useCallback((node: ReactNode | null) => {
    setRightSidebarState(node);
  }, []);

  return (
    <LayoutContext.Provider value={{ rightSidebar, setRightSidebar, sidebarSeed, sidebarScope, setSidebarScope }}>
      {children}
    </LayoutContext.Provider>
  );
}

/**
 * Rendered by a page to scope the right sidebar to its content
 * (e.g. <SidebarScope params={{ teamId: 541 }} />). Cleared on unmount so
 * navigating away falls back to the global lists.
 */
export function SidebarScope({ params }: { params: SidebarScopeParams }) {
  const { setSidebarScope } = useContext(LayoutContext);
  const key = JSON.stringify(params);
  useLayoutEffect(() => {
    setSidebarScope(JSON.parse(key));
    return () => setSidebarScope(null);
  }, [key, setSidebarScope]);
  return null;
}

export function useRightSidebar(factory: () => ReactNode) {
  const { setRightSidebar } = useContext(LayoutContext);
  useLayoutEffect(() => {
    setRightSidebar(factory());
    return () => setRightSidebar(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setRightSidebar]);
}

export function useLayoutContext() {
  return useContext(LayoutContext);
}
