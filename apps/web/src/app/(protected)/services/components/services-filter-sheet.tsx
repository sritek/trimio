'use client';

/**
 * Services Filter Sheet
 * Filter panel for services list with category and status filters
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { FilterSheet } from '@/components/common';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useCategories } from '@/hooks/queries/use-categories';

export interface ServicesFiltersState {
  categoryId: string;
  isActive: string;
}

interface ServicesFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: ServicesFiltersState;
  onFiltersChange: (filters: ServicesFiltersState) => void;
}

export function ServicesFilterSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: ServicesFilterSheetProps) {
  const t = useTranslations('services');
  const { data: categories } = useCategories({ flat: true });

  // Local state for editing - only applied when user clicks Apply
  const [localFilters, setLocalFilters] = useState<ServicesFiltersState>(filters);

  // Sync local state when sheet opens
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const handleCategoryChange = (categoryId: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      categoryId: prev.categoryId === categoryId ? 'all' : categoryId,
    }));
  };

  const handleStatusChange = (status: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      isActive: prev.isActive === status ? 'all' : status,
    }));
  };

  const handleApply = () => {
    onFiltersChange(localFilters);
  };

  const handleReset = () => {
    const resetFilters: ServicesFiltersState = {
      categoryId: 'all',
      isActive: 'all',
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  // Count active filters
  const activeFilterCount =
    (localFilters.categoryId !== 'all' ? 1 : 0) + (localFilters.isActive !== 'all' ? 1 : 0);

  return (
    <FilterSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('filters.title')}
      activeFilterCount={activeFilterCount}
      onApply={handleApply}
      onReset={handleReset}
    >
      {/* Category Filter */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          {t('filters.category')}
          {localFilters.categoryId !== 'all' && (
            <span className="ml-2 text-xs text-muted-foreground">(1 selected)</span>
          )}
        </Label>
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {categories?.map((category) => (
            <div key={category.id} className="flex items-center space-x-2">
              <Checkbox
                id={`category-${category.id}`}
                checked={localFilters.categoryId === category.id}
                onCheckedChange={() => handleCategoryChange(category.id)}
              />
              <Label
                htmlFor={`category-${category.id}`}
                className="flex items-center gap-2 cursor-pointer"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                {category.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          {t('filters.status')}
          {localFilters.isActive !== 'all' && (
            <span className="ml-2 text-xs text-muted-foreground">(1 selected)</span>
          )}
        </Label>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="status-active"
              checked={localFilters.isActive === 'active'}
              onCheckedChange={() => handleStatusChange('active')}
            />
            <Label htmlFor="status-active" className="cursor-pointer">
              {t('filters.active')}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="status-inactive"
              checked={localFilters.isActive === 'inactive'}
              onCheckedChange={() => handleStatusChange('inactive')}
            />
            <Label htmlFor="status-inactive" className="cursor-pointer">
              {t('filters.inactive')}
            </Label>
          </div>
        </div>
      </div>
    </FilterSheet>
  );
}
