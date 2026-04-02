'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { AlertCircle, Plus, Scissors } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DataTable, EmptyState } from '@/components/common';
import { Button } from '@/components/ui/button';

import { getServiceColumns } from './service-columns';

import type { Service } from '@/types/services';
import type { PaginationMeta } from '@/types/api';

// ============================================
// Types
// ============================================

interface ServiceTableProps {
  data: Service[];
  meta?: PaginationMeta;
  isLoading: boolean;
  error?: Error | null;
  canWrite: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  hasFilters: boolean;
}

// ============================================
// Component
// ============================================

export function ServiceTable({
  data,
  meta,
  isLoading,
  error,
  canWrite,
  page,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onDelete,
  hasFilters,
}: ServiceTableProps) {
  const t = useTranslations('services');

  const columns = useMemo(
    () => getServiceColumns({ canWrite, onEdit, onDelete }),
    [canWrite, onEdit, onDelete]
  );

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title={t('detail.errorLoading')}
        description={t('detail.errorLoadingDesc')}
      />
    );
  }

  const emptyState = (
    <EmptyState
      icon={Scissors}
      title={t('list.noServices')}
      description={hasFilters ? t('list.noServicesFiltered') : t('list.noServicesEmpty')}
      action={
        canWrite && !hasFilters ? (
          <Button asChild>
            <Link href="/services/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('list.addService')}
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
