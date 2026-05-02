'use client';

/**
 * Invoice Filters Sheet
 * Filter panel for invoices list view with multi-select and date range
 * Uses local state with Apply/Reset buttons
 * Follows the same pattern as appointments list-filters-sheet
 */

import { useState, useEffect } from 'react';
import { Filter, RotateCcw } from 'lucide-react';
import { format, parse } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { DatePicker } from '@/components/common';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useTranslations } from 'next-intl';

// ============================================
// Types
// ============================================

export interface InvoiceFiltersState {
  dateFrom: string;
  dateTo: string;
  statuses: string[];
  paymentStatuses: string[];
  stylistIds: string[];
}

interface InvoiceFiltersSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: InvoiceFiltersState;
  onFiltersChange: (filters: InvoiceFiltersState) => void;
}

export function InvoiceFiltersSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: InvoiceFiltersSheetProps) {
  const t = useTranslations('common');

  // Local state for editing - only applied when user clicks Apply
  const [localFilters, setLocalFilters] = useState<InvoiceFiltersState>(filters);

  // Sync local state when sheet opens or external filters change
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  // Parse dates for DatePicker
  const dateFromValue = localFilters.dateFrom
    ? parse(localFilters.dateFrom, 'yyyy-MM-dd', new Date())
    : undefined;
  const dateToValue = localFilters.dateTo
    ? parse(localFilters.dateTo, 'yyyy-MM-dd', new Date())
    : undefined;

  const handleDateFromChange = (date: Date | undefined) => {
    if (!date) {
      setLocalFilters({ ...localFilters, dateFrom: '' });
      return;
    }
    const dateStr = format(date, 'yyyy-MM-dd');
    // If dateFrom is after dateTo, also update dateTo
    if (dateToValue && date > dateToValue) {
      setLocalFilters({ ...localFilters, dateFrom: dateStr, dateTo: dateStr });
    } else {
      setLocalFilters({ ...localFilters, dateFrom: dateStr });
    }
  };

  const handleDateToChange = (date: Date | undefined) => {
    if (!date) {
      setLocalFilters({ ...localFilters, dateTo: '' });
      return;
    }
    const dateStr = format(date, 'yyyy-MM-dd');
    // If dateTo is before dateFrom, also update dateFrom
    if (dateFromValue && date < dateFromValue) {
      setLocalFilters({ ...localFilters, dateFrom: dateStr, dateTo: dateStr });
    } else {
      setLocalFilters({ ...localFilters, dateTo: dateStr });
    }
  };

  const handleReset = () => {
    const resetFilters: InvoiceFiltersState = {
      dateFrom: '',
      dateTo: '',
      statuses: [],
      paymentStatuses: [],
      stylistIds: [],
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
    onOpenChange(false);
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
    onOpenChange(false);
  };

  const activeFilterCount =
    localFilters.statuses.length +
    localFilters.paymentStatuses.length +
    (localFilters.dateFrom ? 1 : 0) +
    (localFilters.dateTo ? 1 : 0) +
    (localFilters.stylistIds.length > 0 ? 1 : 0);

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

          {/* Staff Filter */}
          <div>
            <Label className="text-sm font-medium mb-3 block">
              Staff
              {localFilters.stylistIds.length > 0 && (
                <span className="ml-2 text-xs text-muted-foreground">
                  ({localFilters.stylistIds.length} selected)
                </span>
              )}
            </Label>
            <StaffCheckboxList
              selected={localFilters.stylistIds}
              onChange={(ids) => setLocalFilters({ ...localFilters, stylistIds: ids })}
            />
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

// Inline staff checkbox list for the filter sheet
function StaffCheckboxList({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const { branchId } = useBranchContext();
  const { data } = useStaffList({ branchId: branchId || '', role: 'stylist' });
  const stylists = data?.data || [];

  const toggle = (id: string) => {
    onChange(selected.includes(id) ? selected.filter((s) => s !== id) : [...selected, id]);
  };

  if (stylists.length === 0) {
    return <p className="text-sm text-muted-foreground">No staff found</p>;
  }

  return (
    <div className="space-y-2">
      {stylists.map((s) => (
        <div key={s.userId} className="flex items-center space-x-2">
          <Checkbox
            id={`staff-${s.userId}`}
            checked={selected.includes(s.userId)}
            onCheckedChange={() => toggle(s.userId)}
          />
          <Label htmlFor={`staff-${s.userId}`} className="cursor-pointer">
            {s.user?.name || 'Unknown'}
          </Label>
        </div>
      ))}
    </div>
  );
}
