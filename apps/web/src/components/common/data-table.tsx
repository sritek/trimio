'use client';

import { useEffect, useState, useMemo, type ReactNode } from 'react';
import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  RowSelectionState,
  Row,
} from '@tanstack/react-table';
import {
  ArrowUpDown,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Search,
  X,
} from 'lucide-react';
import { useTranslations } from 'next-intl';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';

// ============================================================================
// Types
// ============================================================================

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface DataTableProps<TData, TValue> {
  /** Column definitions using TanStack Table ColumnDef */
  columns: ColumnDef<TData, TValue>[];
  /** Data array to display */
  data: TData[];

  // --- Search ---
  /** Enable search input */
  searchable?: boolean;
  /** Column key to filter on (for client-side search) */
  searchKey?: keyof TData;
  /** Placeholder text for search input */
  searchPlaceholder?: string;
  /** Controlled search value (for server-side search) */
  searchValue?: string;
  /** Callback when search changes (for server-side search) */
  onSearchChange?: (value: string) => void;

  // --- Pagination ---
  /** Server-side pagination metadata */
  pagination?: PaginationMeta;
  /** Callback when page changes (server-side) */
  onPageChange?: (page: number) => void;
  /** Callback when page size changes (server-side) */
  onPageSizeChange?: (pageSize: number) => void;
  /** Enable client-side pagination with this page size */
  pageSize?: number;
  /** Page size options for pagination */
  pageSizeOptions?: number[];

  // --- Sorting ---
  /** Enable column sorting */
  sortable?: boolean;
  /** Controlled sorting state (for server-side sorting) */
  sorting?: SortingState;
  /** Callback when sorting changes (for server-side sorting) */
  onSortingChange?: (sorting: SortingState) => void;

  // --- Selection ---
  /** Enable row selection with checkboxes */
  selectable?: boolean;
  /** Callback when selection changes */
  onSelectionChange?: (rows: TData[]) => void;

  // --- Column Visibility ---
  /** Enable column visibility toggle dropdown */
  columnToggle?: boolean;

  // --- Row Interaction ---
  /** Callback when a row is clicked */
  onRowClick?: (row: TData) => void;
  /** Custom row className or function */
  rowClassName?: string | ((row: TData) => string);

  // --- States ---
  /** Show loading skeleton */
  isLoading?: boolean;
  /** Number of skeleton rows to show */
  loadingRows?: number;
  /** Custom empty state component */
  emptyState?: ReactNode;

  // --- Styling ---
  /** Additional className for the table container */
  className?: string;
  /** Compact mode with smaller padding */
  compact?: boolean;
}

// ============================================================================
// Helper: Selection Column
// ============================================================================

export function getSelectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: 'select',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && 'indeterminate')
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-[2px]"
        onClick={(e) => e.stopPropagation()}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  };
}

// ============================================================================
// Helper: Sortable Header
// ============================================================================

interface SortableHeaderProps {
  column: { getIsSorted: () => false | 'asc' | 'desc'; toggleSorting: (desc?: boolean) => void };
  children: ReactNode;
  className?: string;
}

