'use client';

import { createContext, useContext, useState, useLayoutEffect, ReactNode, useCallback } from 'react';

interface LayoutContextType {
  rightSidebar: ReactNode | null;
  setRightSidebar: (node: ReactNode | null) => void;
}

const LayoutContext = createContext<LayoutContextType>({
  rightSidebar: null,
  setRightSidebar: () => {},
});

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [rightSidebar, setRightSidebarState] = useState<ReactNode | null>(null);
  const setRightSidebar = useCallback((node: ReactNode | null) => {
    setRightSidebarState(node);
  }, []);

  return (
    <LayoutContext.Provider value={{ rightSidebar, setRightSidebar }}>
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
