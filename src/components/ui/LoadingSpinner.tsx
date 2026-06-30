'use client';

import { useAppSelector } from '@/store/hooks';

export function GlobalLoadingOverlay() {
  const show = useAppSelector((state) => state.loading.show);
  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="rounded-xl bg-white p-6 shadow-xl">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
      </div>
    </div>
  );
}

export function LoadingSpinner({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center py-12 ${className}`}>
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-orange-500" />
    </div>
  );
}
