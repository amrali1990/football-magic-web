import type { Metadata } from 'next';
import { LeaguesEntityPage, leaguesMetadata } from '@/components/pages/LeaguesEntityPage';

export const revalidate = 3600;

export const metadata: Metadata = leaguesMetadata('ar');

export default function ArabicLeaguesPage() {
  return <LeaguesEntityPage locale="ar" />;
}
