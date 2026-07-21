// GET /players/{n}.xml — one page of the players sitemap.
//
// FE page N maps 1:1 to backend slim page N (ENTITIES_PER_FILE entities → ≤ that
// ×2 bilingual urls). The `.xml` rides inside the [page] param ("0.xml"), giving
// clean readable URLs that match exactly what the sitemap index lists; parseInt
// stops at the dot.

import { renderUrlset, xmlResponse, collectPlayerEntriesPage } from '@/lib/sitemap';

export const revalidate = 86400;

export async function GET(_req: Request, ctx: RouteContext<'/players/[page]'>): Promise<Response> {
  try {
    const { page } = await ctx.params;
    const n = parseInt(page, 10);
    if (!Number.isInteger(n) || n < 0) return xmlResponse(renderUrlset([]));
    return xmlResponse(renderUrlset(await collectPlayerEntriesPage(n)));
  } catch {
    return xmlResponse(renderUrlset([]));
  }
}
