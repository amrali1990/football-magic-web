import { format, addDays, subDays, isToday, parse, isValid } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';

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

export function leagueHref(id: number, name?: string, logo?: string): string {
  const params = new URLSearchParams();
  if (name) params.set('name', name);
  if (logo) params.set('logo', logo);
  const qs = params.toString();
  return `/league/${id}${qs ? `?${qs}` : ''}`;
}
