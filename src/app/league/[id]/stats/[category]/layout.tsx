import type { Metadata } from 'next';
import { getLeague } from '@/lib/server-api';
import { metaDescription, SITE_NAME } from '@/lib/seo';

// "topScorers" -> "Top Scorers"
function humanizeCategory(category: string): string {
  return category
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (c) => c.toUpperCase());
}

// The page itself is a client component; this layout supplies its metadata.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; category: string }>;
}): Promise<Metadata> {
  const { id, category } = await params;
  const leagueId = Number(id);
  const league = Number.isInteger(leagueId) && leagueId > 0 ? await getLeague(leagueId) : null;
  const categoryLabel = humanizeCategory(decodeURIComponent(category));
  const leagueName = league?.name ?? 'League';
  return {
    title: `${leagueName} ${categoryLabel}`,
    description: metaDescription(
      `${leagueName} ${categoryLabel.toLowerCase()}: the current season's player rankings with goals, assists and appearances on ${SITE_NAME}.`
    ),
    alternates: { canonical: `/league/${id}/stats/${category}` },
  };
}

export default function LeagueStatsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
