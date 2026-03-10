'use client';

import { useMemo } from 'react';
import { AlertCircle, Package } from 'lucide-react';

import { DataTable, EmptyState } from '@/components/common';

import { getStockColumns } from './stock-columns';

import type { StockSummary } from '@/types/inventory';
import type { PaginationMeta } from '@/types/api';

// ============================================
// Types
// ============================================

interface StockTableProps {
  data: StockSummary[];
  meta?: PaginationMeta;
  isLoading: boolean;
  error?: Error | null;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  hasFilters: boolean;
}

// ============================================
// Component
// ============================================

export function StockTable({
  data,
  meta,
  isLoading,
  error,
  page,
  onPageChange,
  onPageSizeChange,
  hasFilters,
}: StockTableProps) {
  const columns = useMemo(() => getStockColumns(), []);

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Error loading stock"
        description="There was an error loading the stock summary. Please try again."
      />
    );
  }

  const emptyState = (
    <EmptyState
      icon={Package}
      title="No stock found"
      description={
        hasFilters ? 'No stock matches your filters.' : 'No stock data available for this branch.'
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
