import type { Metadata } from 'next';

// User-specific page — keep it out of search indexes.
export const metadata: Metadata = {
  title: 'My Favorites',
  robots: { index: false, follow: false },
};

export default function FavoritesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
