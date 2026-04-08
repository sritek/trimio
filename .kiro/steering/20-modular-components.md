---
# Modular component architecture - file organization, decomposition rules, and page structure patterns
inclusion: fileMatch
fileMatchPattern: 'apps/web/**/*.tsx, apps/web/**/*.ts'
---

# Modular Component Architecture

## Core Principle

**One component per file. Pages are composition, not implementation.**

## Component Directory Structure

Follow this structure for organizing components:

```
apps/web/src/components/
├── ui/                           # shadcn/ui primitives (DO NOT MODIFY)
│   ├── button.tsx
│   ├── input.tsx
│   ├── table.tsx
│   └── ...
│
├── common/                       # Shared wrapper components
│   ├── page-container.tsx
│   ├── page-header.tsx
│   ├── data-table.tsx            # TanStack Table wrapper
│   ├── pagination.tsx            # Reusable pagination
│   ├── status-badge.tsx
│   ├── empty-state.tsx
│   └── index.ts                  # Barrel export
│
├── forms/                        # Feature form components
│   ├── appointment-form.tsx
│   ├── customer-form.tsx
│   └── service-form.tsx
│
├── tables/                       # Table components
│   ├── data-table.tsx            # Base TanStack Table
│   └── columns/                  # Column definitions
│       ├── appointment-columns.tsx
│       ├── customer-columns.tsx
│       └── service-columns.tsx
│
├── charts/                       # Chart components
│   ├── revenue-chart.tsx
│   └── appointments-chart.tsx
│
├── calendar/                     # Calendar components
│   └── appointment-calendar.tsx
│
├── dashboard/                    # Dashboard widgets
│   └── widgets/
│       ├── revenue-today.tsx
│       └── appointments-today.tsx
│
└── layout/                       # Layout components
    ├── sidebar.tsx
    ├── header.tsx
    └── mobile-nav.tsx
```

### Where to Put Components

| Component Type       | Location                     | Example                             |
| -------------------- | ---------------------------- | ----------------------------------- |
| shadcn/ui primitives | `components/ui/`             | `button.tsx`, `input.tsx`           |
| Shared wrappers      | `components/common/`         | `data-table.tsx`, `empty-state.tsx` |
| Feature forms        | `components/forms/`          | `customer-form.tsx`                 |
| Column definitions   | `components/tables/columns/` | `service-columns.tsx`               |
| Page-specific        | `app/.../components/`        | `services-filters.tsx`              |
| Layout               | `components/layout/`         | `sidebar.tsx`                       |

---

## TanStack Table Usage

**ALWAYS use TanStack Table for data tables.** Do not use raw `<Table>` components from shadcn/ui for list pages.

### DataTable Component (components/common/data-table.tsx)

The DataTable component supports both client-side and server-side pagination, sorting, and search.

```typescript
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];

  // --- Search ---
  searchable?: boolean; // Enable search input
  searchKey?: keyof TData; // Column to filter (client-side)
  searchPlaceholder?: string;
  searchValue?: string; // Controlled value (server-side)
  onSearchChange?: (value: string) => void;

  // --- Pagination ---
  pagination?: PaginationMeta; // Server-side pagination
  onPageChange?: (page: number) => void;
  pageSize?: number; // Client-side pagination
  pageSizeOptions?: number[];

  // --- Sorting ---
  sortable?: boolean;
  sorting?: SortingState; // Controlled (server-side)
  onSortingChange?: (sorting: SortingState) => void;

  // --- Selection ---
  selectable?: boolean;
  onSelectionChange?: (rows: TData[]) => void;

  // --- Column Visibility ---
  columnToggle?: boolean; // Show column visibility dropdown

  // --- Row Interaction ---
  onRowClick?: (row: TData) => void;
  rowClassName?: string | ((row: TData) => string);

  // --- States ---
  isLoading?: boolean;
  loadingRows?: number;
  emptyState?: React.ReactNode;

  // --- Styling ---
  className?: string;
  compact?: boolean;
}

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
```

### Server-Side Pagination Example

```typescript
// Page controls pagination via API
<DataTable
  columns={serviceColumns}
  data={services?.data ?? []}
  pagination={services?.meta}
  onPageChange={(page) => setFilters({ ...filters, page })}
  isLoading={isLoading}
/>
```

### Client-Side Pagination Example

```typescript
// Table handles pagination internally
<DataTable
  columns={columns}
  data={allData}
  pageSize={20}
  pageSizeOptions={[10, 20, 50]}
/>
```

### Server-Side Search Example

```typescript
// Search controlled externally with debounce
const [search, setSearch] = useState('');
const debouncedSearch = useDebounce(search, 300);

<DataTable
  columns={columns}
  data={data}
  searchable
  searchValue={search}
  onSearchChange={setSearch}
  searchPlaceholder="Search services..."
/>
```

