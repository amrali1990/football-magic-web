import type { Metadata } from 'next';
import { PlayerEntityPage, generatePlayerMetadata, PlayerRouteParams } from '@/components/pages/PlayerEntityPage';

export const revalidate = 3600;

// Prebuild nothing: every path is generated on first request, then cached and
// revalidated on the schedule above (on-demand ISR).
export async function generateStaticParams() {
  return [];
}

export function generateMetadata({ params }: { params: PlayerRouteParams }): Promise<Metadata> {
  return generatePlayerMetadata(params, 'en');
}

export default function Page({ params }: { params: PlayerRouteParams }) {
  return <PlayerEntityPage params={params} locale="en" />;
}
