import type { Metadata } from 'next';
import { LeaguesEntityPage, leaguesMetadata } from '@/components/pages/LeaguesEntityPage';

export const revalidate = 3600;

export const metadata: Metadata = leaguesMetadata('en');

export default function LeaguesPage() {
  return <LeaguesEntityPage locale="en" />;
}
