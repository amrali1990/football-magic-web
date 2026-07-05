import type { Metadata } from 'next';
import { HomeEntityPage, homeMetadata } from '@/components/pages/HomeEntityPage';

// Today's match list changes constantly — regenerate at most every minute.
export const revalidate = 60;

export const metadata: Metadata = homeMetadata('ar');

export default function ArabicHomePage() {
  return <HomeEntityPage locale="ar" />;
}
