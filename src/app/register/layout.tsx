import type { Metadata } from 'next';

// User-specific page — keep it out of search indexes.
export const metadata: Metadata = {
  title: 'Create an Account',
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
