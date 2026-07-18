import Link from 'next/link';

import { NotFoundAuditLogger } from '@/components/seo/NotFoundAuditLogger';

// Global 404 boundary: every notFound() (unknown entity ids, dead slugs) and
// unmatched route renders this. Bilingual because it serves both URL trees.
export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <NotFoundAuditLogger />
      <p className="text-5xl font-bold text-orange-500">404</p>
      <h1 className="text-xl font-bold text-gray-900">Page not found</h1>
      <p className="max-w-md text-sm text-gray-500">
        The page you are looking for does not exist or has moved.
        <span className="mt-1 block" dir="rtl" lang="ar">
          الصفحة التي تبحث عنها غير موجودة أو تم نقلها.
        </span>
      </p>
      <div className="mt-2 flex items-center gap-4">
        <Link href="/" className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-orange-600">
          Home
        </Link>
        <Link href="/ar" className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50" dir="rtl" lang="ar">
          الرئيسية
        </Link>
      </div>
    </div>
  );
}
