import type { Metadata } from 'next';

// Account-deletion page declared in the Play Console — keep it reachable but
// out of search indexes.
export const metadata: Metadata = {
  title: 'Delete Your Account',
  robots: { index: false, follow: false },
};

export default function DeleteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
