'use client';

import { createContext, useContext, useState, useLayoutEffect, ReactNode, useCallback } from 'react';

export interface SidebarTeam {
  id: number;
  name: string;
  logo: string;
  country: string;
  countryCode: string;
}

export interface SidebarLeague {
  id: number;
  name: string;
  logo: string;
  country: string;
  flag: string;
}

/** Top teams/leagues fetched server-side (English) so the sidebars render
 *  into the initial HTML instead of appearing only after a client fetch. */
export interface SidebarSeedData {
  teams: SidebarTeam[];
  leagues: SidebarLeague[];
}

interface LayoutContextType {
  rightSidebar: ReactNode | null;
  setRightSidebar: (node: ReactNode | null) => void;
  sidebarSeed: SidebarSeedData | null;
}

const LayoutContext = createContext<LayoutContextType>({
  rightSidebar: null,
  setRightSidebar: () => {},
  sidebarSeed: null,
});

export function LayoutProvider({ children, sidebarSeed = null }: { children: ReactNode; sidebarSeed?: SidebarSeedData | null }) {
  const [rightSidebar, setRightSidebarState] = useState<ReactNode | null>(null);
  const setRightSidebar = useCallback((node: ReactNode | null) => {
    setRightSidebarState(node);
  }, []);

  return (
    <LayoutContext.Provider value={{ rightSidebar, setRightSidebar, sidebarSeed }}>
      {children}
    </LayoutContext.Provider>
  );
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
