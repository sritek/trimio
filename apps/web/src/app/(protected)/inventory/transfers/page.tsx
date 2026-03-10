'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowDownLeft, ArrowUpRight, Plus } from 'lucide-react';

import { useTransfers } from '@/hooks/queries/use-inventory';
import { useBranchContext } from '@/hooks/use-branch-context';

import { PageContainer, PageContent, PageHeader, SearchInput } from '@/components/common';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { TransferTable } from './components/transfer-table';

import type { TransferFilters, TransferStatus } from '@/types/inventory';
import { TRANSFER_STATUS_LABELS } from '@/types/inventory';

export default function TransfersPage() {
  const router = useRouter();
  const { branchId } = useBranchContext();

  const [activeTab, setActiveTab] = useState<'outgoing' | 'incoming'>('outgoing');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const filters: TransferFilters = {
    page,
    limit,
    type: activeTab,
    search: search || undefined,
    status: statusFilter !== 'all' ? (statusFilter as TransferStatus) : undefined,
    sortBy: 'requestDate',
    sortOrder: 'desc',
  };

  const { data: transfersData, isLoading, error } = useTransfers(branchId || '', filters);

  const hasFilters = !!search || statusFilter !== 'all';

  const handleTabChange = (value: string) => {
    setActiveTab(value as 'outgoing' | 'incoming');
    setPage(1);
  };

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleView = useCallback(
    (id: string) => {
      router.push(`/inventory/transfers/${id}`);
    },
    [router]
  );

  return (
    <PageContainer>
      <PageHeader
        title="Stock Transfers"
        description="Manage inter-branch stock transfers"
        actions={
          <Button asChild>
            <Link href="/inventory/transfers/new">
              <Plus className="mr-2 h-4 w-4" />
              New Transfer
            </Link>
          </Button>
        }
      />

      <PageContent>
        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList>
            <TabsTrigger value="outgoing" className="gap-2">
              <ArrowUpRight className="h-4 w-4" />
              Outgoing
            </TabsTrigger>
            <TabsTrigger value="incoming" className="gap-2">
              <ArrowDownLeft className="h-4 w-4" />
              Incoming
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="flex flex-col flex-1 min-h-0 space-y-4">
            {/* Filters */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between flex-shrink-0">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search by transfer number..."
                className="flex-1 max-w-sm"
              />

              <div className="flex flex-wrap gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    {Object.entries(TRANSFER_STATUS_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Table */}
            <TransferTable
              data={transfersData?.data || []}
              meta={transfersData?.meta}
              isLoading={isLoading}
              error={error}
              activeTab={activeTab}
              page={page}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
              onView={handleView}
              hasFilters={hasFilters}
            />
          </TabsContent>
        </Tabs>
      </PageContent>
    </PageContainer>
  );
}
