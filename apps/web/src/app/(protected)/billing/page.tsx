'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { PERMISSIONS } from '@salon-ops/shared';

import { useInvoices } from '@/hooks/queries/use-invoices';
import { usePermissions } from '@/hooks/use-permissions';

import {
  AccessDenied,
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

import { InvoiceTable } from './components/invoice-table';

import type { InvoiceStatus, PaymentStatus } from '@/types/billing';

export default function BillingPage() {
  const router = useRouter();
  const t = useTranslations('billing');
  const { hasPermission } = usePermissions();
  const canWrite = hasPermission(PERMISSIONS.BILLS_WRITE);

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [paymentStatus, setPaymentStatus] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const { data, isLoading } = useInvoices({
    search: search || undefined,
    status: status !== 'all' ? (status as InvoiceStatus) : undefined,
    paymentStatus: paymentStatus !== 'all' ? (paymentStatus as PaymentStatus) : undefined,
    page,
    limit,
  });

  const invoices = data?.data || [];
  const meta = data?.meta;

  const hasFilters = !!search || status !== 'all' || paymentStatus !== 'all';

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleView = useCallback(
    (id: string) => {
      router.push(`/billing/${id}`);
    },
    [router]
  );

  const handleCreateNew = useCallback(() => {
    router.push('/billing/new');
  }, [router]);

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
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4 flex-shrink-0">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder={t('searchPlaceholder')}
              className="flex-1"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('filterStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allStatuses')}</SelectItem>
                <SelectItem value="draft">{t('status.draft')}</SelectItem>
                <SelectItem value="finalized">{t('status.finalized')}</SelectItem>
                <SelectItem value="cancelled">{t('status.cancelled')}</SelectItem>
                <SelectItem value="refunded">{t('status.refunded')}</SelectItem>
              </SelectContent>
            </Select>
            <Select value={paymentStatus} onValueChange={setPaymentStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder={t('filterPayment')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('allPayments')}</SelectItem>
                <SelectItem value="pending">{t('payment.pending')}</SelectItem>
                <SelectItem value="partial">{t('payment.partial')}</SelectItem>
                <SelectItem value="paid">{t('payment.paid')}</SelectItem>
                <SelectItem value="refunded">{t('payment.refunded')}</SelectItem>
              </SelectContent>
            </Select>
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
            onView={handleView}
            onCreateNew={handleCreateNew}
            hasFilters={hasFilters}
          />
        </PageContent>
      </PageContainer>
    </PermissionGuard>
  );
}
