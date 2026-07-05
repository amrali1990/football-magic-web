import type { Metadata } from 'next';
import { TeamEntityPage, generateTeamMetadata, TeamRouteParams } from '@/components/pages/TeamEntityPage';

export const revalidate = 3600;

// Prebuild nothing: every path is generated on first request, then cached and
// revalidated on the schedule above (on-demand ISR).
export async function generateStaticParams() {
  return [];
}

export function generateMetadata({ params }: { params: TeamRouteParams }): Promise<Metadata> {
  return generateTeamMetadata(params, 'en');
}

export default function Page({ params }: { params: TeamRouteParams }) {
  return <TeamEntityPage params={params} locale="en" />;
}
