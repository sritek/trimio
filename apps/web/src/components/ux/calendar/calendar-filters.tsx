/**
 * Calendar Filters Component
 * Filter panel for resource calendar
 */

'use client';

import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useTranslations } from 'next-intl';
import { useCalendarStore, type AppointmentStatus } from '@/stores/calendar-store';
import type { CalendarStylist } from '@/hooks/queries/use-resource-calendar';

interface CalendarFiltersProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stylists: CalendarStylist[];
}

// Active flow statuses - shown by default
const ACTIVE_FLOW_STATUSES: { value: AppointmentStatus; label: string; color: string }[] = [
  { value: 'booked', label: 'Booked', color: 'bg-sky-500' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-emerald-500' },
  { value: 'checked_in', label: 'Checked In', color: 'bg-violet-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-amber-500' },
  { value: 'completed', label: 'Completed', color: 'bg-slate-400' },
];

// Terminal statuses - hidden by default
const TERMINAL_STATUSES: { value: AppointmentStatus; label: string; color: string }[] = [
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
  { value: 'no_show', label: 'No Show', color: 'bg-rose-500' },
];

export function CalendarFilters({ open, onOpenChange, stylists }: CalendarFiltersProps) {
  const t = useTranslations('calendar');
  const { filters, toggleStylistFilter, toggleStatusFilter, toggleExcludedStatus, clearFilters } =
    useCalendarStore();

  const hasActiveFilters =
    filters.stylistIds.length > 0 ||
    filters.statuses.length > 0 ||
    // Check if excludedStatuses differs from default (cancelled, no_show)
    !(
      filters.excludedStatuses?.length === 2 &&
      filters.excludedStatuses.includes('cancelled') &&
      filters.excludedStatuses.includes('no_show')
    );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[320px] sm:w-[400px]">
        <SheetHeader>
          <SheetTitle>{t('filter')}</SheetTitle>
          <SheetDescription>Filter appointments by stylist and status</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Stylists Filter */}
          <div>
            <h4 className="font-medium mb-3">{t('stylists')}</h4>
            <div className="space-y-2">
              {stylists.map((stylist) => (
                <div key={stylist.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`stylist-${stylist.id}`}
                    checked={filters.stylistIds.includes(stylist.id)}
                    onCheckedChange={() => toggleStylistFilter(stylist.id)}
                  />
                  <Label
                    htmlFor={`stylist-${stylist.id}`}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: stylist.color }}
                    />
                    {stylist.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <h4 className="font-medium mb-3">{t('filterByStatus')}</h4>

            {/* Active Flow - use include filter */}
            <div className="text-xs text-muted-foreground mb-2">Show only specific statuses</div>
            <div className="space-y-2 mb-4">
              {ACTIVE_FLOW_STATUSES.map((status) => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={filters.statuses.includes(status.value)}
                    onCheckedChange={() => toggleStatusFilter(status.value)}
                  />
                  <Label
                    htmlFor={`status-${status.value}`}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className={`w-3 h-3 rounded-full ${status.color}`} />
                    {status.label}
                  </Label>
                </div>
              ))}
            </div>

            {/* Terminal States - use exclude filter (inverted logic) */}
            <div className="text-xs text-muted-foreground mb-2">Show terminal states</div>
            <div className="space-y-2">
              {TERMINAL_STATUSES.map((status) => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={!filters.excludedStatuses?.includes(status.value)}
                    onCheckedChange={() => toggleExcludedStatus(status.value)}
                  />
                  <Label
                    htmlFor={`status-${status.value}`}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <span className={`w-3 h-3 rounded-full ${status.color}`} />
                    {status.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                clearFilters();
                onOpenChange(false);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              {t('clearFilters')}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
