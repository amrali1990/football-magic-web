'use client';

import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setLanguage } from '@/store/slices/languageSlice';
import { useTranslation } from '@/i18n';
import { api } from '@/lib/api';
import { Globe, Bell, User } from 'lucide-react';
import Link from 'next/link';
import { PageHeader } from '@/components/layout/PageHeader';

const LANGUAGES = [
  { name: 'English', code: 'en', direction: 'LTR' as const },
  { name: 'العربية', code: 'ar', direction: 'RTL' as const },
];

export default function SettingsPage() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((state) => state.Authentication.user);
  const { code: currentLng } = useAppSelector((state) => state.language.language);
  const { t } = useTranslation(currentLng);

  const handleLanguageChange = async (lang: typeof LANGUAGES[number]) => {
    dispatch(setLanguage(lang));
    if (user) {
      try {
        await api.favorites.updateLanguage(lang.code, user.accessToken);
      } catch { /* ignore */ }
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader>
        <div className="px-4 pt-3 pb-3">
          <h1 className="text-xl font-bold text-gray-900">{t('Settings')}</h1>
        </div>
      </PageHeader>

      <div>
        <Link
          href="/profile"
          className="flex items-center gap-3 border-b border-gray-200 px-4 py-3.5 transition-colors hover:bg-gray-50"
        >
          <User className="h-5 w-5 text-gray-400" />
          <span className="text-[15px] font-medium text-gray-900">{t('Profile')}</span>
        </Link>

        <Link
          href="/notifications"
          className="flex items-center gap-3 border-b border-gray-200 px-4 py-3.5 transition-colors hover:bg-gray-50"
        >
          <Bell className="h-5 w-5 text-gray-400" />
          <span className="text-[15px] font-medium text-gray-900">{t('Notifications')}</span>
        </Link>
      </div>

      <div className="mx-4 mt-2 rounded-xl border border-gray-200 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Globe className="h-5 w-5 text-gray-400" />
          <h2 className="text-sm font-semibold text-gray-700">{t('Language')}</h2>
        </div>

        <div className="space-y-2">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang)}
              className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm transition-colors ${
                currentLng === lang.code
                  ? 'bg-orange-50 text-orange-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="font-medium">{lang.name}</span>
              {currentLng === lang.code && (
                <span className="h-2 w-2 rounded-full bg-orange-500" />
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
