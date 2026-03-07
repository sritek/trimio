/**
 * Calendar Filters Component
 * Filter panel for resource calendar with Apply/Reset buttons
 */

'use client';

import { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { useTranslations } from 'next-intl';
import {
  useCalendarStore,
  type FilterableAppointmentStatus,
  type CalendarFilters as CalendarFiltersType,
} from '@/stores';
import type { CalendarStylist } from '@/hooks/queries/use-resource-calendar';
import { STATUS_OPTIONS } from '@/app/(protected)/appointments/utils/constants';

interface CalendarFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stylists: CalendarStylist[];
}

// Active flow statuses - shown by default
const ACTIVE_FLOW_STATUSES = STATUS_OPTIONS.filter(
  (status) => status.value !== 'cancelled' && status.value !== 'no_show'
);

const DEFAULT_FILTERS: CalendarFiltersType = {
  stylistIds: [],
  statuses: [],
};

export function CalendarFiltersSheet({ open, onOpenChange, stylists }: CalendarFiltersSheetProps) {
  const t = useTranslations('calendar');
  const { filters, setFilters } = useCalendarStore();

  // Local state for editing - only applied when user clicks Apply
  const [localFilters, setLocalFilters] = useState<CalendarFiltersType>(filters);

  // Sync local state when sheet opens
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const toggleStylistFilter = (stylistId: string) => {
    const current = localFilters.stylistIds;
    const updated = current.includes(stylistId)
      ? current.filter((id) => id !== stylistId)
      : [...current, stylistId];
    setLocalFilters({ ...localFilters, stylistIds: updated });
  };

  const toggleStatusFilter = (status: FilterableAppointmentStatus) => {
    const current = localFilters.statuses;
    const updated = current.includes(status)
      ? current.filter((s) => s !== status)
      : [...current, status];
    setLocalFilters({ ...localFilters, statuses: updated });
  };

  const handleReset = () => {
    setLocalFilters(DEFAULT_FILTERS);
    setFilters(DEFAULT_FILTERS);
    onOpenChange(false);
  };

  const handleApply = () => {
    setFilters(localFilters);
    onOpenChange(false);
  };

  const activeFilterCount = localFilters.stylistIds.length + localFilters.statuses.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0 w-[320px] sm:w-[400px]">
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            {t('filter')}
            {activeFilterCount > 0 && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Stylists Filter */}
          <div>
            <h4 className="font-medium mb-3">
              {t('stylists')}
              {localFilters.stylistIds.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground font-normal">
                  ({localFilters.stylistIds.length} selected)
                </span>
              )}
            </h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stylists.map((stylist) => (
                <div key={stylist.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`stylist-${stylist.id}`}
                    checked={localFilters.stylistIds.includes(stylist.id)}
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
                    checked={localFilters.statuses.includes(status.value)}
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
          </div>
        </div>

        {/* Footer with Apply/Reset buttons */}
        <SheetFooter className="px-4 py-4 border-t gap-2">
          <Button variant="outline" onClick={handleReset} className="flex-1">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
          <Button onClick={handleApply} className="flex-1">
            Apply Filters
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
