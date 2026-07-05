import type { Metadata } from 'next';
import { HomeEntityPage, homeMetadata } from '@/components/pages/HomeEntityPage';

// Today's match list changes constantly — regenerate at most every minute.
export const revalidate = 60;

export const metadata: Metadata = homeMetadata('en');

export default function HomePage() {
  return <HomeEntityPage locale="en" />;
}
