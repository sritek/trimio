/**
 * Calendar Header Component
 * Date navigation and controls for resource calendar
 */

'use client';

import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { TimeSlotInterval } from '@/stores/calendar-store';

interface CalendarHeaderProps {
  date: string;
  timeSlotInterval: TimeSlotInterval;
  onDateChange: (direction: 'prev' | 'next' | 'today') => void;
  onIntervalChange: (interval: TimeSlotInterval) => void;
  onFilterClick?: () => void;
  hasActiveFilters?: boolean;
}

// Status legend items - grouped by flow
const ACTIVE_FLOW_STATUSES = [
  { key: 'booked', label: 'Booked', color: 'bg-sky-500' },
  { key: 'confirmed', label: 'Confirmed', color: 'bg-emerald-500' },
  { key: 'checked_in', label: 'Checked In', color: 'bg-violet-500' },
  { key: 'in_progress', label: 'In Progress', color: 'bg-amber-500' },
];

const TERMINAL_STATUSES = [
  { key: 'completed', label: 'Completed', color: 'bg-slate-400' },
  { key: 'cancelled', label: 'Cancelled', color: 'bg-red-500', hidden: true },
  { key: 'no_show', label: 'No Show', color: 'bg-rose-500', hidden: true },
];

function StatusLegend() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <div className="flex -space-x-1">
            <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
          </div>
          <span className="hidden sm:inline text-xs">Legend</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-3" align="end">
        {/* Active Flow */}
        <div className="text-xs font-medium text-muted-foreground mb-2">Active Flow</div>
        <div className="space-y-1.5 mb-3">
          {ACTIVE_FLOW_STATUSES.map((item) => (
            <div key={item.key} className="flex items-center gap-2">
              <div className={cn('w-3 h-3 rounded-full', item.color)} />
              <span className="text-sm">{item.label}</span>
            </div>
          ))}
        </div>

        {/* Terminal States */}
        <div className="border-t pt-2">
          <div className="text-xs font-medium text-muted-foreground mb-2">Terminal States</div>
          <div className="space-y-1.5">
            {TERMINAL_STATUSES.map((item) => (
              <div key={item.key} className="flex items-center gap-2">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full',
                    item.color,
                    item.hidden && 'ring-1 ring-offset-1 ring-muted-foreground/30'
                  )}
                />
                <span className="text-sm">{item.label}</span>
                {item.hidden && <span className="text-xs text-muted-foreground">(hidden)</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Other */}
        <div className="border-t mt-3 pt-2">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-amber-200 dark:bg-amber-800" />
            <span className="text-sm">Break Time</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function CalendarHeader({
  date,
  timeSlotInterval,
  onDateChange,
  onIntervalChange,
  onFilterClick,
  hasActiveFilters = false,
}: CalendarHeaderProps) {
  const t = useTranslations('calendar');
  const dateObj = parseISO(date);

  const isToday = format(new Date(), 'yyyy-MM-dd') === date;

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
      {/* Date Navigation */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onDateChange('prev')}
          aria-label={t('previousDay')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <Button
          variant={isToday ? 'default' : 'outline'}
          size="sm"
          onClick={() => onDateChange('today')}
        >
          {t('today')}
        </Button>

        <Button
          variant="outline"
          size="icon"
          onClick={() => onDateChange('next')}
          aria-label={t('nextDay')}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>

        <span className="ml-2 text-lg font-semibold">{format(dateObj, 'EEEE, MMMM d, yyyy')}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-2">
        {/* Time Interval Selector */}
        <div className="hidden sm:flex rounded-lg border p-1">
          {([15, 30, 60] as TimeSlotInterval[]).map((interval) => (
            <Button
              key={interval}
              variant={timeSlotInterval === interval ? 'secondary' : 'ghost'}
              size="sm"
              onClick={() => onIntervalChange(interval)}
              className="px-2 text-xs"
            >
              {interval}m
            </Button>
          ))}
        </div>

        {/* Status Legend */}
        <StatusLegend />

        {/* Filter Button */}
        {onFilterClick && (
          <Button
            variant="outline"
            size="sm"
            onClick={onFilterClick}
            className={cn(hasActiveFilters && 'border-primary text-primary')}
          >
            <Filter className="h-4 w-4 mr-1" />
            {t('filter')}
            {hasActiveFilters && <span className="ml-1 h-2 w-2 rounded-full bg-primary" />}
          </Button>
        )}
      </div>
    </div>
  );
}