### Client-Side Search Example

```typescript
// Table filters data internally
<DataTable
  columns={columns}
  data={data}
  searchable
  searchKey="name"
  searchPlaceholder="Search by name..."
/>
```

### Column Definitions

Define columns in separate files under `components/tables/columns/`:

```typescript
// components/tables/columns/service-columns.tsx
import { ColumnDef } from '@tanstack/react-table';
import { Service } from '@/types/services';
import { formatCurrency } from '@/lib/format';
import { StatusBadge } from '@/components/common';
import { ServiceRowActions } from './service-row-actions';

export const serviceColumns: ColumnDef<Service>[] = [
  {
    accessorKey: 'name',
    header: 'Service',
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.name}</span>
        <span className="text-sm text-muted-foreground">{row.original.sku}</span>
      </div>
    ),
  },
  {
    accessorKey: 'category.name',
    header: 'Category',
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <div
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: row.original.category?.color }}
        />
        <span>{row.original.category?.name}</span>
      </div>
    ),
  },
  {
    accessorKey: 'basePrice',
    header: () => <div className="text-right">Price</div>,
    cell: ({ row }) => (
      <div className="text-right">{formatCurrency(row.original.basePrice)}</div>
    ),
  },
  {
    accessorKey: 'isActive',
    header: 'Status',
    cell: ({ row }) => (
      <StatusBadge status={row.original.isActive ? 'active' : 'inactive'} />
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => <ServiceRowActions service={row.original} />,
  },
];
```

### Usage in Pages

```typescript
// app/(protected)/services/page.tsx
import { DataTable } from '@/components/common';
import { serviceColumns } from '@/components/tables/columns/service-columns';

export default function ServicesPage() {
  const { data, isLoading } = useServicesPaginated(filters);

  return (
    <DataTable
      columns={serviceColumns}
      data={data?.data ?? []}
      isLoading={isLoading}
      pagination={data?.meta}
      onPageChange={(page) => setFilters({ ...filters, page })}
      emptyState={<EmptyState icon={Scissors} title="No services" />}
    />
  );
}
```

---

## File Size Guidelines

| Component Type    | Max Lines | Action if Exceeded        |
| ----------------- | --------- | ------------------------- |
| Page component    | 80        | Extract to sub-components |
| Feature component | 150       | Split into smaller pieces |
| UI component      | 100       | Consider composition      |
| Custom hook       | 80        | Split by concern          |

---

## Page Decomposition Pattern

### Before (Monolithic)

```
app/(protected)/services/page.tsx  # 250+ lines - BAD
```

### After (Modular)

```
app/(protected)/services/
├── page.tsx                      # 50-80 lines - composition only
├── components/
│   ├── index.ts                  # Barrel export
│   ├── services-filters.tsx      # Filter controls
│   ├── services-header-actions.tsx
│   └── service-row-actions.tsx   # Row action menu
└── hooks/
    └── use-services-page.ts      # Page state logic (optional)

components/tables/columns/
└── service-columns.tsx           # Column definitions (reusable)
```

---

## Component Extraction Rules

### 1. Extract When You See These Patterns

**Filter/Search sections (>20 lines):**

```tsx
// ❌ BAD - Inline filters in page
<div className="flex gap-4">
  <Input ... />
  <Select ... />
  <Select ... />
</div>

// ✅ GOOD - Extracted filter component
<ServicesFilters
  filters={filters}
  categories={categories}
  onFiltersChange={updateFilters}
/>
```

**Action menus:**

```tsx
// ❌ BAD - Inline dropdown in table row
<DropdownMenu>
  <DropdownMenuTrigger>...</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>View</DropdownMenuItem>
    <DropdownMenuItem>Edit</DropdownMenuItem>
    <DropdownMenuItem>Delete</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>

// ✅ GOOD - Extracted action component
<ServiceRowActions service={service} />
```

**Header actions:**

```tsx
// ❌ BAD - Inline header actions
<PageHeader
  title="Services"
  actions={
    <div className="flex gap-2">
      <Button variant="outline" asChild>
        <Link href="/services/categories">Categories</Link>
      </Button>
      <Button variant="outline" asChild>
        <Link href="/services/combos">Combos</Link>
      </Button>
      {canWrite && (
        <Button asChild>
          <Link href="/services/new">Add Service</Link>
        </Button>
      )}
    </div>
  }
/>

// ✅ GOOD - Extracted header actions
<PageHeader
  title="Services"
  actions={<ServicesHeaderActions canWrite={canWrite} />}
/>
```

### 2. Page Component Should Only Contain

