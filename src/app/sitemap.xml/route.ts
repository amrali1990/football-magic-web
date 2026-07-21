// GET /sitemap.xml — the sitemap INDEX (a <sitemapindex>, never page urls).
//
// Lists every child sitemap. Small categories (leagues, countries) are single
// files; high-volume categories (teams, players, matches) list one entry per
// page file (/teams/0.xml, /players/0.xml, /matches/0.xml, …). The page count
// per category comes from the backend's totalElements via a cheap size=1 probe —
// the index never loads all rows. This route REPLACES the built-in
// app/sitemap.ts (deleted) so there is a single source of truth.
//
// Robustness: each page-count probe falls back to a single page on failure, and
// the whole handler falls back to a minimal-but-valid index — a 500 makes Search
// Console reject the sitemap, so we never emit one.

import { SITE_URL } from '@/lib/seo';
import {
  renderSitemapIndex,
  xmlResponse,
  teamPageCount,
  playerPageCount,
  matchPageCount,
  type IndexEntry,
} from '@/lib/sitemap';

// Refresh hourly so newly-added match/player pages enter the index promptly.
export const revalidate = 3600;

/** Resolve a category's page count, defaulting to 1 on any failure. */
async function pagesOr1(count: () => Promise<number>): Promise<number> {
  try {
    return await count();
  } catch {
    return 1;
  }
}

export async function GET(): Promise<Response> {
  const nowIso = new Date().toISOString();
  const child = (path: string): IndexEntry => ({ loc: `${SITE_URL}${path}`, lastmod: nowIso });
  const pages = (prefix: string, n: number): IndexEntry[] =>
    Array.from({ length: n }, (_, i) => child(`${prefix}/${i}.xml`));

  try {
    const [teamPages, playerPages, matchPages] = await Promise.all([
      pagesOr1(teamPageCount),
      pagesOr1(playerPageCount),
      pagesOr1(matchPageCount),
    ]);

    const entries: IndexEntry[] = [
      child('/leagues.xml'),
      child('/countries.xml'),
      ...pages('/teams', teamPages),
      ...pages('/players', playerPages),
      ...pages('/matches', matchPages),
    ];

    return xmlResponse(renderSitemapIndex(entries));
  } catch {
    // Total failure — still return a valid index pointing at the first page of
    // every category so nothing 404s from the index's perspective.
    const entries: IndexEntry[] = [
      child('/leagues.xml'),
      child('/countries.xml'),
      child('/teams/0.xml'),
      child('/players/0.xml'),
      child('/matches/0.xml'),
    ];
    return xmlResponse(renderSitemapIndex(entries));
  }
}
