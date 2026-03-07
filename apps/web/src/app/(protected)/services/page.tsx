'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PERMISSIONS } from '@salon-ops/shared';

import { useCategories } from '@/hooks/queries/use-categories';
import {
  useDeleteService,
  useDuplicateService,
  useServicesPaginated,
} from '@/hooks/queries/use-services';
import { usePermissions } from '@/hooks/use-permissions';

import {
  AccessDenied,
  ConfirmDialog,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
  SearchInput,
} from '@/components/common';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { ServiceTable } from './components/service-table';

import type { ServiceFilters } from '@/types/services';

export default function ServicesPage() {
  const router = useRouter();
  const t = useTranslations('services');
  const tCommon = useTranslations('common');
  const tNav = useTranslations('navigation');
  const { hasPermission } = usePermissions();

  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('all');
  const [isActiveFilter, setIsActiveFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filters: ServiceFilters = {
    page,
    limit,
    search: search || undefined,
    categoryId: categoryId !== 'all' ? categoryId : undefined,
    isActive: isActiveFilter === 'all' ? undefined : isActiveFilter === 'active',
    sortBy: 'displayOrder',
    sortOrder: 'asc',
  };

  const { data: servicesData, isLoading, error } = useServicesPaginated(filters);
  const { data: categories } = useCategories({ flat: true });
  const deleteService = useDeleteService();
  const duplicateService = useDuplicateService();

  const canWrite = hasPermission(PERMISSIONS.SERVICES_WRITE);

  const hasFilters = !!search || categoryId !== 'all' || isActiveFilter !== 'all';

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleView = useCallback(
    (id: string) => {
      router.push(`/services/${id}`);
    },
    [router]
  );

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/services/${id}?edit=true`);
    },
    [router]
  );

  const handleDuplicate = useCallback(
    async (id: string) => {
      await duplicateService.mutateAsync(id);
    },
    [duplicateService]
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
              <Button variant="outline" asChild>
                <Link href="/services/categories">{tNav('categories')}</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/services/combos">{tNav('combos')}</Link>
              </Button>
              {canWrite && (
                <Button asChild>
                  <Link href="/services/new">
                    <Plus className="mr-2 h-4 w-4" />
                    {t('list.addService')}
                  </Link>
                </Button>
              )}
            </div>
          }
        />

        <PageContent>
          {/* Filters */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 flex-shrink-0">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('list.searchPlaceholder')}
              className="flex-1 max-w-sm"
            />

            <div className="flex flex-wrap gap-2">
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder={t('filters.allCategories')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allCategories')}</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: cat.color }}
                        />
                        {cat.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={isActiveFilter} onValueChange={setIsActiveFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder={t('filters.allStatus')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allStatus')}</SelectItem>
                  <SelectItem value="active">{t('filters.active')}</SelectItem>
                  <SelectItem value="inactive">{t('filters.inactive')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
            onView={handleView}
            onEdit={handleEdit}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            hasFilters={hasFilters}
          />
        </PageContent>

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
