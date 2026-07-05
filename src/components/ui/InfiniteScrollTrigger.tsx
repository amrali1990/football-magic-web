'use client';

import { useState, useEffect, useRef } from 'react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

interface InfiniteScrollTriggerProps {
  /** Loads the next page. Called only while the sentinel is visible and `loading` is false. */
  onLoadMore: () => void;
  /** True while a page is being fetched — shows the inline spinner and pauses triggering. */
  loading: boolean;
  /** How far before the end of the list the next page starts loading. */
  rootMargin?: string;
}

/**
 * Sentinel that auto-loads the next page of a list when scrolled into view
 * (replaces the old "Show All" / "Load More" buttons). Render it only while
 * more pages exist. Re-triggers after each load completes if it is still in
 * view, so short pages keep filling until the viewport is full.
 */
export function InfiniteScrollTrigger({ onLoadMore, loading, rootMargin = '400px' }: InfiniteScrollTriggerProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [intersecting, setIntersecting] = useState(false);
  const onLoadMoreRef = useRef(onLoadMore);

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  });

  useEffect(() => {
    const sentinel = ref.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => setIntersecting(entries[0].isIntersecting),
      { rootMargin }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [rootMargin]);

  useEffect(() => {
    if (intersecting && !loading) onLoadMoreRef.current();
  }, [intersecting, loading]);

  return (
    <div ref={ref} className="flex justify-center py-2">
      {loading && <LoadingSpinner />}
    </div>
  );
}
