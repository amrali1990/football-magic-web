import type { Metadata } from 'next';

// User-specific page — keep it out of search indexes.
export const metadata: Metadata = {
  title: 'Profile',
  robots: { index: false, follow: false },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
