'use client';

import { useMemo } from 'react';
import { Calendar } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DataTable, EmptyState, SearchInput, FilterButton } from '@/components/common';

import { getAppointmentColumns } from './appointment-columns';

import type { Appointment } from '@/types/appointments';
import type { PaginationMeta } from '@/types/api';

interface AppointmentTableProps {
  data: Appointment[];
  meta?: PaginationMeta;
  isLoading: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onView: (id: string) => void;
  hasFilters: boolean;
  // Filter button
  onFilterClick?: () => void;
  activeFilterCount?: number;
  // Search
  search?: string;
  onSearchChange?: (value: string) => void;
}

export function AppointmentTable({
  data,
  meta,
  isLoading,
  page,
  onPageChange,
  onPageSizeChange,
  onView,
  hasFilters,
  onFilterClick,
  activeFilterCount = 0,
  search,
  onSearchChange,
}: AppointmentTableProps) {
  const t = useTranslations('appointments.list');

  const columns = useMemo(
    () =>
      getAppointmentColumns({
        onView,
      }),
    [onView]
  );

  const emptyState = (
    <EmptyState
      icon={Calendar}
      title={t('noAppointments')}
      description={hasFilters ? t('noAppointmentsFiltered') : t('noAppointmentsEmpty')}
    />
  );

  return (
    <div className="flex flex-col flex-1 min-h-0 space-y-4">
      {/* Header Row: Search | Date Navigation | Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Left side: Search */}
          {onSearchChange !== undefined && (
            <SearchInput
              value={search || ''}
              onChange={onSearchChange}
              placeholder={t('searchPlaceholder')}
              className="w-full sm:w-80"
            />
          )}
        </div>

        {/* Right side: Date Navigation + Filters */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
          {/* Filter Button */}
          {onFilterClick && (
            <FilterButton onClick={onFilterClick} activeCount={activeFilterCount} />
          )}
        </div>
      </div>

      <DataTable
        columns={columns}
        data={data}
        isLoading={isLoading}
        loadingRows={5}
        emptyState={emptyState}
        pagination={
          meta
            ? {
                page,
                limit: meta.limit,
                total: meta.total,
                totalPages: meta.totalPages,
              }
            : undefined
        }
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        className="flex-1"
      />
    </div>
  );
}
