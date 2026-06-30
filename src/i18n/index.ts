import en from './en.json';
import ar from './ar.json';

const translations: Record<string, Record<string, string>> = { en, ar };

export function t(key: string, lng: string = 'en'): string {
  return translations[lng]?.[key] || translations['en']?.[key] || key;
}

export function useTranslation(lng: string) {
  return {
    t: (key: string) => t(key, lng),
    lng,
    isRTL: lng === 'ar',
    dir: lng === 'ar' ? 'rtl' as const : 'ltr' as const,
  };
}
