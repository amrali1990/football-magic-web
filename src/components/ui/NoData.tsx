import { FileX } from 'lucide-react';

interface NoDataProps {
  title?: string;
  subtitle?: string;
}

export function NoData({ title = 'No Data', subtitle = 'There is no data available right now' }: NoDataProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
      <FileX className="mb-4 h-16 w-16" />
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-1 text-sm">{subtitle}</p>
    </div>
  );
}
