// GET /leagues.xml — every league page (bilingual) plus the two browse roots
// (home and the /leagues listing). Listed in the sitemap index.

import { renderUrlset, xmlResponse, collectLeagueEntries } from '@/lib/sitemap';

// League set changes slowly; standings freshness is handled on the pages.
export const revalidate = 86400;

export async function GET(): Promise<Response> {
  try {
    return xmlResponse(renderUrlset(await collectLeagueEntries()));
  } catch {
    // Never 500 — Search Console rejects the whole sitemap on a 500.
    return xmlResponse(renderUrlset([]));
  }
}
