import { format, addDays, subDays, isToday, parse, isValid } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { teamPath, playerPath, leaguePath, matchPath } from '@/lib/seo';

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function localizeNumber(value: number | string | null | undefined, lng: string): string {
  if (value === null || value === undefined) return '-';
  const str = String(value);
  if (lng !== 'ar') return str;
  return str.replace(/\d/g, (d) => AR_DIGITS[Number(d)]);
}

export function formatDate(date: Date, lng: string = 'en'): string {
  return format(date, 'yyyy-MM-dd');
}

/**
 * Parse a `yyyy-MM-dd` string (as produced by {@link formatDate}) back into a
 * local-time Date. Returns null for missing/invalid input so callers can fall
 * back to a default (e.g. today). Avoids `new Date(str)` which parses as UTC and
 * can shift the day across timezones.
 */
export function parseDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const parsed = parse(value, 'yyyy-MM-dd', new Date());
  return isValid(parsed) ? parsed : null;
}

export function formatDisplayDate(date: Date, lng: string = 'en'): string {
  const locale = lng === 'ar' ? ar : enUS;
  const formatted = format(date, 'EEE, d MMM yyyy', { locale });
  return lng === 'ar' ? formatted.replace(/\d/g, (d) => AR_DIGITS[Number(d)]) : formatted;
}

export function getDateRange(centerDate: Date, range: number = 7): Date[] {
  const dates: Date[] = [];
  for (let i = -range; i <= range; i++) {
    dates.push(i < 0 ? subDays(centerDate, Math.abs(i)) : addDays(centerDate, i));
  }
  return dates;
}

export function isTodayDate(date: Date): boolean {
  return isToday(date);
}

export function getMatchStatusColor(statusShort: string): string {
  const liveStatuses = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE', 'INT'];
  const finishedStatuses = ['FT', 'AET', 'PEN'];
  const cancelledStatuses = ['PST', 'CANC', 'ABD', 'AWD', 'WO'];

  if (liveStatuses.includes(statusShort)) return 'text-red-500';
  if (finishedStatuses.includes(statusShort)) return 'text-gray-500';
  if (cancelledStatuses.includes(statusShort)) return 'text-yellow-600';
  return 'text-gray-400';
}

export function formatMatchTime(date: string, lng: string = 'en'): string {
  const time = format(new Date(date), 'HH:mm');
  return localizeNumber(time, lng);
}

export function cn(...classes: (string | undefined | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

// Canonical slugged entity URLs. The logo argument is kept for call-site
// compatibility (it used to be passed as a query param for instant headers,
// which server rendering made unnecessary).
export function leagueHref(id: number, name?: string, _logo?: string): string {
  void _logo;
  return leaguePath(id, name);
}

export function teamHref(id: number, name?: string): string {
  return teamPath(id, name);
}

export function playerHref(id: number, name?: string): string {
  return playerPath(id, name);
}

export function matchHref(id: number, homeName?: string, awayName?: string): string {
  return matchPath(id, homeName, awayName);
}

/**
 * Pass a league's display name (already localized on the page the user clicked)
 * to the league page, so its header shows the name in the selected language
 * immediately instead of the English name from the server-rendered data.
 * sessionStorage is used because the slug-canonicalization redirect would strip
 * a query param; the entry is tagged with the language it was rendered in so a
 * stale entry never leaks into the other language.
 */
export function rememberLeagueName(id: number, name: string | undefined, lng: string): void {
  if (typeof window === 'undefined' || !name) return;
  try {
    sessionStorage.setItem(`league-name:${id}`, JSON.stringify({ name, lng }));
  } catch {
    // Storage unavailable (e.g. blocked) — the page falls back to fetched data.
  }
}

export function recallLeagueName(id: number, lng: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`league-name:${id}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { name?: string; lng?: string };
    return parsed.lng === lng && parsed.name ? parsed.name : null;
  } catch {
    return null;
  }
}
