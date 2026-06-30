'use client';

import { useState, useRef, useEffect } from 'react';
import { format, addDays, subDays, startOfWeek } from 'date-fns';
import { ar, enUS } from 'date-fns/locale';
import { cn, isTodayDate, localizeNumber } from '@/lib/utils';
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react';

interface DateStripProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  lng: string;
}

function getWeekDates(anchor: Date): Date[] {
  const start = startOfWeek(anchor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function DateStrip({ selectedDate, onDateSelect, lng }: DateStripProps) {
  const [weekAnchor, setWeekAnchor] = useState(selectedDate);
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLInputElement>(null);
  const dates = getWeekDates(weekAnchor);
  const locale = lng === 'ar' ? ar : enUS;

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setWeekAnchor(selectedDate);
  }, [selectedDate]);

  const goBack = () => {
    const newAnchor = subDays(weekAnchor, 7);
    setWeekAnchor(newAnchor);
  };

  const goForward = () => {
    const newAnchor = addDays(weekAnchor, 7);
    setWeekAnchor(newAnchor);
  };

  const handlePickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val) {
      const picked = new Date(val + 'T12:00:00');
      setWeekAnchor(picked);
      onDateSelect(picked);
    }
    setShowPicker(false);
  };

  const openPicker = () => {
    setShowPicker(true);
    setTimeout(() => pickerRef.current?.showPicker?.(), 0);
  };

  const midDate = dates[3];
  const monthName = format(midDate, 'MMMM', { locale });
  const yearStr = localizeNumber(format(midDate, 'yyyy'), lng);

  const navButtonClass =
    'flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 shadow-sm transition-all duration-150 hover:border-orange-300 hover:bg-orange-50 hover:text-orange-500 hover:shadow active:translate-y-px active:shadow-none';

  return (
    <div className="border-t border-gray-100 bg-gradient-to-b from-gray-50/80 to-white">
      <div className="flex items-center justify-between px-4 pb-1.5 pt-2.5">
        <span className="text-sm font-bold tracking-tight text-gray-800">
          {monthName} <span className="text-orange-500">{yearStr}</span>
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onClick={openPicker}
            className={navButtonClass}
            title="Pick a date"
            aria-label="Pick a date"
          >
            <CalendarDays className="h-4 w-4" />
          </button>
          <input
            ref={pickerRef}
            type="date"
            value={format(selectedDate, 'yyyy-MM-dd')}
            onChange={handlePickerChange}
            className="invisible absolute h-0 w-0"
            tabIndex={-1}
          />
          <button onClick={goBack} className={navButtonClass} aria-label="Previous week">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={goForward} className={navButtonClass} aria-label="Next week">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-3 pb-3 pt-1">
        {dates.map((date) => {
          const dateStr = format(date, 'yyyy-MM-dd');
          const selectedStr = format(selectedDate, 'yyyy-MM-dd');
          const isSelected = dateStr === selectedStr;
          const isToday = isTodayDate(date);

          return (
            <button
              key={dateStr}
              onClick={() => onDateSelect(date)}
              aria-pressed={isSelected}
              className={cn(
                'group relative flex min-w-[2.85rem] flex-1 flex-col items-center gap-1.5 overflow-hidden rounded-xl border px-1 py-2.5 transition-all duration-200 ease-out',
                isSelected
                  ? '-translate-y-0.5 border-orange-600/40 bg-gradient-to-b from-orange-400 to-orange-600 shadow-lg shadow-orange-500/35'
                  : 'border-gray-200/80 bg-white shadow-sm hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md active:translate-y-0 active:shadow-sm'
              )}
            >
              {/* Glossy top highlight gives the raised, selected pill a 3D sheen */}
              {isSelected && (
                <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/25 to-transparent" />
              )}

              <span className={cn(
                'text-[11px] font-semibold uppercase tracking-widest transition-colors',
                isSelected ? 'text-orange-50' : 'text-gray-400 group-hover:text-orange-400'
              )}>
                {format(date, 'EEE', { locale })}
              </span>

              <span className={cn(
                'text-[17px] font-bold leading-none tabular-nums transition-colors',
                isSelected
                  ? 'text-white drop-shadow-sm'
                  : isToday
                    ? 'text-orange-500'
                    : 'text-gray-800'
              )}>
                {localizeNumber(format(date, 'd'), lng)}
              </span>

              {/* Today marker; rendered transparent on other days to keep pill heights uniform */}
              <span className={cn(
                'h-1 w-1 rounded-full transition-colors',
                isSelected ? 'bg-white/70' : isToday ? 'bg-orange-500' : 'bg-transparent'
              )} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
