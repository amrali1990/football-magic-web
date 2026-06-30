'use client';

import { useSearchParams, useRouter, usePathname } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  // Derive the active tab from the URL so back/forward navigation restores it.
  const fromUrl = searchParams.get(paramKey);
  const activeTab =
    fromUrl && tabs.some((tab) => tab.key === fromUrl)
      ? fromUrl
      : defaultTab || tabs[0]?.key;

  const selectTab = (key: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(paramKey, key);
    // replace (not push) so switching tabs doesn't spam browser history,
    // while still keeping the chosen tab in the current history entry's URL.
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
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
                activeTab === tab.key
                  ? 'border-b-2 border-orange-500 text-orange-500'
                  : 'text-gray-500 hover:text-gray-700'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
      <div key={activeTab} className="pt-4">
        {tabs.find((tab) => tab.key === activeTab)?.content}
      </div>
    </div>
  );
}
