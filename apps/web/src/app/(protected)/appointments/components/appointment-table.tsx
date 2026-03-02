'use client';

import { useMemo } from 'react';
import { Calendar, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { addDays, subDays, isToday } from 'date-fns';

import { DataTable, EmptyState, DatePicker, SearchInput } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

import { getAppointmentColumns } from './appointment-columns';

import type { Appointment } from '@/types/appointments';
import type { PaginationMeta } from '@/types/api';

interface AppointmentTableProps {
  data: Appointment[];
  meta?: PaginationMeta;
  isLoading: boolean;
  canWrite: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onView: (id: string) => void;
  onCheckIn: (id: string) => void;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onNoShow: (id: string) => void;
  onCheckout?: (id: string) => void;
  hasFilters: boolean;
  // Filter button
  onFilterClick?: () => void;
  hasActiveFilters?: boolean;
  // Single date with arrows and DatePicker
  selectedDate?: Date;
  onDateChange?: (date: Date) => void;
  // Search
  search?: string;
  onSearchChange?: (value: string) => void;
}

export function AppointmentTable({
  data,
  meta,
  isLoading,
  canWrite,
  page,
  onPageChange,
  onPageSizeChange,
  onView,
  onCheckIn,
  onStart,
  onComplete,
  onCancel,
  onNoShow,
  onCheckout,
  hasFilters,
  onFilterClick,
  hasActiveFilters,
  selectedDate,
  onDateChange,
  search,
  onSearchChange,
}: AppointmentTableProps) {
  const t = useTranslations('appointments.list');

  const columns = useMemo(
    () =>
      getAppointmentColumns({
        canWrite,
        onView,
        onCheckIn,
        onStart,
        onComplete,
        onCancel,
        onNoShow,
        onCheckout,
      }),
    [canWrite, onView, onCheckIn, onStart, onComplete, onCancel, onNoShow, onCheckout]
  );

  const emptyState = (
    <EmptyState
      icon={Calendar}
      title={t('noAppointments')}
      description={hasFilters ? t('noAppointmentsFiltered') : t('noAppointmentsEmpty')}
    />
  );

  const handlePrevDay = () => {
    if (selectedDate && onDateChange) {
      onDateChange(subDays(selectedDate, 1));
    }
  };

  const handleNextDay = () => {
    if (selectedDate && onDateChange) {
      onDateChange(addDays(selectedDate, 1));
    }
  };

  const handleToday = () => {
    if (onDateChange) {
      onDateChange(new Date());
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Row: Search | Date Navigation | Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Date Navigation with arrows and clickable DatePicker */}
          {selectedDate && onDateChange && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" onClick={handlePrevDay} className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <DatePicker
                value={selectedDate}
                onChange={(date) => date && onDateChange(date)}
                className="w-[180px]"
              />
              <Button variant="outline" size="icon" onClick={handleNextDay} className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isToday(selectedDate) && (
                <Button variant="ghost" size="sm" onClick={handleToday} className="h-8">
                  Today
                </Button>
              )}
            </div>
          )}
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
            <Button variant="outline" size="sm" onClick={onFilterClick} className="gap-2 h-8">
              <Filter className="h-4 w-4" />
              <span className="hidden sm:inline">Filters</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  Active
                </Badge>
              )}
            </Button>
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
      />
    </div>
  );
}
