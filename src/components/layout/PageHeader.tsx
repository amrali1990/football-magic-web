'use client';

import { ReactNode } from 'react';

interface PageHeaderProps {
  children: ReactNode;
}

export function PageHeader({ children }: PageHeaderProps) {
  return (
    <div className="sticky top-14 md:top-0 z-30 border-b border-gray-200 bg-white/85 backdrop-blur-md">
      {children}
    </div>
  );
}
