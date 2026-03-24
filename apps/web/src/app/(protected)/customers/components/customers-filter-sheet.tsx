'use client';

/**
 * Customers Filter Sheet
 * Filter panel for customers list with tag and booking status filters
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { FilterSheet } from '@/components/common';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

import type { BookingStatus, CustomTag } from '@/types/customers';

// System tags that are always available
const SYSTEM_TAGS = ['New', 'Regular', 'VIP', 'Inactive'];

// Booking status options
const BOOKING_STATUSES: { value: BookingStatus; labelKey: string }[] = [
  { value: 'normal', labelKey: 'normal' },
  { value: 'prepaid_only', labelKey: 'prepaidOnly' },
  { value: 'blocked', labelKey: 'blocked' },
];

export interface CustomersFiltersState {
  tag: string;
  status: string;
}

interface CustomersFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: CustomersFiltersState;
  onFiltersChange: (filters: CustomersFiltersState) => void;
  customTags?: CustomTag[];
}

export function CustomersFilterSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
  customTags = [],
}: CustomersFilterSheetProps) {
  const t = useTranslations('customers');

  // Combine system tags with custom tags
  const allTags = [...SYSTEM_TAGS, ...customTags.map((tag) => tag.name)];

  // Local state for editing - only applied when user clicks Apply
  const [localFilters, setLocalFilters] = useState<CustomersFiltersState>(filters);

  // Sync local state when sheet opens
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const handleTagChange = (tag: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      tag: prev.tag === tag ? 'all' : tag,
    }));
  };

  const handleStatusChange = (status: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      status: prev.status === status ? 'all' : status,
    }));
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
  };

  const handleReset = () => {
    const resetFilters: CustomersFiltersState = {
      tag: 'all',
      status: 'all',
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  // Count active filters
  const activeFilterCount =
    (localFilters.tag !== 'all' ? 1 : 0) + (localFilters.status !== 'all' ? 1 : 0);

  return (
    <FilterSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('filters.title')}
      activeFilterCount={activeFilterCount}
      onApply={handleApply}
      onReset={handleReset}
    >
      {/* Tag Filter */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          {t('filters.tag')}
          {localFilters.tag !== 'all' && (
            <span className="ml-2 text-xs text-muted-foreground">(1 selected)</span>
          )}
        </Label>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {allTags.map((tag) => (
            <div key={tag} className="flex items-center space-x-2">
              <Checkbox
                id={`tag-${tag}`}
                checked={localFilters.tag === tag}
                onCheckedChange={() => handleTagChange(tag)}
              />
              <Label htmlFor={`tag-${tag}`} className="cursor-pointer">
                {tag}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Booking Status Filter */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          {t('filters.bookingStatus')}
          {localFilters.status !== 'all' && (
            <span className="ml-2 text-xs text-muted-foreground">(1 selected)</span>
          )}
        </Label>
        <div className="space-y-2">
          {BOOKING_STATUSES.map((option) => (
            <div key={option.value} className="flex items-center space-x-2">
              <Checkbox
                id={`status-${option.value}`}
                checked={localFilters.status === option.value}
                onCheckedChange={() => handleStatusChange(option.value)}
              />
              <Label htmlFor={`status-${option.value}`} className="cursor-pointer">
                {t(`filters.${option.labelKey}`)}
              </Label>
            </div>
          ))}
        </div>
      </div>
    </FilterSheet>
  );
}
