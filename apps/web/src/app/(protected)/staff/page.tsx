'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';

import { PERMISSIONS } from '@trimio/shared';

import { useStaffList, useDeactivateStaff } from '@/hooks/queries/use-staff';
import { usePermissions } from '@/hooks/use-permissions';
import { useUserLimitStatus } from '@/hooks/use-limit-status';

import {
  AccessDenied,
  ConfirmDialog,
  FilterButton,
  LimitBanner,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
  SearchInput,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { StaffTable } from './components/staff-table';
import { StaffFilterSheet, type StaffFiltersState } from './components/staff-filter-sheet';

export default function StaffPage() {
  const router = useRouter();
  const t = useTranslations('staff');
  const tCommon = useTranslations('common');
  const { hasPermission } = usePermissions();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<StaffFiltersState>({
    role: 'all',
    employmentType: 'all',
    isActive: 'all',
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const { data, isLoading, error } = useStaffList({
    page,
    limit,
    search: search || undefined,
    role: filters.role !== 'all' ? filters.role : undefined,
    isActive: filters.isActive === 'all' ? undefined : filters.isActive === 'active',
    employmentType: filters.employmentType !== 'all' ? filters.employmentType : undefined,
  });

  const deactivateStaff = useDeactivateStaff();
  const canWrite = hasPermission(PERMISSIONS.USERS_WRITE);
  const { current: userCount, limit: userLimit, isAtLimit, isNearLimit } = useUserLimitStatus();

  const hasFilters =
    !!search ||
    filters.role !== 'all' ||
    filters.employmentType !== 'all' ||
    filters.isActive !== 'all';

  const activeFilterCount =
    (filters.role !== 'all' ? 1 : 0) +
    (filters.employmentType !== 'all' ? 1 : 0) +
    (filters.isActive !== 'all' ? 1 : 0);

  const handleFiltersChange = useCallback((newFilters: StaffFiltersState) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/staff/${id}/edit`);
    },
    [router]
  );

  const handleDelete = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteId) {
      await deactivateStaff.mutateAsync(deleteId);
      setDeleteId(null);
    }
  }, [deleteId, deactivateStaff]);

  return (
    <PermissionGuard permission={PERMISSIONS.USERS_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={t('title')}
          description={t('description')}
          actions={
            canWrite && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button
                        disabled={isLoading || isAtLimit}
                        isLoading={isLoading}
                        onClick={() => {
                          !isAtLimit && router.push('/staff/new');
                        }}
                        leftIcon={<Plus className="mr-2 h-4 w-4" />}
                      >
                        {t('addStaff')}
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {isAtLimit && (
                    <TooltipContent>
                      <p>User limit reached. Upgrade your plan to add more staff.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </TooltipProvider>
            )
          }
        />

        <PageContent>
          {/* Limit Banner */}
          {(isAtLimit || isNearLimit) && (
            <LimitBanner type="users" current={userCount} limit={userLimit} className="mb-4" />
          )}
          {/* Search and Filter */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 flex-shrink-0">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('searchPlaceholder')}
              className="flex-1 max-w-sm"
            />

            <FilterButton onClick={() => setFilterOpen(true)} activeCount={activeFilterCount} />
          </div>

          {/* Table */}
          <StaffTable
            data={data?.data ?? []}
            meta={data?.meta}
            isLoading={isLoading}
            error={error}
            canWrite={canWrite}
            page={page}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
            hasFilters={hasFilters}
          />
        </PageContent>

        {/* Filter Sheet */}
        <StaffFilterSheet
          open={filterOpen}
          onOpenChange={setFilterOpen}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />

        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          title={tCommon('confirmDelete.title')}
          description={tCommon('confirmDelete.description')}
          variant="destructive"
          onConfirm={confirmDelete}
          isLoading={deactivateStaff.isPending}
        />
      </PageContainer>
    </PermissionGuard>
  );
}