```tsx
// ✅ GOOD - Page as pure composition (~50-80 lines)
'use client';

import { PERMISSIONS } from '@trimio/shared';
import {
  AccessDenied,
  PageContainer,
  PageContent,
  PageHeader,
  PermissionGuard,
} from '@/components/common';
import { DataTable } from '@/components/common';
import { serviceColumns } from '@/components/tables/columns/service-columns';
import { ServicesFilters, ServicesHeaderActions } from './components';
import { useServicesPage } from './hooks/use-services-page';

export default function ServicesPage() {
  const { filters, updateFilters, services, categories, isLoading, error } = useServicesPage();

  return (
    <PermissionGuard permission={PERMISSIONS.SERVICES_READ} fallback={<AccessDenied />}>
      <PageContainer>
        <PageHeader
          title="Services"
          description="Manage your salon services and pricing"
          actions={<ServicesHeaderActions />}
        />
        <PageContent>
          <ServicesFilters
            filters={filters}
            categories={categories}
            onFiltersChange={updateFilters}
          />
          <DataTable
            columns={serviceColumns}
            data={services?.data ?? []}
            isLoading={isLoading}
            pagination={services?.meta}
            onPageChange={(page) => updateFilters({ page })}
            emptyState={
              <EmptyState
                icon={Scissors}
                title="No services found"
                description={
                  hasFilters
                    ? 'Try adjusting your filters.'
                    : 'Get started by creating your first service.'
                }
              />
            }
          />
        </PageContent>
      </PageContainer>
    </PermissionGuard>
  );
}
```

### 3. Co-locate Page-Specific Components

```
feature/
├── page.tsx              # Entry point
├── components/           # Page-specific components ONLY
│   ├── index.ts          # Barrel export
│   ├── feature-filters.tsx
│   └── feature-header-actions.tsx
└── hooks/                # Page-specific hooks
    └── use-feature-page.ts
```

---

## State Management in Pages

### Option 1: Inline State (Simple pages)

```tsx
export default function SimplePage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  // ... few state variables
}
```

### Option 2: Custom Hook (Complex pages with 4+ state variables)

```tsx
// hooks/use-services-page.ts
export function useServicesPage() {
  const [filters, setFilters] = useState<ServiceFilters>({
    page: 1,
    limit: 20,
    search: '',
    categoryId: 'all',
    isActive: 'all',
  });

  const debouncedSearch = useDebounce(filters.search, 300);

  const { data, isLoading, error } = useServicesPaginated({
    ...filters,
    search: debouncedSearch || undefined,
    categoryId: filters.categoryId !== 'all' ? filters.categoryId : undefined,
  });

  const { data: categories } = useCategories({ flat: true });

  const updateFilters = (updates: Partial<ServiceFilters>) => {
    setFilters((prev) => ({ ...prev, ...updates }));
  };

  return { filters, updateFilters, services: data, categories, isLoading, error };
}

// page.tsx
export default function ServicesPage() {
  const pageState = useServicesPage();
  // ... composition only
}
```

---

## Naming Conventions

### Component Files

- Use kebab-case: `service-row-actions.tsx`
- Prefix with feature name: `services-filters.tsx`, `services-header-actions.tsx`
- Suffix action components: `*-actions.tsx`, `*-menu.tsx`

### Component Names

- Use PascalCase: `ServiceRowActions`
- Match file name: `services-filters.tsx` → `ServicesFilters`

### Props Interfaces

- Suffix with `Props`: `ServicesFiltersProps`
- Define in same file or shared types

---

## When NOT to Extract

1. **Truly one-off JSX** - If it's only used once and is <20 lines
2. **Tightly coupled logic** - If extraction would require passing 10+ props
3. **Under 20 lines** - Small inline sections are fine

---

## Barrel Exports

Always create `index.ts` for component folders:

```tsx
// app/(protected)/services/components/index.ts
export { ServicesFilters } from './services-filters';
export { ServicesHeaderActions } from './services-header-actions';
export { ServiceRowActions } from './service-row-actions';
```

Usage:

```tsx
import { ServicesFilters, ServicesHeaderActions } from './components';
```

---

## Checklist for New List Pages

1. [ ] Create column definitions in `components/tables/columns/`
2. [ ] Use `DataTable` from `components/common/`
3. [ ] Extract filters to `app/.../components/feature-filters.tsx`
4. [ ] Extract header actions to `app/.../components/feature-header-actions.tsx`
5. [ ] Extract row actions to `app/.../components/feature-row-actions.tsx`
6. [ ] Create custom hook if page has 4+ state variables
7. [ ] Page component should be <80 lines
8. [ ] Create barrel export `index.ts` in components folder
