'use client';

import { useMemo } from 'react';
import { AlertCircle, Plus, Users } from 'lucide-react';

import { DataTable, EmptyState } from '@/components/common';
import { Button } from '@/components/ui/button';

import { getVendorColumns } from './vendor-columns';

import type { Vendor } from '@/types/inventory';
import type { PaginationMeta } from '@/types/api';

// ============================================
// Types
// ============================================

interface VendorTableProps {
  data: Vendor[];
  meta?: PaginationMeta;
  isLoading: boolean;
  error?: Error | null;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onViewProducts: (id: string) => void;
  onEdit: (vendor: Vendor) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
  hasFilters: boolean;
}

// ============================================
// Component
// ============================================

export function VendorTable({
  data,
  meta,
  isLoading,
  error,
  page,
  onPageChange,
  onPageSizeChange,
  onViewProducts,
  onEdit,
  onDelete,
  onCreateNew,
  hasFilters,
}: VendorTableProps) {
  const columns = useMemo(
    () => getVendorColumns({ onViewProducts, onEdit, onDelete }),
    [onViewProducts, onEdit, onDelete]
  );

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Error loading vendors"
        description="There was an error loading the vendors. Please try again."
      />
    );
  }

  const emptyState = (
    <EmptyState
      icon={Users}
      title="No vendors"
      description={
        hasFilters ? 'No vendors match your filters.' : 'Create your first vendor to get started.'
      }
      action={
        !hasFilters ? (
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Vendor
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
