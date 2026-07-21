// Shared building blocks for the sitemap-index architecture.
//
// One <sitemapindex> lives at /sitemap.xml (app/sitemap.xml/route.ts) and points
// at per-category child sitemaps served by their own route handlers:
//   /leagues.xml, /countries.xml            (single file each — small categories)
//   /teams/{n}.xml, /players/{n}.xml, /matches/{n}.xml   (paginated)
//
// SCALE: the backend holds ~27k teams, ~440k players and ~1.5M fixtures, so the
// high-volume categories are paginated one-backend-page-per-file. FE sitemap
// page N maps 1:1 to backend page N (size = ENTITIES_PER_FILE), which keeps each
// file well under the 50,000-url / 50 MB sitemap limits (ENTITIES_PER_FILE
// entities × 2 bilingual urls). The index computes the page count from the
// endpoint's totalElements via a cheap size=1 probe — it never loads all rows.
//
// DATA SOURCE + FALLBACK: each collector uses the backend slim sitemap endpoint
// (getXSitemapPage in server-api — {id|code, localized name, updatedAt} with real
// <lastmod>). If the endpoint is unavailable (not deployed, or a transient
// failure) the getter returns null and the collector falls back to the legacy
// full-data getters, so behaviour degrades gracefully instead of emptying the
// sitemap. All URL construction goes through the canonical helpers in ./seo.

import {
  absoluteUrl,
  leaguePath,
  teamPath,
  playerPath,
  matchPath,
  languageAlternates,
  type Locale,
} from './seo';
import {
  getAllLeagues,
  getTopTeams,
  getTeamSquad,
  getMatchesByDate,
  getTeamsSitemapPage,
  getPlayersSitemapPage,
  getLeaguesSitemapPage,
  getCountriesSitemapPage,
  getFixturesSitemapPage,
  type SitemapSlimRow,
  type CountrySlimRow,
  type FixtureSlimRow,
  type SitemapSlimPage,
} from './server-api';

/** Sitemaps protocol hard limit: 50,000 urls per file (also 50 MB). */
export const PAGE_SIZE = 50000;

/**
 * Entities per paginated sitemap file. Bilingual categories emit 2 urls per
 * entity, so this stays at 10,000 → ~20,000 urls/file, comfortably under both
 * the 50k-url and 50 MB limits even with long percent-encoded Arabic slugs and
 * hreflang alternates. Also the page size requested from the backend per file.
 */
export const ENTITIES_PER_FILE = 10000;

/** Single-file categories (leagues, countries) fetch everything in one request. */
const SINGLE_FILE_SIZE = 50000;

export const XML_CONTENT_TYPE = 'application/xml; charset=utf-8';

export type ChangeFreq =
  | 'always'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'yearly'
  | 'never';

/** hreflang alternate link emitted as an <xhtml:link> inside a <url>. */
export interface Alternate {
  hreflang: string;
  href: string;
}

export interface UrlEntry {
  loc: string;
  lastmod?: string; // ISO 8601
  changefreq?: ChangeFreq;
  priority?: number;
  alternates?: Alternate[];
}

export interface IndexEntry {
  loc: string;
  lastmod?: string;
}

const XML_ESCAPES: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&apos;',
};

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => XML_ESCAPES[c]);
}

