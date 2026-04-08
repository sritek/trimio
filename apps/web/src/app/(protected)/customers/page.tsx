'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PERMISSIONS } from '@trimio/shared';

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
  FilterButton,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
  SearchInput,
} from '@/components/common';
import { Button } from '@/components/ui/button';

import { CustomerTable } from './components/customer-table';
import {
  CustomersFilterSheet,
  type CustomersFiltersState,
} from './components/customers-filter-sheet';

import type { BookingStatus, CustomerFilters as CustomerFiltersType } from '@/types/customers';

export default function CustomersPage() {
  const router = useRouter();
  const t = useTranslations('customers.list');
  const tCommon = useTranslations('common');
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(PERMISSIONS.CUSTOMERS_WRITE);

  // Search state (separate from filters for debouncing)
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);

  // Filter state
  const [filters, setFilters] = useState<CustomersFiltersState>({
    tag: 'all',
    status: 'all',
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  // Calculate active filter count and hasFilters
  const hasFilters = !!search || filters.tag !== 'all' || filters.status !== 'all';
  const activeFilterCount = (filters.tag !== 'all' ? 1 : 0) + (filters.status !== 'all' ? 1 : 0);

  // Handlers
  const handleFiltersChange = useCallback((newFilters: CustomersFiltersState) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
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

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/customers/${id}?edit=true`);
    },
    [router]
  );

  const confirmDelete = useCallback(async () => {
    if (deleteId) {
      await deleteCustomer.mutateAsync(deleteId);
      setDeleteId(null);
    }
  }, [deleteId, deleteCustomer]);

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
          {/* Search and Filter */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 flex-shrink-0">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder={t('searchPlaceholder')}
              className="flex-1 max-w-sm"
            />

            <FilterButton onClick={() => setFilterOpen(true)} activeCount={activeFilterCount} />
          </div>

          {/* Table */}
          <CustomerTable
            data={customersData?.data || []}
            meta={customersData?.meta}
            isLoading={isLoading}
            canWrite={canWrite}
            page={page}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onEdit={handleEdit}
            onDelete={handleDelete}
            hasFilters={hasFilters}
          />
        </PageContent>

        {/* Filter Sheet */}
        <CustomersFilterSheet
          open={filterOpen}
          onOpenChange={setFilterOpen}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          customTags={customTags}
        />

        <ConfirmDialog
          open={!!deleteId}
          onOpenChange={(open) => !open && setDeleteId(null)}
          title={tCommon('confirmDelete.title')}
          description={tCommon('confirmDelete.description')}
          variant="destructive"
          onConfirm={confirmDelete}
          isLoading={deleteCustomer.isPending}
        />
      </PageContainer>
    </PermissionGuard>
  );
}
