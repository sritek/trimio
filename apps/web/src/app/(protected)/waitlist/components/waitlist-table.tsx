'use client';

import { useMemo } from 'react';
import { ClipboardList } from 'lucide-react';

import { DataTable, EmptyState } from '@/components/common';

import { getWaitlistColumns } from './waitlist-columns';

import type { WaitlistEntry } from '@/types/waitlist';
import type { PaginationMeta } from '@/types/api';

// ============================================
// Types
// ============================================

interface WaitlistTableProps {
  data: WaitlistEntry[];
  meta?: PaginationMeta;
  isLoading: boolean;
  canWrite: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onCreateAppointment: (entry: WaitlistEntry) => void;
  onDelete: (id: string) => void;
  hasFilters: boolean;
}

// ============================================
// Component
// ============================================

export function WaitlistTable({
  data,
  meta,
  isLoading,
  canWrite,
  page,
  onPageChange,
  onPageSizeChange,
  onCreateAppointment,
  onDelete,
  hasFilters,
}: WaitlistTableProps) {
  const columns = useMemo(
    () => getWaitlistColumns({ canWrite, onCreateAppointment, onDelete }),
    [canWrite, onCreateAppointment, onDelete]
  );

  const emptyState = (
    <EmptyState
      icon={ClipboardList}
      title="No waitlist entries"
      description={
        hasFilters
          ? 'No entries match your filters. Try adjusting your search criteria.'
          : 'The waitlist is empty. Add customers who want to be notified when slots open.'
      }
    />
  );

  return (
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
  );
}
