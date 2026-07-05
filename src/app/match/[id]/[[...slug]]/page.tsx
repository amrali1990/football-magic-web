import type { Metadata } from 'next';
import { MatchEntityPage, generateMatchMetadata, MatchRouteParams } from '@/components/pages/MatchEntityPage';

// Live match pages need much fresher regeneration than entity pages.
export const revalidate = 60;

// Prebuild nothing: every path is generated on first request, then cached and
// revalidated on the schedule above (on-demand ISR).
export async function generateStaticParams() {
  return [];
}

export function generateMetadata({ params }: { params: MatchRouteParams }): Promise<Metadata> {
  return generateMatchMetadata(params, 'en');
}

export default function Page({ params }: { params: MatchRouteParams }) {
  return <MatchEntityPage params={params} locale="en" />;
}
