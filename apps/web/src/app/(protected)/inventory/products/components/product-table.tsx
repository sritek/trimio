'use client';

import { useMemo } from 'react';
import { AlertCircle, Package, Plus } from 'lucide-react';

import { DataTable, EmptyState } from '@/components/common';
import { Button } from '@/components/ui/button';

import { getProductColumns } from './product-columns';

import type { Product } from '@/types/inventory';
import type { PaginationMeta } from '@/types/api';

// ============================================
// Types
// ============================================

interface ProductTableProps {
  data: Product[];
  meta?: PaginationMeta;
  isLoading: boolean;
  error?: Error | null;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onView: (id: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (id: string) => void;
  onCreateNew: () => void;
  hasFilters: boolean;
}

// ============================================
// Component
// ============================================

export function ProductTable({
  data,
  meta,
  isLoading,
  error,
  page,
  onPageChange,
  onPageSizeChange,
  onView,
  onEdit,
  onDelete,
  onCreateNew,
  hasFilters,
}: ProductTableProps) {
  const columns = useMemo(
    () => getProductColumns({ onView, onEdit, onDelete }),
    [onView, onEdit, onDelete]
  );

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Error loading products"
        description="There was an error loading the products. Please try again."
      />
    );
  }

  const emptyState = (
    <EmptyState
      icon={Package}
      title="No products"
      description={
        hasFilters ? 'No products match your filters.' : 'Create your first product to get started.'
      }
      action={
        !hasFilters ? (
          <Button onClick={onCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
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
