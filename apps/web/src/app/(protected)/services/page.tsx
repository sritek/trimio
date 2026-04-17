'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PERMISSIONS } from '@trimio/shared';

import { useDeleteService, useServices } from '@/hooks/queries/use-services';
import { usePermissions } from '@/hooks/use-permissions';
import { useServiceLimitStatus } from '@/hooks/use-limit-status';

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

import { ServiceTable } from './components/service-table';
import { ServicesFilterSheet, type ServicesFiltersState } from './components/services-filter-sheet';

import type { ServiceFilters } from '@/types/services';

export default function ServicesPage() {
  const router = useRouter();
  const t = useTranslations('services');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('navigation');
  const { hasPermission } = usePermissions();

  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<ServicesFiltersState>({
    categoryId: 'all',
    isActive: 'all',
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const serviceFilters: ServiceFilters = {
    page,
    limit,
    search: search || undefined,
    categoryId: filters.categoryId !== 'all' ? filters.categoryId : undefined,
    isActive: filters.isActive === 'all' ? undefined : filters.isActive === 'active',
    sortBy: 'displayOrder',
    sortOrder: 'asc',
  };

  const { data: servicesData, isLoading, error } = useServices(serviceFilters);
  const deleteService = useDeleteService();

  const canWrite = hasPermission(PERMISSIONS.SERVICES_WRITE);
  const {
    current: serviceCount,
    limit: serviceLimit,
    isAtLimit,
    isNearLimit,
  } = useServiceLimitStatus();

  const hasFilters = !!search || filters.categoryId !== 'all' || filters.isActive !== 'all';
  const activeFilterCount =
    (filters.categoryId !== 'all' ? 1 : 0) + (filters.isActive !== 'all' ? 1 : 0);

  const handleFiltersChange = useCallback((newFilters: ServicesFiltersState) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/services/${id}?edit=true`);
    },
    [router]
  );

  const handleDelete = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteId) {
      await deleteService.mutateAsync(deleteId);
      setDeleteId(null);
    }
  }, [deleteId, deleteService]);

  return (
    <PermissionGuard permission={PERMISSIONS.SERVICES_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={t('list.title')}
          description={t('list.description')}
          actions={
            <div className="flex gap-2">
              {canWrite && (
                <Button variant="outline" asChild>
                  <Link href="/services/categories">{tNav('categories')}</Link>
                </Button>
              )}
              {canWrite && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button asChild={!isAtLimit} disabled={isAtLimit}>
                          {isAtLimit ? (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              {t('list.addService')}
                            </>
                          ) : (
                            <Link href="/services/new">
                              <Plus className="mr-2 h-4 w-4" />
                              {t('list.addService')}
                            </Link>
                          )}
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {isAtLimit && (
                      <TooltipContent>
                        <p>Service limit reached. Upgrade your plan to add more services.</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          }
        />

        <PageContent>
          {/* Limit Banner */}
          {(isAtLimit || isNearLimit) && (
            <LimitBanner
              type="services"
              current={serviceCount}
              limit={serviceLimit}
              className="mb-4"
            />
          )}
          {/* Search and Filter */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 flex-shrink-0">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('list.searchPlaceholder')}
              className="flex-1 max-w-sm"
            />

            <FilterButton onClick={() => setFilterOpen(true)} activeCount={activeFilterCount} />
          </div>

          {/* Table */}
          <ServiceTable
            data={servicesData?.data || []}
            meta={servicesData?.meta}
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
        <ServicesFilterSheet
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
          isLoading={deleteService.isPending}
        />
      </PageContainer>
    </PermissionGuard>
  );
}
