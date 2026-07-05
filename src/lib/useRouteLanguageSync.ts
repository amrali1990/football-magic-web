'use client';

import { useEffect } from 'react';
import { useAppDispatch, useRehydrated } from '@/store/hooks';
import { setLanguage } from '@/store/slices/languageSlice';

/**
 * Aligns the app language with the route's locale. Arabic URLs (/ar/...) win
 * over the persisted preference — a visitor landing on an Arabic page (e.g.
 * from Google) gets the Arabic UI; unprefixed (English-canonical) URLs leave
 * the persisted preference untouched. Runs after redux-persist rehydrates so
 * the persisted value cannot overwrite the route's language afterwards.
 */
export function useRouteLanguageSync(routeLng: string) {
  const dispatch = useAppDispatch();
  const rehydrated = useRehydrated();

  useEffect(() => {
    if (rehydrated && routeLng === 'ar') {
      dispatch(setLanguage({ name: 'العربية', code: 'ar', direction: 'RTL' }));
    }
  }, [rehydrated, routeLng, dispatch]);
}
