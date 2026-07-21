// GET /teams/{n}.xml — one page of the teams sitemap.
//
// Teams are paginated (~27k teams → >50k bilingual urls exceeds a single file's
// limit). FE page N maps 1:1 to backend slim page N. See players/[page]/route.ts
// for how the `.xml` extension is carried in the [page] param.

import { renderUrlset, xmlResponse, collectTeamEntriesPage } from '@/lib/sitemap';

export const revalidate = 86400;

export async function GET(_req: Request, ctx: RouteContext<'/teams/[page]'>): Promise<Response> {
  try {
    const { page } = await ctx.params;
    const n = parseInt(page, 10);
    if (!Number.isInteger(n) || n < 0) return xmlResponse(renderUrlset([]));
    return xmlResponse(renderUrlset(await collectTeamEntriesPage(n)));
  } catch {
    return xmlResponse(renderUrlset([]));
  }
}
