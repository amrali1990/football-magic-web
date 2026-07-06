'use client';

import { Megaphone } from 'lucide-react';
import { useTranslation } from '@/i18n';

export const APP_STORE_URL = 'https://apps.apple.com/sa/app/football-magic-live-scores/id6495483675';
export const GOOGLE_PLAY_URL = 'https://play.google.com/store/apps/details?id=com.magic.football';

/** Mobile-app promo card shared by the right sidebars. */
export function AppPromo({ lng }: { lng: string }) {
  const { t } = useTranslation(lng);
  return (
    <div className="overflow-hidden rounded-2xl ring-1 ring-gray-200/80 bg-gradient-to-br from-orange-50 via-white to-blue-50">
      <div className="px-5 py-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/10">
          <Megaphone className="h-5 w-5 text-orange-500" />
        </div>
        <h3 className="text-[14px] font-bold text-gray-900">{t('Get_the_App')}</h3>
        <p className="mt-1 text-[12px] text-gray-500 leading-relaxed">
          {t('Get_the_App_Desc')}
        </p>
        <div className="mt-4 flex justify-center gap-2">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-gray-900 px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-gray-700"
          >
            App Store
          </a>
          <a
            href={GOOGLE_PLAY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-gray-900 px-4 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-gray-700"
          >
            Google Play
          </a>
        </div>
      </div>
    </div>
  );
}
