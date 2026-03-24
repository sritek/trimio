'use client';

/**
 * Staff Filter Sheet
 * Filter panel for staff list with role, employment type, and status filters
 */

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';

import { FilterSheet } from '@/components/common';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

const ROLES = ['branch_manager', 'receptionist', 'stylist', 'accountant'] as const;
const EMPLOYMENT_TYPES = ['full_time', 'part_time', 'contract', 'intern'] as const;

export interface StaffFiltersState {
  role: string;
  employmentType: string;
  isActive: string;
}

interface StaffFilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: StaffFiltersState;
  onFiltersChange: (filters: StaffFiltersState) => void;
}

export function StaffFilterSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: StaffFilterSheetProps) {
  const t = useTranslations('staff');
  const tCommon = useTranslations('common');

  // Local state for editing - only applied when user clicks Apply
  const [localFilters, setLocalFilters] = useState<StaffFiltersState>(filters);

  // Sync local state when sheet opens
  useEffect(() => {
    if (open) {
      setLocalFilters(filters);
    }
  }, [open, filters]);

  const handleRoleChange = (role: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      role: prev.role === role ? 'all' : role,
    }));
  };

  const handleTypeChange = (type: string) => {
    setLocalFilters((prev) => ({
      ...prev,
      employmentType: prev.employmentType === type ? 'all' : type,
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
    const resetFilters: StaffFiltersState = {
      role: 'all',
      employmentType: 'all',
      isActive: 'all',
    };
    setLocalFilters(resetFilters);
    onFiltersChange(resetFilters);
  };

  // Count active filters
  const activeFilterCount =
    (localFilters.role !== 'all' ? 1 : 0) +
    (localFilters.employmentType !== 'all' ? 1 : 0) +
    (localFilters.isActive !== 'all' ? 1 : 0);

  return (
    <FilterSheet
      open={open}
      onOpenChange={onOpenChange}
      title={t('filters.title')}
      activeFilterCount={activeFilterCount}
      onApply={handleApply}
      onReset={handleReset}
    >
      {/* Role Filter */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          {t('fields.role')}
          {localFilters.role !== 'all' && (
            <span className="ml-2 text-xs text-muted-foreground">(1 selected)</span>
          )}
        </Label>
        <div className="space-y-2">
          {ROLES.map((role) => (
            <div key={role} className="flex items-center space-x-2">
              <Checkbox
                id={`role-${role}`}
                checked={localFilters.role === role}
                onCheckedChange={() => handleRoleChange(role)}
              />
              <Label htmlFor={`role-${role}`} className="cursor-pointer">
                {t(`roles.${role}`)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Employment Type Filter */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          {t('fields.employmentType')}
          {localFilters.employmentType !== 'all' && (
            <span className="ml-2 text-xs text-muted-foreground">(1 selected)</span>
          )}
        </Label>
        <div className="space-y-2">
          {EMPLOYMENT_TYPES.map((type) => (
            <div key={type} className="flex items-center space-x-2">
              <Checkbox
                id={`type-${type}`}
                checked={localFilters.employmentType === type}
                onCheckedChange={() => handleTypeChange(type)}
              />
              <Label htmlFor={`type-${type}`} className="cursor-pointer">
                {t(`employmentTypes.${type}`)}
              </Label>
            </div>
          ))}
        </div>
      </div>

      {/* Status Filter */}
      <div>
        <Label className="text-sm font-medium mb-3 block">
          {t('fields.status')}
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
              {tCommon('status.active')}
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="status-inactive"
              checked={localFilters.isActive === 'inactive'}
              onCheckedChange={() => handleStatusChange('inactive')}
            />
            <Label htmlFor="status-inactive" className="cursor-pointer">
              {tCommon('status.inactive')}
            </Label>
          </div>
        </div>
      </div>
    </FilterSheet>
  );
}
