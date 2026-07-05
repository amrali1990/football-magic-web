import type { Metadata } from 'next';
import { LeagueEntityPage, generateLeagueMetadata, LeagueRouteParams } from '@/components/pages/LeagueEntityPage';

export const revalidate = 3600;

// Prebuild nothing: every path is generated on first request, then cached and
// revalidated on the schedule above (on-demand ISR).
export async function generateStaticParams() {
  return [];
}

export function generateMetadata({ params }: { params: LeagueRouteParams }): Promise<Metadata> {
  return generateLeagueMetadata(params, 'en');
}

export default function Page({ params }: { params: LeagueRouteParams }) {
  return <LeagueEntityPage params={params} locale="en" />;
}
