'use client';

/**
 * Floor View Summary Component
 * Shows station status counts
 */

import { cn } from '@/lib/utils';
import type { FloorViewSummary as FloorViewSummaryType } from '@/types/stations';

interface FloorViewSummaryProps {
  summary: FloorViewSummaryType;
}

export function FloorViewSummary({ summary }: FloorViewSummaryProps) {
  const items = [
    {
      label: 'Available',
      count: summary.available,
      color: 'bg-green-500',
      textColor: 'text-green-700 dark:text-green-400',
    },
    {
      label: 'Occupied',
      count: summary.occupied,
      color: 'bg-blue-500',
      textColor: 'text-blue-700 dark:text-blue-400',
    },
    {
      label: 'Reserved',
      count: summary.reserved,
      color: 'bg-yellow-500',
      textColor: 'text-yellow-700 dark:text-yellow-400',
    },
    {
      label: 'Out of Service',
      count: summary.outOfService,
      color: 'bg-gray-400',
      textColor: 'text-gray-500 dark:text-gray-400',
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="text-sm text-muted-foreground">{summary.total} stations</span>
      <div className="flex flex-wrap items-center gap-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className={cn('h-2.5 w-2.5 rounded-full', item.color)} />
            <span className={cn('text-sm font-medium', item.textColor)}>{item.count}</span>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
