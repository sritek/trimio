'use client';

/**
 * List Filters Sheet
 * Filter panel for appointments list view with multi-select and date range
 *
 * Filter Logic:
 * - Multiple selections within same group = OR (e.g., booked OR confirmed)
 * - Across different groups = AND (e.g., status:booked AND bookingType:online)
 */

import { X, Filter } from 'lucide-react';
import { parseISO, isAfter, startOfDay } from 'date-fns';
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
import { DatePicker } from '@/components/common';
import { useTranslations } from 'next-intl';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useBranchContext } from '@/hooks/use-branch-context';
import type { AppointmentStatus, BookingType } from '@/types/appointments';

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

const STATUS_OPTIONS: { value: AppointmentStatus; label: string; color: string }[] = [
  { value: 'booked', label: 'Booked', color: 'bg-sky-500' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-emerald-500' },
  { value: 'checked_in', label: 'Checked In', color: 'bg-violet-500' },
  { value: 'in_progress', label: 'In Progress', color: 'bg-amber-500' },
  { value: 'completed', label: 'Completed', color: 'bg-slate-400' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-500' },
  { value: 'no_show', label: 'No Show', color: 'bg-rose-500' },
];

const BOOKING_TYPE_OPTIONS: { value: BookingType; label: string }[] = [
  { value: 'online', label: 'Online' },
  { value: 'phone', label: 'Phone' },
  { value: 'walk_in', label: 'Walk-in' },
];

export function ListFiltersSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: ListFiltersSheetProps) {
  const t = useTranslations('common');
  const { branchId } = useBranchContext();

  const { data: staffData } = useStaffList({
    branchId: branchId || '',
    role: 'stylist',
    limit: 100,
  });
  const stylists = (staffData?.data || []).map((staff) => ({
    id: staff.user?.id || staff.userId,
    name: staff.user?.name || 'Unknown',
  }));

  // Parse dates for DatePicker
  const dateFromValue = filters.dateFrom ? parseISO(filters.dateFrom) : undefined;
  const dateToValue = filters.dateTo ? parseISO(filters.dateTo) : undefined;

  const handleDateFromChange = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = date.toISOString().split('T')[0];
    // If dateFrom is after dateTo, also update dateTo
    if (dateToValue && isAfter(startOfDay(date), startOfDay(dateToValue))) {
      onFiltersChange({ ...filters, dateFrom: dateStr, dateTo: dateStr });
    } else {
      onFiltersChange({ ...filters, dateFrom: dateStr });
    }
  };

  const handleDateToChange = (date: Date | undefined) => {
    if (!date) return;
    const dateStr = date.toISOString().split('T')[0];
    // If dateTo is before dateFrom, also update dateFrom
    if (dateFromValue && isAfter(startOfDay(dateFromValue), startOfDay(date))) {
      onFiltersChange({ ...filters, dateFrom: dateStr, dateTo: dateStr });
    } else {
      onFiltersChange({ ...filters, dateTo: dateStr });
    }
  };

  // Toggle functions for multi-select (OR within group)
  const toggleStatus = (status: string) => {
    const newStatuses = filters.statuses.includes(status)
      ? filters.statuses.filter((s) => s !== status)
      : [...filters.statuses, status];
    onFiltersChange({ ...filters, statuses: newStatuses });
  };

  const toggleBookingType = (type: string) => {
    const newTypes = filters.bookingTypes.includes(type)
      ? filters.bookingTypes.filter((t) => t !== type)
      : [...filters.bookingTypes, type];
    onFiltersChange({ ...filters, bookingTypes: newTypes });
  };

  const toggleStylist = (stylistId: string) => {
    const newStylistIds = filters.stylistIds.includes(stylistId)
      ? filters.stylistIds.filter((id) => id !== stylistId)
      : [...filters.stylistIds, stylistId];
    onFiltersChange({ ...filters, stylistIds: newStylistIds });
  };

  const clearFilters = () => {
    onFiltersChange({
      ...filters,
      statuses: [],
      bookingTypes: [],
      stylistIds: [],
    });
  };

  const hasActiveFilters =
    filters.statuses.length > 0 || filters.bookingTypes.length > 0 || filters.stylistIds.length > 0;

  const activeFilterCount =
    filters.statuses.length + filters.bookingTypes.length + filters.stylistIds.length;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" size="narrow" className="p-4 space-y-8">
        <SheetHeader>
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

        <div className="mt-6 space-y-6">
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
                {filters.stylistIds.length > 0 && (
                  <span className="ml-2 text-xs text-muted-foreground">
                    ({filters.stylistIds.length} selected)
                  </span>
                )}
              </Label>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {stylists.map((stylist) => (
                  <div key={stylist.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`stylist-${stylist.id}`}
                      checked={filters.stylistIds.includes(stylist.id)}
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
              {filters.statuses.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({filters.statuses.length} selected)
                </span>
              )}
            </Label>
            <div className="space-y-2">
              {STATUS_OPTIONS.map((status) => (
                <div key={status.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`status-${status.value}`}
                    checked={filters.statuses.includes(status.value)}
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
              {filters.bookingTypes.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({filters.bookingTypes.length} selected)
                </span>
              )}
            </Label>
            <div className="space-y-2">
              {BOOKING_TYPE_OPTIONS.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type.value}`}
                    checked={filters.bookingTypes.includes(type.value)}
                    onCheckedChange={() => toggleBookingType(type.value)}
                  />
                  <Label htmlFor={`type-${type.value}`} className="cursor-pointer">
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button variant="outline" className="w-full" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
