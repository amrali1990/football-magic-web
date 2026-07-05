import type { Metadata } from 'next';
import { getCountry } from '@/lib/server-api';
import { metaDescription, SITE_NAME } from '@/lib/seo';

// The page itself is a client component; this layout supplies its metadata.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const country = await getCountry(code);
  const name = country?.name ?? code.toUpperCase();
  return {
    title: `${name} – Football Leagues, Teams & Players`,
    description: metaDescription(
      `Football in ${name}: domestic leagues and cups, national teams, clubs and players with fixtures, standings and statistics on ${SITE_NAME}.`
    ),
    alternates: { canonical: `/country/${code}` },
  };
}

export default function CountryLayout({ children }: { children: React.ReactNode }) {
  return children;
}
