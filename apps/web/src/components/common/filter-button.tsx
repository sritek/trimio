'use client';

/**
 * FilterButton Component
 * Consistent filter button with active filter count indicator
 * Used across all list/calendar pages for opening filter sidebars
 */

import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface FilterButtonProps {
  /** Click handler to open filter sidebar */
  onClick: () => void;
  /** Number of active filter groups (0 = no filters) */
  activeCount?: number;
  /** Button label (default: "Filters") */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Button size */
  size?: 'sm' | 'default';
  /** Show/hide label (useful for mobile) */
  showLabel?: boolean;
}

export function FilterButton({
  onClick,
  activeCount = 0,
  label = 'Filters',
  className,
  size = 'sm',
  showLabel = true,
}: FilterButtonProps) {
  const hasActiveFilters = activeCount > 0;

  return (
    <Button
      variant="outline"
      size={size}
      onClick={onClick}
      className={cn('gap-2', hasActiveFilters && 'border-primary', className)}
      aria-label={hasActiveFilters ? `Open filters, ${activeCount} active` : 'Open filters'}
    >
      <Filter className={cn('h-4 w-4', hasActiveFilters && 'text-primary')} />
      {showLabel && <span className="hidden sm:inline">{label}</span>}
      {hasActiveFilters && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-medium text-primary-foreground">
          {activeCount}
        </span>
      )}
    </Button>
  );
}
