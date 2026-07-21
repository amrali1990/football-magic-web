// GET /countries.xml — /country/{code} pages. English-only (no /ar/country
// route exists). Weekly revalidation: the country set is near-static.

import { renderUrlset, xmlResponse, collectCountryEntries } from '@/lib/sitemap';

export const revalidate = 604800;

export async function GET(): Promise<Response> {
  try {
    return xmlResponse(renderUrlset(await collectCountryEntries()));
  } catch {
    return xmlResponse(renderUrlset([]));
  }
}
