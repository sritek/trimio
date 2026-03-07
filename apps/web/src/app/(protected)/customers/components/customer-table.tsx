'use client';

import { useMemo } from 'react';
import { Users } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DataTable, EmptyState } from '@/components/common';

import { getCustomerColumns } from './customer-columns';

import type { Customer } from '@/types/customers';
import type { PaginationMeta } from '@/types/api';

// ============================================
// Types
// ============================================

interface CustomerTableProps {
  data: Customer[];
  meta?: PaginationMeta;
  isLoading: boolean;
  canWrite: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onDelete: (id: string) => void;
  hasFilters: boolean;
}

// ============================================
// Component
// ============================================

export function CustomerTable({
  data,
  meta,
  isLoading,
  canWrite,
  page,
  onPageChange,
  onPageSizeChange,
  onDelete,
  hasFilters,
}: CustomerTableProps) {
  const t = useTranslations('customers.list');
  const columns = useMemo(() => getCustomerColumns({ canWrite, onDelete }), [canWrite, onDelete]);

  const emptyState = (
    <EmptyState
      icon={Users}
      title={t('noCustomers')}
      description={hasFilters ? t('noCustomersFiltered') : t('noCustomersEmpty')}
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
