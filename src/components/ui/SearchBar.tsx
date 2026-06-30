'use client';

import { Search, X } from 'lucide-react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Search...' }: SearchBarProps) {
  return (
    <div className="relative">
      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pl-11 pr-10 text-[15px] text-gray-900 placeholder-gray-500 outline-none transition-colors focus:border-orange-500 focus:bg-white focus:ring-1 focus:ring-orange-500/30"
      />
      {value && (
        <button
          onClick={() => onChange('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-orange-500 p-0.5 text-white hover:bg-orange-600"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