export function SortableHeader({ column, children, className }: SortableHeaderProps) {
  return (
    <Button
      variant="ghost"
      onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
      className={cn('-ml-4 h-8 data-[state=open]:bg-accent', className)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );
}

// ============================================================================
// DataTable Component
// ============================================================================

export function DataTable<TData, TValue>({
  columns,
  data,
  // Search
  searchable = false,
  searchKey,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  // Pagination
  pagination,
  onPageChange,
  onPageSizeChange,
  pageSize,
  pageSizeOptions = [10, 20, 30, 50],
  // Sorting
  sortable = false,
  sorting: controlledSorting,
  onSortingChange,
  // Selection
  selectable = false,
  onSelectionChange,
  // Column visibility
  columnToggle = false,
  // Row interaction
  onRowClick,
  rowClassName,
  // States
  isLoading = false,
  loadingRows = 5,
  emptyState,
  // Styling
  className,
  compact = false,
}: DataTableProps<TData, TValue>) {
  const t = useTranslations('common');

  // Use provided placeholder or fall back to translation
  const effectiveSearchPlaceholder = searchPlaceholder || t('actions.search');

  // Internal state
  const [internalSorting, setInternalSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [internalSearch, setInternalSearch] = useState('');

  // Determine if using server-side or client-side pagination
  const isServerPagination = !!pagination && !!onPageChange;
  const isClientPagination = !isServerPagination && !!pageSize;

  // Determine if using server-side or client-side sorting
  const isServerSorting = !!controlledSorting && !!onSortingChange;
  const sorting = isServerSorting ? controlledSorting : internalSorting;
  const setSorting = isServerSorting ? onSortingChange : setInternalSorting;

  // Determine if using server-side or client-side search
  const isServerSearch = searchValue !== undefined && !!onSearchChange;
  const currentSearch = isServerSearch ? searchValue : internalSearch;
  const setCurrentSearch = isServerSearch ? onSearchChange : setInternalSearch;

  // Prepend selection column if selectable
  const tableColumns = useMemo(() => {
    if (selectable) {
      return [getSelectionColumn<TData>(), ...columns];
    }
    return columns;
  }, [columns, selectable]);

  // Create table instance
  const table = useReactTable({
    data,
    columns: tableColumns,
    // Core
    getCoreRowModel: getCoreRowModel(),
    // Sorting
    onSortingChange: setSorting as (
      updater: SortingState | ((old: SortingState) => SortingState)
    ) => void,
    getSortedRowModel: sortable && !isServerSorting ? getSortedRowModel() : undefined,
    // Filtering (client-side search)
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel:
      searchable && !isServerSearch && searchKey ? getFilteredRowModel() : undefined,
    // Pagination (client-side)
    getPaginationRowModel: isClientPagination ? getPaginationRowModel() : undefined,
    // Selection
    onRowSelectionChange: setRowSelection,
    // Column visibility
    onColumnVisibilityChange: setColumnVisibility,
    // State
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      ...(isClientPagination && { pagination: { pageIndex: 0, pageSize } }),
    },
    // Manual modes for server-side
    manualPagination: isServerPagination,
    manualSorting: isServerSorting,
    manualFiltering: isServerSearch,
    pageCount: pagination?.totalPages ?? -1,
  });

  // Handle selection changes
  useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, onSelectionChange, table]);

  // Handle client-side search
  useEffect(() => {
    if (searchable && !isServerSearch && searchKey) {
      table.getColumn(searchKey as string)?.setFilterValue(currentSearch);
    }
  }, [currentSearch, searchable, isServerSearch, searchKey, table]);

  // Get row class
  const getRowClass = (row: Row<TData>) => {
    const baseClass = cn(onRowClick && 'cursor-pointer', compact ? '[&>td]:py-2' : '');
    if (typeof rowClassName === 'function') {
      return cn(baseClass, rowClassName(row.original));
    }
    return cn(baseClass, rowClassName);
  };

  // Pagination info for server-side
  const paginationInfo = useMemo(() => {
    if (isServerPagination && pagination) {
      const { page, limit, total } = pagination;
      const start = (page - 1) * limit + 1;
      const end = Math.min(page * limit, total);
      return { start, end, total, page, totalPages: pagination.totalPages, limit };
    }
    if (isClientPagination) {
      const pageIndex = table.getState().pagination.pageIndex;
      const pageSize = table.getState().pagination.pageSize;
      const total = table.getFilteredRowModel().rows.length;
      const start = pageIndex * pageSize + 1;
      const end = Math.min((pageIndex + 1) * pageSize, total);
      return { start, end, total, page: pageIndex + 1, totalPages: table.getPageCount() };
    }
    return null;
  }, [isServerPagination, isClientPagination, pagination, table]);

  const hasData = !isLoading && table.getRowModel().rows?.length > 0;
  const showPagination = paginationInfo && (hasData || isLoading);

  return (
    <div className={cn('flex flex-col min-h-0', className)}>
      {/* Toolbar */}
      {(searchable || columnToggle) && (
        <div className="flex items-center justify-between gap-4 mb-4 flex-shrink-0">
          {/* Search */}
          {searchable && (
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={effectiveSearchPlaceholder}
                value={currentSearch}
                onChange={(e) => setCurrentSearch(e.target.value)}
                className="pl-9 pr-9"
              />
              {currentSearch && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setCurrentSearch('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}

          {/* Column visibility toggle */}
          {columnToggle && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="ml-auto">
                  Columns <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {table
                  .getAllColumns()
                  .filter((column) => column.getCanHide())
                  .map((column) => (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) => column.toggleVisibility(!!value)}
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      {/* Table Container - flex-1 to fill available space, min-h-0 to allow shrinking */}
      <div className="flex flex-col min-h-0 flex-1 rounded-md border">
        {/* Table with sticky header */}
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full caption-bottom text-sm">
            <thead className="sticky top-0 z-10 bg-background border-b">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                      className={cn(
                        'h-12 px-4 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0 bg-muted',
                        compact && 'h-10'
                      )}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="[&_tr:last-child]:border-0">
              {isLoading ? (
                // Loading skeleton
                Array.from({ length: loadingRows }).map((_, i) => (
                  <tr
                    key={`skeleton-${i}`}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    {tableColumns.map((_, j) => (
                      <td
                        key={`skeleton-${i}-${j}`}
                        className={cn('p-4 align-middle', compact && 'py-2')}
                      >
                        <Skeleton className="h-5 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : table.getRowModel().rows?.length ? (
                // Data rows
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className={cn(
                      'border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted',
                      getRowClass(row)
                    )}
                    onClick={() => onRowClick?.(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          'p-4 align-middle [&:has([role=checkbox])]:pr-0',
                          compact && 'py-2'
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                // Empty state
                <tr>
                  <td colSpan={tableColumns.length} className="h-24 text-center">
                    {emptyState || t('pagination.noResults')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination - fixed at bottom */}
      {showPagination && (
        <div className="flex-shrink-0 pt-4">
          <DataTablePagination
            info={paginationInfo}
            isServerPagination={isServerPagination}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            table={table}
            pageSizeOptions={pageSizeOptions}
            showPageSizeSelector={!!onPageSizeChange}
          />
        </div>
      )}

      {/* Selection info */}
      {selectable && table.getFilteredSelectedRowModel().rows.length > 0 && (
        <div className="text-sm text-muted-foreground flex-shrink-0 pt-2">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
      )}
    </div>
  );
}

// ============================================================================
// DataTablePagination Component (Internal)
// ============================================================================

interface DataTablePaginationProps<TData> {
  info: {
    start: number;
    end: number;
    total: number;
    page: number;
    totalPages: number;
    limit?: number;
  };
  isServerPagination: boolean;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  table: ReturnType<typeof useReactTable<TData>>;
  pageSizeOptions: number[];
  showPageSizeSelector: boolean;
}

function DataTablePagination<TData>({
  info,
  isServerPagination,
  onPageChange,
  onPageSizeChange,
  table,
  pageSizeOptions,
  showPageSizeSelector,
}: DataTablePaginationProps<TData>) {
  const t = useTranslations('common.pagination');
  const { start, end, total, page, totalPages, limit } = info;

  const handlePageChange = (newPage: number) => {
    if (isServerPagination && onPageChange) {
      onPageChange(newPage);
    } else {
      table.setPageIndex(newPage - 1);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    if (isServerPagination && onPageSizeChange) {
      onPageSizeChange(newSize);
    } else {
      table.setPageSize(newSize);
    }
  };

  const currentPageSize = isServerPagination ? limit || 10 : table.getState().pagination.pageSize;
  const canGoPrevious = page > 1;
  const canGoNext = page < totalPages;

  return (
    <div className="flex items-center justify-between px-2">
      {/* Page info */}
      <p className="text-sm text-muted-foreground">
        {t('showing')} {start} {t('to')} {end} {t('of')} {total} {t('results')}
      </p>

      <div className="flex items-center gap-6 lg:gap-8">
        {/* Page size selector */}
        {showPageSizeSelector && (
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{t('rowsPerPage')}</p>
            <select
              value={currentPageSize}
              onChange={(e) => handlePageSizeChange(Number(e.target.value))}
              className="h-8 w-[70px] rounded-md border border-input bg-background px-2 text-sm"
            >
              {pageSizeOptions.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Page indicator */}
        <div className="flex w-[100px] items-center justify-center text-sm font-medium">
          {t('page')} {page} {t('of')} {totalPages}
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(1)}
            disabled={!canGoPrevious}
          >
            <span className="sr-only">Go to first page</span>
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(page - 1)}
            disabled={!canGoPrevious}
          >
            <span className="sr-only">Go to previous page</span>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(page + 1)}
            disabled={!canGoNext}
          >
            <span className="sr-only">Go to next page</span>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => handlePageChange(totalPages)}
            disabled={!canGoNext}
          >
            <span className="sr-only">Go to last page</span>
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export type { ColumnDef, SortingState, Row } from '@tanstack/react-table';
