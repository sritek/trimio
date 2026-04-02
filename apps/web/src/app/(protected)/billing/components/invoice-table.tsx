'use client';

import { useMemo } from 'react';
import { FileText, Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DataTable, EmptyState } from '@/components/common';
import { Button } from '@/components/ui/button';

import { getInvoiceColumns } from './invoice-columns';

import type { Invoice } from '@/types/billing';
import type { PaginationMeta } from '@/types/api';

// ============================================
// Types
// ============================================

interface InvoiceTableProps {
  data: Invoice[];
  meta?: PaginationMeta;
  isLoading: boolean;
  canWrite: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onQuickView: (id: string) => void;
  onCreateNew: () => void;
  hasFilters: boolean;
}

// ============================================
// Component
// ============================================

export function InvoiceTable({
  data,
  meta,
  isLoading,
  canWrite,
  page,
  onPageChange,
  onPageSizeChange,
  onQuickView,
  onCreateNew,
  hasFilters,
}: InvoiceTableProps) {
  const t = useTranslations('billing');
  const columns = useMemo(() => getInvoiceColumns({ onQuickView }), [onQuickView]);

  const emptyState = (
    <EmptyState
      icon={FileText}
      title={t('empty.title')}
      description={hasFilters ? t('empty.filtered') : t('empty.description')}
      action={
        canWrite && !hasFilters ? (
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            {t('newInvoice')}
          </Button>
        ) : undefined
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
