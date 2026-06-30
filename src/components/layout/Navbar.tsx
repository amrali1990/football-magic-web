'use client';

import Link from 'next/link';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setLanguage } from '@/store/slices/languageSlice';
import { useTranslation } from '@/i18n';
import { Globe, User } from 'lucide-react';

export function Navbar() {
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

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-gray-200 bg-white/85 px-4 backdrop-blur-md md:hidden">
      <Link href="/profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
        <User className="h-4 w-4 text-gray-600" />
      </Link>

      <Link href="/" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-sm font-bold text-white">
          FM
        </div>
      </Link>

      <button
        onClick={toggleLanguage}
        className="flex h-8 w-8 items-center justify-center rounded-full transition-colors hover:bg-gray-100"
      >
        <Globe className="h-4 w-4 text-gray-600" />
      </button>
    </header>
  );
}
