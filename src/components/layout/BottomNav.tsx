'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAppSelector } from '@/store/hooks';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { Calendar, Trophy, Star, Menu } from 'lucide-react';
import { SHOW_USER_FEATURES } from '@/lib/featureFlags';

export function BottomNav() {
  const pathname = usePathname();
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);

  const tabs = [
    { href: '/', icon: Calendar, label: t('Matches') },
    { href: '/leagues', icon: Trophy, label: t('Leagues') },
    // Account-related tabs are temporarily hidden via SHOW_USER_FEATURES.
    ...(SHOW_USER_FEATURES
      ? [
          { href: '/favorites', icon: Star, label: t('Favorits_Teams').split(' ')[0] || 'Favorites' },
          { href: '/settings', icon: Menu, label: t('Settings') },
        ]
      : []),
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white md:hidden">
      <div className="flex h-16 items-center justify-around">
        {tabs.map((tab) => {
          const isActive = tab.href === '/' ? pathname === '/' : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1',
                isActive ? 'text-orange-500' : 'text-gray-400'
              )}
            >
              <tab.icon className="h-5 w-5" />
              <span className="text-xs">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
