// Central SEO helpers: site constants, slug generation, and canonical entity URLs.
// All public entity links, canonical tags, and sitemap entries must be built from
// these helpers so the URL scheme stays consistent everywhere.
//
// Locales: English is the default and lives on unprefixed URLs (/team/...),
// Arabic mirrors live under /ar (/ar/team/...). hreflang alternates connect
// the two; x-default points at English.

import { normalizeSlug } from './slug';

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.football-magic.com').replace(/\/+$/, '');
export const SITE_NAME = 'Football Magic';

export type Locale = 'en' | 'ar';
export const LOCALES: Locale[] = ['en', 'ar'];
export const DEFAULT_LOCALE: Locale = 'en';

/** URL prefix for a locale: '' for English (default), '/ar' for Arabic. */
export function localePrefix(locale: Locale = DEFAULT_LOCALE): string {
  return locale === 'ar' ? '/ar' : '';
}

/**
 * Turn an entity name into a URL slug ("Real Madrid" -> "real-madrid",
 * "Bayern München" -> "bayern-munchen", "ريال مدريد" -> "ريال-مدريد").
 * Arabic letters are kept so Arabic pages carry Arabic keywords in the URL.
 * Returns '' when nothing usable remains, in which case the id-only URL is
 * treated as canonical.
 *
 * The intermediate NFD pass exists only to strip Latin diacritics; the final
 * normalizeSlug recomposes to NFC so Arabic hamza letters (أ إ ؤ ئ) leave here
 * precomposed — the byte form browsers and search engines use. Without it,
 * emitted URLs (%D8%A7%D9%94) and externally-typed URLs (%D8%A3) differ.
 */
export function slugify(name?: string | null): string {
  if (!name) return '';
  return normalizeSlug(
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9؀-ۿ]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/, '')
  );
}

function entityPath(base: string, id: number | string, slug: string, locale: Locale): string {
  const prefix = localePrefix(locale);
  // Percent-encode the slug: Arabic slugs must be encoded to be valid in HTTP
  // Location headers and hreflang URLs (latin slugs pass through unchanged).
  return slug ? `${prefix}/${base}/${id}/${encodeURIComponent(slug)}` : `${prefix}/${base}/${id}`;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Rebuild the requested path from route params in fully-decoded form
 * (Next.js may deliver catch-all segments still percent-encoded).
 */
export function requestedEntityPath(base: string, id: string, slug: string[] | undefined, locale: Locale): string {
  const prefix = localePrefix(locale);
  const slugPart = slug?.length ? `/${slug.map(safeDecode).join('/')}` : '';
  return `${prefix}/${base}/${id}${slugPart}`;
}

/**
 * Compare a decoded requested path against an entityPath()-produced canonical
 * (whose slug is percent-encoded) — both sides are compared in decoded form.
 * Deliberately a strict byte comparison: a request in a different Unicode
 * normal form (e.g. NFD from an old link) must NOT match, so the page 308s it
 * to the NFC canonical — the backup for requests the proxy's 301 didn't see.
 */
export function pathsMatch(requestedDecoded: string, canonicalEncoded: string): boolean {
  return requestedDecoded === safeDecode(canonicalEncoded);
}

export function teamPath(id: number | string, name?: string | null, locale: Locale = DEFAULT_LOCALE): string {
  return entityPath('team', id, slugify(name), locale);
}

export function playerPath(id: number | string, name?: string | null, locale: Locale = DEFAULT_LOCALE): string {
  return entityPath('player', id, slugify(name), locale);
}

export function leaguePath(id: number | string, name?: string | null, locale: Locale = DEFAULT_LOCALE): string {
  return entityPath('league', id, slugify(name), locale);
}

export function matchPath(id: number | string, homeName?: string | null, awayName?: string | null, locale: Locale = DEFAULT_LOCALE): string {
  const home = slugify(homeName);
  const away = slugify(awayName);
  const joiner = locale === 'ar' ? 'ضد' : 'vs';
  const slug = home && away ? `${home}-${joiner}-${away}` : home || away;
  return entityPath('match', id, slug, locale);
}

export function absoluteUrl(path: string): string {
  return `${SITE_URL}${path}`;
}

/**
 * hreflang alternates for a page available in both languages.
 * x-default points at the English version.
 */
export function languageAlternates(enPath: string, arPath: string): Record<string, string> {
  return {
    en: absoluteUrl(enPath),
    ar: absoluteUrl(arPath),
    'x-default': absoluteUrl(enPath),
  };
}

/** Clamp a meta description to ~160 chars without cutting words mid-way. */
export function metaDescription(text: string, max = 160): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/** 1 -> "1st", 2 -> "2nd", 11 -> "11th" — for standings positions in SEO copy. */
export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  const suffix = { 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] ?? 'th';
  return `${n}${suffix}`;
}

/** Format an ISO date for humans in server-rendered SEO copy (UTC). */
export function formatSeoDate(iso?: string | null, locale: Locale = DEFAULT_LOCALE): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