function renderUrl(entry: UrlEntry): string {
  const parts = [`<loc>${escapeXml(entry.loc)}</loc>`];
  for (const alt of entry.alternates ?? []) {
    parts.push(
      `<xhtml:link rel="alternate" hreflang="${escapeXml(alt.hreflang)}" href="${escapeXml(alt.href)}"/>`
    );
  }
  if (entry.lastmod) parts.push(`<lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
  if (entry.changefreq) parts.push(`<changefreq>${entry.changefreq}</changefreq>`);
  if (entry.priority !== undefined) parts.push(`<priority>${entry.priority.toFixed(1)}</priority>`);
  return `<url>${parts.join('')}</url>`;
}

/** Serialize a <urlset> (a child sitemap). Deduplicates by <loc>. */
export function renderUrlset(entries: UrlEntry[]): string {
  const seen = new Set<string>();
  const body = entries
    .filter((e) => !seen.has(e.loc) && seen.add(e.loc))
    .map(renderUrl)
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:xhtml="http://www.w3.org/1999/xhtml">' +
    body +
    '</urlset>'
  );
}

/** Serialize the <sitemapindex>. */
export function renderSitemapIndex(entries: IndexEntry[]): string {
  const body = entries
    .map((e) => {
      const lastmod = e.lastmod ? `<lastmod>${escapeXml(e.lastmod)}</lastmod>` : '';
      return `<sitemap><loc>${escapeXml(e.loc)}</loc>${lastmod}</sitemap>`;
    })
    .join('');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    body +
    '</sitemapindex>'
  );
}

/** Wrap XML in a Response with the correct content type. Always HTTP 200. */
export function xmlResponse(body: string): Response {
  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': XML_CONTENT_TYPE },
  });
}

// --- category tuning (changefreq / priority) -------------------------------

const TUNING = {
  home: { changefreq: 'hourly' as ChangeFreq, priority: 1.0 },
  leaguesIndex: { changefreq: 'weekly' as ChangeFreq, priority: 0.8 },
  league: { changefreq: 'daily' as ChangeFreq, priority: 0.8 },
  team: { changefreq: 'daily' as ChangeFreq, priority: 0.7 },
  player: { changefreq: 'weekly' as ChangeFreq, priority: 0.5 },
  match: { changefreq: 'hourly' as ChangeFreq, priority: 0.6 },
  country: { changefreq: 'weekly' as ChangeFreq, priority: 0.6 },
};

type Tune = { changefreq: ChangeFreq; priority: number };

/** Build the paired English + Arabic <url> entries for a bilingual page. */
function bilingual(enPath: string, arPath: string, tune: Tune, lastmod: string): UrlEntry[] {
  const langs = languageAlternates(enPath, arPath);
  const alternates: Alternate[] = Object.entries(langs).map(([hreflang, href]) => ({ hreflang, href }));
  return [
    { loc: absoluteUrl(enPath), lastmod, ...tune, alternates },
    { loc: absoluteUrl(arPath), lastmod, ...tune, alternates },
  ];
}

/** Home + the /leagues listing — the two browse roots, listed in leagues.xml. */
function browseRoots(nowIso: string): UrlEntry[] {
  return [
    ...bilingual('/', '/ar', TUNING.home, nowIso),
    ...bilingual('/leagues', '/ar/leagues', TUNING.leaguesIndex, nowIso),
  ];
}

// --- slim-endpoint plumbing -------------------------------------------------

type SlimPager<T> = (page: number, size: number) => Promise<SitemapSlimPage<T> | null>;

/** Total row count from a slim endpoint via a cheap size=1 probe; null if down. */
async function slimTotal<T>(pager: SlimPager<T>): Promise<number | null> {
  const r = await pager(0, 1);
  return r ? r.totalElements : null;
}

/** ceil(total / ENTITIES_PER_FILE), always ≥ 1 so page 0 always exists. */
function filePages(total: number): number {
  return Math.max(1, Math.ceil(total / ENTITIES_PER_FILE));
}

type PathBuilder = (id: number, name: string | undefined, locale: Locale) => string;

/** Zip English + Arabic slim rows by id into bilingual <url> entries. */
function bilingualFromSlim(
  enRows: SitemapSlimRow[],
  arRows: SitemapSlimRow[],
  pathFor: PathBuilder,
  tune: Tune
): UrlEntry[] {
  const nowIso = new Date().toISOString();
  const arName = new Map(arRows.map((r) => [r.id, r.name]));
  const arUpdated = new Map(arRows.map((r) => [r.id, r.updatedAt]));
  const out: UrlEntry[] = [];
  const seen = new Set<number>();
  for (const r of enRows) {
    if (!r.id || !r.name || seen.has(r.id)) continue;
    seen.add(r.id);
    const lastmod = r.updatedAt || arUpdated.get(r.id) || nowIso;
    out.push(
      ...bilingual(
        pathFor(r.id, r.name, 'en'),
        pathFor(r.id, arName.get(r.id) ?? r.name, 'ar'),
        tune,
        lastmod
      )
    );
  }
  return out;
}

// --- TEAMS (paginated) ------------------------------------------------------

const teamsPager: SlimPager<SitemapSlimRow> = (p, s) => getTeamsSitemapPage(p, s, 'en');

/** Number of /teams/{n}.xml files. */
export async function teamPageCount(): Promise<number> {
  const total = await slimTotal(teamsPager);
  if (total != null) return filePages(total);
  return Math.max(1, Math.ceil((await collectTeamEntriesLegacy()).length / PAGE_SIZE));
}

/** One page of team urls (bilingual). */
export async function collectTeamEntriesPage(page: number): Promise<UrlEntry[]> {
  const [en, ar] = await Promise.all([
    getTeamsSitemapPage(page, ENTITIES_PER_FILE, 'en'),
    getTeamsSitemapPage(page, ENTITIES_PER_FILE, 'ar'),
  ]);
  if (en == null || ar == null) return pageSlice(await collectTeamEntriesLegacy(), page);
  return bilingualFromSlim(en.list, ar.list, teamPath, TUNING.team);
}

async function collectTeamEntriesLegacy(): Promise<UrlEntry[]> {
  const nowIso = new Date().toISOString();
  const [teamsEn, teamsAr] = await Promise.all([getTopTeams('en'), getTopTeams('ar')]);
  const arNames = new Map<number, string>(teamsAr.map((t) => [t.id, t.name]));
  const entries: UrlEntry[] = [];
  for (const team of teamsEn) {
    entries.push(
      ...bilingual(
        teamPath(team.id, team.name, 'en'),
        teamPath(team.id, arNames.get(team.id) ?? team.name, 'ar'),
        TUNING.team,
        nowIso
      )
    );
  }
  return entries;
}

// --- PLAYERS (paginated) ----------------------------------------------------

const playersPager: SlimPager<SitemapSlimRow> = (p, s) => getPlayersSitemapPage(p, s, 'en');

export async function playerPageCount(): Promise<number> {
  const total = await slimTotal(playersPager);
  if (total != null) return filePages(total);
  return Math.max(1, Math.ceil((await collectPlayerEntriesLegacy()).length / PAGE_SIZE));
}

export async function collectPlayerEntriesPage(page: number): Promise<UrlEntry[]> {
  const [en, ar] = await Promise.all([
    getPlayersSitemapPage(page, ENTITIES_PER_FILE, 'en'),
    getPlayersSitemapPage(page, ENTITIES_PER_FILE, 'ar'),
  ]);
  if (en == null || ar == null) return pageSlice(await collectPlayerEntriesLegacy(), page);
  return bilingualFromSlim(en.list, ar.list, playerPath, TUNING.player);
}

async function collectPlayerEntriesLegacy(): Promise<UrlEntry[]> {
  const nowIso = new Date().toISOString();
  const teamsEn = await getTopTeams('en');
  const squadTeamIds = teamsEn.slice(0, 25).map((t) => t.id);
  const [squadsEn, squadsAr] = await Promise.all([
    Promise.all(squadTeamIds.map((id) => getTeamSquad(id, 'en'))),
    Promise.all(squadTeamIds.map((id) => getTeamSquad(id, 'ar'))),
  ]);
  const arNames = new Map<number, string>(squadsAr.flat().map((p) => [p.id, p.name]));
  const entries: UrlEntry[] = [];
  const seen = new Set<number>();
  for (const player of squadsEn.flat()) {
    if (!player?.id || !player.name || seen.has(player.id)) continue;
    seen.add(player.id);
    entries.push(
      ...bilingual(
        playerPath(player.id, player.name, 'en'),
        playerPath(player.id, arNames.get(player.id) ?? player.name, 'ar'),
        TUNING.player,
        nowIso
      )
    );
  }
  return entries;
}

// --- MATCHES (paginated) ----------------------------------------------------

const fixturesPager: SlimPager<FixtureSlimRow> = (p, s) => getFixturesSitemapPage(p, s, 'en');

export async function matchPageCount(): Promise<number> {
  const total = await slimTotal(fixturesPager);
  if (total != null) return filePages(total);
  return Math.max(1, Math.ceil((await collectMatchEntriesLegacy()).length / PAGE_SIZE));
}

export async function collectMatchEntriesPage(page: number): Promise<UrlEntry[]> {
  const [en, ar] = await Promise.all([
    getFixturesSitemapPage(page, ENTITIES_PER_FILE, 'en'),
    getFixturesSitemapPage(page, ENTITIES_PER_FILE, 'ar'),
  ]);
  if (en == null || ar == null) return pageSlice(await collectMatchEntriesLegacy(), page);
  return fixtureBilingual(en.list, ar.list);
}

function fixtureBilingual(enRows: FixtureSlimRow[], arRows: FixtureSlimRow[]): UrlEntry[] {
  const nowIso = new Date().toISOString();
  const arMap = new Map<number, FixtureSlimRow>(arRows.map((r) => [r.id, r]));
  const entries: UrlEntry[] = [];
  const seen = new Set<number>();
  for (const r of enRows) {
    if (!r.id || seen.has(r.id)) continue;
    seen.add(r.id);
    const arRow = arMap.get(r.id);
    entries.push(
      ...bilingual(
        matchPath(r.id, r.homeName ?? undefined, r.awayName ?? undefined, 'en'),
        matchPath(
          r.id,
          arRow?.homeName ?? r.homeName ?? undefined,
          arRow?.awayName ?? r.awayName ?? undefined,
          'ar'
        ),
        TUNING.match,
        r.updatedAt || arRow?.updatedAt || nowIso
      )
    );
  }
  return entries;
}

/** Days from `back` before today through `forward` after, as YYYY-MM-DD (UTC). */
function matchWindowDates(back = 1, forward = 7): string[] {
  const dates: string[] = [];
  for (let offset = -back; offset <= forward; offset++) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() + offset);
    dates.push(d.toISOString().slice(0, 10));
  }
  return dates;
}

async function collectMatchEntriesLegacy(): Promise<UrlEntry[]> {
  const nowIso = new Date().toISOString();
  const dates = matchWindowDates();
  const [daysEn, daysAr] = await Promise.all([
    Promise.all(dates.map((date) => getMatchesByDate(date, 0, 'en'))),
    Promise.all(dates.map((date) => getMatchesByDate(date, 0, 'ar'))),
  ]);
  const arNames = new Map<number, { home?: string; away?: string }>();
  for (const day of daysAr) {
    for (const league of day.list) {
      for (const fixture of league.fixtures ?? []) {
        arNames.set(fixture.id, { home: fixture.teams?.home?.name, away: fixture.teams?.away?.name });
      }
    }
  }
  const entries: UrlEntry[] = [];
  const seen = new Set<number>();
  for (const day of daysEn) {
    for (const league of day.list) {
      for (const fixture of league.fixtures ?? []) {
        if (seen.has(fixture.id)) continue;
        seen.add(fixture.id);
        const ar = arNames.get(fixture.id);
        entries.push(
          ...bilingual(
            matchPath(fixture.id, fixture.teams?.home?.name, fixture.teams?.away?.name, 'en'),
            matchPath(fixture.id, ar?.home ?? fixture.teams?.home?.name, ar?.away ?? fixture.teams?.away?.name, 'ar'),
            TUNING.match,
            nowIso
          )
        );
      }
    }
  }
  return entries;
}

// --- LEAGUES (single file) --------------------------------------------------

/** Leagues + the two browse roots (home and the /leagues listing). */
export async function collectLeagueEntries(): Promise<UrlEntry[]> {
  const nowIso = new Date().toISOString();
  const [en, ar] = await Promise.all([
    getLeaguesSitemapPage(0, SINGLE_FILE_SIZE, 'en'),
    getLeaguesSitemapPage(0, SINGLE_FILE_SIZE, 'ar'),
  ]);
  if (en == null || ar == null) return collectLeagueEntriesLegacy();
  return [...browseRoots(nowIso), ...bilingualFromSlim(en.list, ar.list, leaguePath, TUNING.league)];
}

async function collectLeagueEntriesLegacy(): Promise<UrlEntry[]> {
  const nowIso = new Date().toISOString();
  const [leaguesEn, leaguesAr] = await Promise.all([getAllLeagues('en'), getAllLeagues('ar')]);
  const arNames = new Map<number, string>();
  for (const group of leaguesAr) {
    for (const league of group.leagues ?? []) arNames.set(league.id, league.name);
  }
  const entries: UrlEntry[] = browseRoots(nowIso);
  for (const group of leaguesEn) {
    for (const league of group.leagues ?? []) {
      entries.push(
        ...bilingual(
          leaguePath(league.id, league.name, 'en'),
          leaguePath(league.id, arNames.get(league.id) ?? league.name, 'ar'),
          TUNING.league,
          nowIso
        )
      );
    }
  }
  return entries;
}

// --- COUNTRIES (single file, English-only) ----------------------------------

/**
 * /country/{code} pages. English-only: there is no /ar/country route. Slim
 * endpoint returns every country hosting a league with real lastmod; the legacy
 * fallback derives codes from the league groups.
 */
export async function collectCountryEntries(): Promise<UrlEntry[]> {
  const page = await getCountriesSitemapPage(0, SINGLE_FILE_SIZE, 'en');
  if (page == null) return collectCountryEntriesLegacy();
  const nowIso = new Date().toISOString();
  const entries: UrlEntry[] = [];
  const seen = new Set<string>();
  for (const r of page.list) {
    const code = r.code?.trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    entries.push({
      loc: absoluteUrl(`/country/${encodeURIComponent(code)}`),
      lastmod: r.updatedAt || nowIso,
      ...TUNING.country,
    });
  }
  return entries;
}

async function collectCountryEntriesLegacy(): Promise<UrlEntry[]> {
  const nowIso = new Date().toISOString();
  const groups = await getAllLeagues('en');
  const entries: UrlEntry[] = [];
  const seen = new Set<string>();
  for (const group of groups) {
    const code = group.code?.trim();
    if (!code || seen.has(code)) continue;
    seen.add(code);
    entries.push({
      loc: absoluteUrl(`/country/${encodeURIComponent(code)}`),
      lastmod: nowIso,
      ...TUNING.country,
    });
  }
  return entries;
}

// --- pagination helpers (used by the legacy fallback slicing) ---------------

/** The slice of entries belonging to a given zero-based page (PAGE_SIZE urls). */
export function pageSlice(entries: UrlEntry[], page: number): UrlEntry[] {
  const start = page * PAGE_SIZE;
  return entries.slice(start, start + PAGE_SIZE);
}
