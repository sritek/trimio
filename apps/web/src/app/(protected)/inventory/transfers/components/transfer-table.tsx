'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AlertCircle, Plus, Truck } from 'lucide-react';

import { DataTable, EmptyState } from '@/components/common';
import { Button } from '@/components/ui/button';

import { getTransferColumns } from './transfer-columns';

import type { StockTransfer } from '@/types/inventory';
import type { PaginationMeta } from '@/types/api';

// ============================================
// Types
// ============================================

interface TransferTableProps {
  data: StockTransfer[];
  meta?: PaginationMeta;
  isLoading: boolean;
  error?: Error | null;
  activeTab: 'outgoing' | 'incoming';
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onView: (id: string) => void;
  hasFilters: boolean;
}

// ============================================
// Component
// ============================================

export function TransferTable({
  data,
  meta,
  isLoading,
  error,
  activeTab,
  page,
  onPageChange,
  onPageSizeChange,
  onView,
  hasFilters,
}: TransferTableProps) {
  const columns = useMemo(() => getTransferColumns({ activeTab, onView }), [activeTab, onView]);

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Error loading transfers"
        description="There was an error loading the transfers. Please try again."
      />
    );
  }

  const emptyState = (
    <EmptyState
      icon={Truck}
      title="No transfers"
      description={
        hasFilters
          ? 'No transfers match your filters.'
          : activeTab === 'outgoing'
            ? 'No outgoing transfers from this branch.'
            : 'No incoming transfers to this branch.'
      }
      action={
        !hasFilters && activeTab === 'outgoing' ? (
          <Button asChild>
            <Link href="/inventory/transfers/new">
              <Plus className="mr-2 h-4 w-4" />
              New Transfer
            </Link>
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
