'use client';

/**
 * Billing Page - Invoices List
 * Displays invoices with filters following the appointments pattern
 */

import { useState, useCallback, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PERMISSIONS } from '@trimio/shared';

import { useInvoices } from '@/hooks/queries/use-invoices';
import { usePermissions } from '@/hooks/use-permissions';
import { useOpenPanel } from '@/components/ux/slide-over';

import {
  AccessDenied,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
  SearchInput,
  FilterButton,
} from '@/components/common';
import { Button } from '@/components/ui/button';

import { InvoiceTable, InvoiceFiltersSheet, type InvoiceFiltersState } from './components';

import type { InvoiceStatus, PaymentStatus } from '@/types/billing';

export default function BillingPage() {
  const t = useTranslations('billing');
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(PERMISSIONS.BILLS_WRITE);
  const { openNewInvoice, openInvoicePeek } = useOpenPanel();

  // State
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<InvoiceFiltersState>({
    dateFrom: '',
    dateTo: '',
    statuses: [],
    paymentStatuses: [],
    stylistIds: [],
  });

  // Build query params
  const queryParams = useMemo(
    () => ({
      search: search || undefined,
      status: filters.statuses.length === 1 ? (filters.statuses[0] as InvoiceStatus) : undefined,
      paymentStatus:
        filters.paymentStatuses.length === 1
          ? (filters.paymentStatuses[0] as PaymentStatus)
          : undefined,
      dateFrom: filters.dateFrom || undefined,
      dateTo: filters.dateTo || undefined,
      stylistId: filters.stylistIds.length === 1 ? filters.stylistIds[0] : undefined,
      page,
      limit,
      sortBy: 'createdAt' as const,
      sortOrder: 'desc' as const,
    }),
    [search, filters, page, limit]
  );

  const { data, isLoading } = useInvoices(queryParams);

  const invoices = data?.data || [];
  const meta = data?.meta;

  // Calculate active filter count
  const activeFilterCount =
    filters.statuses.length +
    filters.paymentStatuses.length +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.stylistIds.length > 0 ? 1 : 0);

  const hasFilters = activeFilterCount > 0 || !!search;

  // Handlers
  const handlePageSizeChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleQuickView = useCallback(
    (id: string) => {
      openInvoicePeek(id);
    },
    [openInvoicePeek]
  );

  const handleCreateNew = useCallback(() => {
    openNewInvoice();
  }, [openNewInvoice]);

  const handleFiltersChange = useCallback((newFilters: InvoiceFiltersState) => {
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  }, []);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    setPage(1); // Reset to first page when search changes
  }, []);

  return (
    <PermissionGuard permission={PERMISSIONS.BILLS_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title={t('title')}
          description={t('description')}
          actions={
            canWrite && (
              <Button onClick={handleCreateNew}>
                <Plus className="mr-2 h-4 w-4" />
                {t('newInvoice')}
              </Button>
            )
          }
        />

        <PageContent>
          {/* Filters Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 flex-shrink-0">
            {/* Left side: Search */}
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder={t('searchPlaceholder')}
              className="w-full sm:w-80"
            />

            {/* Right side: Filter Button */}
            <FilterButton onClick={() => setFilterOpen(true)} activeCount={activeFilterCount} />
          </div>

          {/* Table */}
          <InvoiceTable
            data={invoices}
            meta={meta}
            isLoading={isLoading}
            canWrite={canWrite}
            page={page}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            onQuickView={handleQuickView}
            onCreateNew={handleCreateNew}
            hasFilters={hasFilters}
          />
        </PageContent>

        {/* Filters Sheet */}
        <InvoiceFiltersSheet
          open={filterOpen}
          onOpenChange={setFilterOpen}
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />
      </PageContainer>
    </PermissionGuard>
  );
}
