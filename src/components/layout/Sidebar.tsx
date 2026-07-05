'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setLanguage } from '@/store/slices/languageSlice';
import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { Calendar, Trophy, Star, Settings, User, Globe } from 'lucide-react';
import { SHOW_USER_FEATURES } from '@/lib/featureFlags';

export function Sidebar() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.Authentication.user);
  const { code: lng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(lng);

  const toggleLanguage = () => {
    if (lng === 'en') {
      dispatch(setLanguage({ name: 'العربية', code: 'ar', direction: 'RTL' }));
    } else {
      dispatch(setLanguage({ name: 'English', code: 'en', direction: 'LTR' }));
    }
  };

  const navItems = [
    { href: '/', icon: Calendar, label: t('Matches') },
    { href: '/leagues', icon: Trophy, label: t('Leagues') },
    // Account-related entries are temporarily hidden; flip SHOW_USER_FEATURES
    // to bring back Favorites, Settings, and the Login/Profile link.
    ...(SHOW_USER_FEATURES
      ? [
          { href: '/favorites', icon: Star, label: t('Favorits_Teams').split(' ')[0] || 'Favorites' },
          { href: '/settings', icon: Settings, label: t('Settings') },
        ]
      : []),
  ];

  return (
    <nav className="sticky top-0 flex h-screen flex-col justify-between py-4 pr-3">
      <div className="space-y-1">
        <Link href="/" className="mb-6 flex items-center justify-center xl:justify-start rounded-full px-4 py-3">
          <div className="relative h-10 w-10 shrink-0">
            <Image src="/logo.png" alt="Football Magic" fill className="object-contain" unoptimized />
          </div>
        </Link>

        {navItems.map((item) => {
          const isActive = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-4 rounded-full px-4 py-3 text-xl transition-colors hover:bg-gray-100',
                isActive ? 'font-bold text-gray-900' : 'text-gray-700'
              )}
            >
              <item.icon className="h-6 w-6" strokeWidth={isActive ? 2.5 : 1.5} />
              <span className="hidden xl:inline">{item.label}</span>
            </Link>
          );
        })}

        <button
          onClick={toggleLanguage}
          className="flex w-full items-center gap-4 rounded-full px-4 py-3 text-xl text-gray-700 transition-colors hover:bg-gray-100"
        >
          <Globe className="h-6 w-6" strokeWidth={1.5} />
          <span className="hidden xl:inline">{lng === 'en' ? 'العربية' : 'English'}</span>
        </button>
      </div>

      {SHOW_USER_FEATURES && (
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-full px-4 py-3 transition-colors hover:bg-gray-100"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200">
            <User className="h-5 w-5 text-gray-600" />
          </div>
          <div className="hidden xl:block min-w-0">
            <p className="text-sm font-bold text-gray-900 truncate">
              {user ? user.username : t('Login')}
            </p>
            {user && (
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            )}
          </div>
        </Link>
      )}
    </nav>
  );
}
