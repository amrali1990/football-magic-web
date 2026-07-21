// GET /matches/{n}.xml — one page of the matches sitemap (highest-volume,
// ~1.5M fixtures). High volume + volatile, so revalidated hourly. FE page N maps
// 1:1 to backend slim page N (fixtures ordered newest-first). See
// players/[page]/route.ts for how the `.xml` extension is carried in [page].

import { renderUrlset, xmlResponse, collectMatchEntriesPage } from '@/lib/sitemap';

export const revalidate = 3600;

export async function GET(_req: Request, ctx: RouteContext<'/matches/[page]'>): Promise<Response> {
  try {
    const { page } = await ctx.params;
    const n = parseInt(page, 10);
    if (!Number.isInteger(n) || n < 0) return xmlResponse(renderUrlset([]));
    return xmlResponse(renderUrlset(await collectMatchEntriesPage(n)));
  } catch {
    return xmlResponse(renderUrlset([]));
  }
}
