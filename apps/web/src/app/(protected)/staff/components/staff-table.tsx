'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import { Plus, UserCog } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { DataTable, EmptyState } from '@/components/common';
import { Button } from '@/components/ui/button';

import { getStaffColumns } from './staff-columns';

import type { StaffProfile } from '@/types/staff';
import type { PaginationMeta } from '@/types/api';

// ============================================
// Types
// ============================================

interface StaffTableProps {
  data: StaffProfile[];
  meta?: PaginationMeta;
  isLoading: boolean;
  error?: Error | null;
  canWrite: boolean;
  page: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onEdit: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
  hasFilters: boolean;
}

// ============================================
// Component
// ============================================

export function StaffTable({
  data,
  meta,
  isLoading,
  error,
  canWrite,
  page,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onToggleStatus,
  hasFilters,
}: StaffTableProps) {
  const t = useTranslations('staff');
  const tCommon = useTranslations('common');
  const columns = useMemo(
    () => getStaffColumns({ canWrite, onEdit, onToggleStatus }),
    [canWrite, onEdit, onToggleStatus]
  );

  if (error) {
    return (
      <EmptyState icon={UserCog} title={tCommon('status.error')} description={error.message} />
    );
  }

  const emptyState = (
    <EmptyState
      icon={UserCog}
      title={t('noStaff')}
      description={hasFilters ? t('noStaffFiltered') : t('noStaffEmpty')}
      action={
        !hasFilters ? (
          <Button asChild>
            <Link href="/staff/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('addStaff')}
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
