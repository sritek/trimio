'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

import { useStockSummary, useProductCategories } from '@/hooks/queries/use-inventory';
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

import { StockTable } from './components/stock-table';

import type { StockFilters, ProductType } from '@/types/inventory';

export default function StockSummaryPage() {
  const { branchId } = useBranchContext();

  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [productTypeFilter, setProductTypeFilter] = useState<string>('all');
  const [alertFilter, setAlertFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const filters: StockFilters = {
    page,
    limit,
    search: search || undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    productType: productTypeFilter !== 'all' ? (productTypeFilter as ProductType) : undefined,
    alertType:
      alertFilter !== 'all' ? (alertFilter as 'low_stock' | 'near_expiry' | 'expired') : undefined,
    sortBy: 'productName',
    sortOrder: 'asc',
  };

  const { data: stockData, isLoading, error } = useStockSummary(branchId || '', filters);
  const { data: categoriesData } = useProductCategories({ isActive: true });

  const hasFilters =
    !!search || categoryFilter !== 'all' || productTypeFilter !== 'all' || alertFilter !== 'all';

  const handlePageSizeChange = useCallback((newLimit: number) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  return (
    <PageContainer>
      <PageHeader
        title="Stock Summary"
        description="View current stock levels and inventory status"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/inventory/movements">Stock Movements</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/inventory/alerts">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Alerts
              </Link>
            </Button>
          </div>
        }
      />

      <PageContent>
        {/* Filters */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4 flex-shrink-0">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search products..."
            className="flex-1 max-w-sm"
          />

          <div className="flex flex-wrap gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoriesData?.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={productTypeFilter} onValueChange={setProductTypeFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="consumable">Consumable</SelectItem>
                <SelectItem value="retail">Retail</SelectItem>
                <SelectItem value="both">Both</SelectItem>
              </SelectContent>
            </Select>

            <Select value={alertFilter} onValueChange={setAlertFilter}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="near_expiry">Near Expiry</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <StockTable
          data={stockData?.data || []}
          meta={stockData?.meta}
          isLoading={isLoading}
          error={error}
          page={page}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          hasFilters={hasFilters}
        />
      </PageContent>
    </PageContainer>
  );
}
