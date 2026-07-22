'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface Tab {
  key: string;
  label: string;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: Tab[];
  defaultTab?: string;
  /** Query-string key used to persist the active tab in the URL. */
  paramKey?: string;
}

export function Tabs({ tabs, defaultTab, paramKey = 'tab' }: TabsProps) {
  // The active tab lives in local state (server renders the default tab into
  // the static HTML); the URL is read on mount and mirrored with
  // history.replaceState. Reading it via useSearchParams() would force a
  // client-side-rendering bailout that blanks the whole page for crawlers.
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.key);

  useEffect(() => {
    const applyFromUrl = () => {
      const fromUrl = new URLSearchParams(window.location.search).get(paramKey);
      setActiveTab((current) =>
        fromUrl && fromUrl !== current && tabs.some((tab) => tab.key === fromUrl) ? fromUrl : current
      );
    };
    applyFromUrl();
    // Restore the tab on browser back/forward (the address bar may carry a
    // different ?tab= from a prior history entry).
    window.addEventListener('popstate', applyFromUrl);
    return () => window.removeEventListener('popstate', applyFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramKey]);

  // The available tabs can change at runtime (e.g. selecting a league season
  // without standings hides the Table tab). If the active tab is no longer
  // present, fall back to the first tab so the content area never goes blank.
  const effectiveTab = tabs.some((tab) => tab.key === activeTab) ? activeTab : tabs[0]?.key;

  const selectTab = (key: string) => {
    setActiveTab(key);
    // replace (not push) so switching tabs doesn't spam browser history,
    // while still keeping the chosen tab in the current history entry's URL.
    const params = new URLSearchParams(window.location.search);
    params.set(paramKey, key);
    window.history.replaceState(window.history.state, '', `${window.location.pathname}?${params.toString()}`);
  };

  return (
    <div>
      <div className="border-b border-gray-200">
        <div className="flex overflow-x-auto scrollbar-hide">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => selectTab(tab.key)}
              className={cn(
                'whitespace-nowrap px-4 py-3 text-sm font-medium transition-colors',
                effectiveTab === tab.key
                  ? 'border-b-2 border-orange-500 text-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div key={effectiveTab} className="pt-4">
        {tabs.find((tab) => tab.key === effectiveTab)?.content}
      </div>
    </div>
  );
}
