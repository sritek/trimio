'use client';

/**
 * List Filters Sheet
 * Filter panel for appointments list view with multi-select and date range
 * Uses local state with Apply/Reset buttons
 *
 * Filter Logic:
 * - Multiple selections within same group = OR (e.g., booked OR confirmed)
 * - Across different groups = AND (e.g., status:booked AND bookingType:online)
 */

import { useState, useEffect } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { format, isAfter, startOfDay, parse } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { DatePicker } from '@/components/common';
import { useTranslations } from 'next-intl';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useBranchContext } from '@/hooks/use-branch-context';
import { BOOKING_TYPE_OPTIONS, STATUS_OPTIONS } from '../utils/constants';

export interface ListFiltersState {
  dateFrom: string;
  dateTo: string;
  statuses: string[];
  bookingTypes: string[];
  stylistIds: string[];
}

interface ListFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ListFiltersState;
  onFiltersChange: (filters: ListFiltersState) => void;
}

export function ListFiltersSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: ListFiltersSheetProps) {
  const t = useTranslations('common');
  const { branchId } = useBranchContext();

  // Local state for editing - only applied when user clicks Apply
  const [localFilters, setLocalFilters] = useState<ListFiltersState>(filters);

  // Sync local state when sheet opens or external filters change
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const { data: staffData } = useStaffList({
    branchId: branchId || '',
    role: 'stylist',
    limit: 100,
  });
  const stylists = (staffData?.data || []).map((staff) => ({
    id: staff.user?.id || staff.userId,
    name: staff.user?.name || 'Unknown',
  }));

  // Parse dates for DatePicker - use parse instead of parseISO to avoid timezone issues
  // parseISO treats 'yyyy-MM-dd' as UTC midnight, which shows as previous day in IST
  const dateFromValue = localFilters.dateFrom
    ? parse(localFilters.dateFrom, 'yyyy-MM-dd', new Date())
    : undefined;
  const dateToValue = localFilters.dateTo
    ? parse(localFilters.dateTo, 'yyyy-MM-dd', new Date())
    : undefined;

  const handleDateFromChange = (date: Date | undefined) => {
    if (!date) return;
    // Use local date formatting to avoid timezone issues
    const dateStr = format(date, 'yyyy-MM-dd');
    // If dateFrom is after dateTo, also update dateTo
    if (dateToValue && isAfter(startOfDay(date), startOfDay(dateToValue))) {
      setLocalFilters({ ...localFilters, dateFrom: dateStr, dateTo: dateStr });
    } else {
      setLocalFilters({ ...localFilters, dateFrom: dateStr });
    }
  };

  const handleDateToChange = (date: Date | undefined) => {
    if (!date) return;
    // Use local date formatting to avoid timezone issues
    const dateStr = format(date, 'yyyy-MM-dd');
    // If dateTo is before dateFrom, also update dateFrom
    if (dateFromValue && isAfter(startOfDay(dateFromValue), startOfDay(date))) {
      setLocalFilters({ ...localFilters, dateFrom: dateStr, dateTo: dateStr });
    } else {
      setLocalFilters({ ...localFilters, dateTo: dateStr });
    }
  };

  // Toggle functions for multi-select (OR within group)
  const toggleStatus = (status: string) => {
    const newStatuses = localFilters.statuses.includes(status)
      ? localFilters.statuses.filter((s) => s !== status)
      : [...localFilters.statuses, status];
    setLocalFilters({ ...localFilters, statuses: newStatuses });
  };

  const toggleBookingType = (type: string) => {
    const newTypes = localFilters.bookingTypes.includes(type)
      ? localFilters.bookingTypes.filter((t) => t !== type)
      : [...localFilters.bookingTypes, type];
    setLocalFilters({ ...localFilters, bookingTypes: newTypes });
  };

  const toggleStylist = (stylistId: string) => {
    const newStylistIds = localFilters.stylistIds.includes(stylistId)
      ? localFilters.stylistIds.filter((id) => id !== stylistId)
      : [...localFilters.stylistIds, stylistId];
    setLocalFilters({ ...localFilters, stylistIds: newStylistIds });
  };

  const handleReset = () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const resetFilter = {
      dateFrom: today,
      dateTo: today,
      statuses: [],
      bookingTypes: [],
      stylistIds: [],
    };
    setLocalFilters(resetFilter);
    onFiltersChange(resetFilter);
    onOpenChange(false);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const activeFilterCount =
    localFilters.statuses.length +
    localFilters.bookingTypes.length +
    localFilters.stylistIds.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex flex-col p-0">
        <SheetHeader className="px-4 py-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            {t('actions.filter')}
            {activeFilterCount > 0 && (
              <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                {activeFilterCount}
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
          {/* Date Range */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Date Range</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">From</Label>
                <DatePicker
                  value={dateFromValue}
                  onChange={handleDateFromChange}
                  placeholder="Start date"
                  className="w-full"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1 block">To</Label>
                <DatePicker
                  value={dateToValue}
                  onChange={handleDateToChange}
                  placeholder="End date"
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* Stylists Filter - Multi-select (OR) */}
          {stylists.length > 0 && (
            <div>
              <Label className="text-sm font-medium mb-3 block">
                Stylists
                {localFilters.stylistIds.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({localFilters.stylistIds.length} selected)
                  </span>
                )}
              </Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {stylists.map((stylist) => (
                  <div key={stylist.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`stylist-${stylist.id}`}
                      checked={localFilters.stylistIds.includes(stylist.id)}
                      onCheckedChange={() => toggleStylist(stylist.id)}
                    />
                    <Label htmlFor={`stylist-${stylist.id}`} className="cursor-pointer">
                      {stylist.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Status Filter - Multi-select (OR) */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Status
              {localFilters.statuses.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({localFilters.statuses.length} selected)
                </span>
              )}
            </Label>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((status) => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={localFilters.statuses.includes(status.value)}
                    onCheckedChange={() => toggleStatus(status.value)}
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

          {/* Booking Type Filter - Multi-select (OR) */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Booking Type
              {localFilters.bookingTypes.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({localFilters.bookingTypes.length} selected)
                </span>
              )}
            </Label>
            <div className="space-y-2">
              {BOOKING_TYPE_OPTIONS.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={localFilters.bookingTypes.includes(type.value)}
                    onCheckedChange={() => toggleBookingType(type.value)}
                  />
                  <Label htmlFor={`type-${type.value}`} className="cursor-pointer">
                    {type.label}
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
