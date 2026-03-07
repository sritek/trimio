'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PERMISSIONS } from '@salon-ops/shared';

import {
  useCustomTags,
  useCustomersPaginated,
  useDeleteCustomer,
} from '@/hooks/queries/use-customers';
import { useDebounce } from '@/hooks/use-debounce';
import { usePermissions } from '@/hooks/use-permissions';

import {
  AccessDenied,
  ConfirmDialog,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
} from '@/components/common';
import { Button } from '@/components/ui/button';

import { CustomerFilters, type CustomerFiltersState } from './components/customer-filters';
import { CustomerTable } from './components/customer-table';

import type { BookingStatus, CustomerFilters as CustomerFiltersType } from '@/types/customers';

export default function CustomersPage() {
  const t = useTranslations('customers.list');
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(PERMISSIONS.CUSTOMERS_WRITE);

  // Filter state
  const [filters, setFilters] = useState<CustomerFiltersState>({
    search: '',
    tag: 'all',
    status: 'all',
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(filters.search, 300);

  // Build query filters
  const queryFilters: CustomerFiltersType = {
    page,
    limit,
    search: debouncedSearch || undefined,
    tags: filters.tag !== 'all' ? filters.tag : undefined,
    bookingStatus: filters.status !== 'all' ? (filters.status as BookingStatus) : undefined,
    sortBy: 'name',
    sortOrder: 'asc',
  };

  // Queries
  const { data: customersData, isLoading } = useCustomersPaginated(queryFilters);
  const { data: customTags } = useCustomTags();
  const deleteCustomer = useDeleteCustomer();

  // Handlers
  const handleFiltersChange = useCallback((newFilters: CustomerFiltersState) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleDelete = useCallback((id: string) => {
    setDeleteId(id);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (deleteId) {
      await deleteCustomer.mutateAsync(deleteId);
      setDeleteId(null);
    }
  }, [deleteId, deleteCustomer]);

  const hasFilters = filters.search !== '' || filters.tag !== 'all' || filters.status !== 'all';

  return (
    <PermissionGuard permission={PERMISSIONS.CUSTOMERS_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={t('title')}
          description={t('description')}
          actions={
            canWrite && (
              <Button asChild>
                <Link href="/customers/new">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('addCustomer')}
                </Link>
              </Button>
            )
          }
        />

        <PageContent>
          <div className="flex-shrink-0 mb-4">
            <CustomerFilters
              filters={filters}
              onFiltersChange={handleFiltersChange}
              customTags={customTags}
            />
          </div>

          <CustomerTable
            data={customersData?.data || []}
            meta={customersData?.meta}
            isLoading={isLoading}
            canWrite={canWrite}
            page={page}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onDelete={handleDelete}
            hasFilters={hasFilters}
          />
        </PageContent>

        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          title={t('confirmDeleteTitle')}
          description={t('confirmDeleteDescription')}
          variant="destructive"
          onConfirm={confirmDelete}
          isLoading={deleteCustomer.isPending}
        />
      </PageContainer>
    </PermissionGuard>
  );
}
