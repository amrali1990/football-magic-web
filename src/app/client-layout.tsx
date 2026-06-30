'use client';

import { useAppSelector } from '@/store/hooks';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { LeaguesRightSidebar } from '@/components/layout/LeaguesRightSidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { GlobalLoadingOverlay } from '@/components/ui/LoadingSpinner';
import { LayoutProvider, useLayoutContext } from '@/lib/layout-context';

function MainLayout({ children }: { children: React.ReactNode }) {
  const { direction } = useAppSelector((state) => state.language.language);
  const { rightSidebar } = useLayoutContext();

  return (
    <div dir={direction === 'RTL' ? 'rtl' : 'ltr'} className="min-h-screen">
      <Navbar />

      <div className="mx-auto flex max-w-[1280px]">
        <aside className="hidden md:flex md:w-[72px] xl:w-[275px] shrink-0">
          <Sidebar />
        </aside>

        <main className="min-w-0 flex-1 border-x border-gray-200 pb-20 md:pb-4">
          {children}
        </main>

        <aside className="hidden lg:block lg:w-[350px] shrink-0">
          {rightSidebar ?? <LeaguesRightSidebar />}
        </aside>
      </div>

      <BottomNav />
      <GlobalLoadingOverlay />
    </div>
  );
}

export function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <LayoutProvider>
      <MainLayout>{children}</MainLayout>
    </LayoutProvider>
  );
}
