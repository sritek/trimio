---
# App-wide UI/UX standards and design principles for Trimio
inclusion: fileMatch
fileMatchPattern: '["apps/web/**/*.tsx", "apps/web/**/*.ts", "apps/web/**/*.css"]'
---

# UI/UX Standards

This document defines the app-wide UI/UX standards that govern all frontend development in Trimio. These standards ensure a consistent, modern, and intuitive experience for non-technical salon operators.

## Design Principles

These 10 principles govern ALL UI decisions throughout the app:

### 1. Clarity Over Cleverness
- Use plain language, no technical jargon
- Icons should be universally recognizable
- Labels should describe exactly what happens
- Avoid abbreviations unless universally understood

```typescript
// Good
<Button>Add Customer</Button>
<Button>Save Changes</Button>

// Bad
<Button>Submit</Button>
<Button>Process</Button>
```

### 2. Progressive Disclosure
- Show essential information first
- Reveal details on demand (expand, click, hover)
- Don't overwhelm users with all options at once
- Use "Show more" patterns for additional content

```typescript
// Good: Summary first, details on click
<CustomerCard>
  <CustomerSummary /> {/* Name, phone, last visit */}
  <ExpandableDetails /> {/* Full history on expand */}
</CustomerCard>
```

### 3. Consistent Patterns
- Same action = same appearance everywhere
- Primary actions always use primary button style
- Destructive actions always use destructive variant
- Navigation always behaves the same way

```typescript
// Consistent action patterns
<Button variant="default">Primary Action</Button>
<Button variant="outline">Secondary Action</Button>
<Button variant="destructive">Delete / Cancel</Button>
<Button variant="ghost">Tertiary Action</Button>
```

### 4. Visual Hierarchy
- Important items are larger, bolder, or higher on page
- Use whitespace to group related items
- Primary actions are visually prominent
- Secondary information uses muted colors

```typescript
// Visual hierarchy in page header
<PageHeader>
  <h1 className="text-2xl font-bold">Customers</h1>
  <p className="text-muted-foreground">Manage your customer database</p>
</PageHeader>
```

### 5. Immediate Feedback
- Every action shows immediate response
- Loading states for async operations
- Success/error messages after actions
- Optimistic updates where safe

```typescript
// Always show loading states
{isLoading ? (
  <Skeleton className="h-10 w-full" />
) : (
  <DataTable data={customers} />
)}

// Always show action feedback
toast.success('Customer added successfully');
toast.error('Failed to save changes');
```

### 6. Forgiving Design
- Confirm destructive actions
- Easy to undo where possible
- Clear error messages with recovery actions
- Autosave drafts

```typescript
// Always confirm destructive actions
<ConfirmDialog
  title="Delete Customer?"
  description="This action cannot be undone. All appointment history will be lost."
  confirmText="Delete"
  variant="destructive"
  onConfirm={handleDelete}
/>
```

### 7. Mobile-First
- Design for phones first, enhance for desktop
- Touch-friendly tap targets (min 44x44px)
- No hover-only interactions for critical features
- Responsive layouts that reflow naturally

```typescript
// Mobile-first responsive design
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
  <StatCard />
  <StatCard />
  <StatCard />
  <StatCard />
</div>
```

### 8. Accessibility (WCAG 2.1 AA)
- Sufficient color contrast (4.5:1 for text)
- Keyboard navigable (all interactive elements)
- Screen reader compatible (proper ARIA labels)
- Focus indicators visible

```typescript
// Accessible button with icon
<Button aria-label="Add new customer">
  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
  Add Customer
</Button>

// Icon-only buttons MUST have aria-label
<Button variant="ghost" size="icon" aria-label="Delete customer">
  <Trash className="h-4 w-4" />
</Button>
```

### 9. Performance
- Skeleton loading for data fetches
- Optimistic updates for quick feedback
- Lazy load below-fold content
- Debounce search inputs

```typescript
// Skeleton loading pattern
<Suspense fallback={<CustomerListSkeleton />}>
  <CustomerList />
</Suspense>

// Debounced search
const debouncedSearch = useDebounce(searchTerm, 300);
```

### 10. Localization-Ready
- All user-facing strings in translation files
- Support for English (en-IN) and Hindi (hi-IN)
- Format dates, currency, phone in Indian locale
- RTL-ready layout (for future)

```typescript
// Use formatting utilities
import { formatCurrency, formatDate, formatPhone } from '@/lib/format';

formatCurrency(1500);    // ₹1,500.00
formatDate(new Date());  // 3 Feb 2026
formatPhone('9876543210'); // +91 98765 43210
```

---

## Component Usage Guidelines

### Page Structure

Every page MUST follow this structure:

```typescript
export default function CustomersPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Customers"
        description="Manage your customer database"
        actions={<Button>+ Add Customer</Button>}
      />
      
      <FilterBar>
        <SearchInput placeholder="Search customers..." />
        <StatusFilter />
      </FilterBar>
      
      <PageContent>
        <DataTable columns={columns} data={customers} />
      </PageContent>
      
      <Pagination />
    </PageContainer>
  );
}
```

### Form Structure

All forms MUST follow this pattern:

```typescript
export function CustomerForm() {
  const form = useForm<CustomerSchema>({
    resolver: zodResolver(customerSchema),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)}>
        <FormSection title="Basic Information">
          <FormField
            control={form.control}
            name="name"
            label="Full Name"
            render={({ field }) => <Input {...field} />}
          />
          <FormField
            control={form.control}
            name="phone"
            label="Phone Number"
            render={({ field }) => <PhoneInput {...field} />}
          />
        </FormSection>
        
        <FormActions>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Customer'}
          </Button>
        </FormActions>
      </form>
    </Form>
  );
}
```

### Data Tables

All data tables MUST include:

```typescript
<DataTable
  columns={columns}
  data={data}
  searchKey="name"                    // Searchable column
  searchPlaceholder="Search..."       // Placeholder text
  emptyState={<EmptyState />}         // Empty state component
  isLoading={isLoading}               // Loading state
  onRowClick={handleRowClick}         // Row click handler
  pagination={{                       // Pagination config
    page: 1,
    pageSize: 10,
    total: 100,
  }}
/>
```

### Status Badges

Use consistent status colors:

```typescript
// Appointment statuses
<StatusBadge status="confirmed" />   // Green
<StatusBadge status="pending" />     // Yellow
<StatusBadge status="cancelled" />   // Red
<StatusBadge status="completed" />   // Blue
<StatusBadge status="no_show" />     // Gray

// Payment statuses
<StatusBadge status="paid" />        // Green
<StatusBadge status="partial" />     // Yellow
<StatusBadge status="unpaid" />      // Red
<StatusBadge status="refunded" />    // Gray
```

---

## Layout Guidelines

### Spacing

Use consistent spacing based on 4px grid:

```typescript
// Spacing scale
space-1: 4px   (0.25rem)
space-2: 8px   (0.5rem)
space-3: 12px  (0.75rem)
space-4: 16px  (1rem)
space-6: 24px  (1.5rem)
space-8: 32px  (2rem)
space-12: 48px (3rem)
space-16: 64px (4rem)

// Usage
<div className="space-y-4">     // 16px vertical gap
<div className="gap-6">         // 24px grid gap
<div className="p-4 md:p-6">    // 16px mobile, 24px desktop padding
```

### Typography

```typescript
// Headings
<h1 className="text-2xl font-bold">Page Title</h1>
<h2 className="text-xl font-semibold">Section Title</h2>
<h3 className="text-lg font-medium">Subsection</h3>

// Body text
<p className="text-base">Normal text</p>
<p className="text-sm text-muted-foreground">Secondary text</p>
<p className="text-xs text-muted-foreground">Caption text</p>
```

### Responsive Breakpoints

```typescript
// Tailwind breakpoints
sm: 640px   // Large phones
md: 768px   // Tablets
lg: 1024px  // Laptops
xl: 1280px  // Desktops
2xl: 1536px // Large screens

// Common patterns
<div className="hidden lg:block">    // Desktop only
<div className="lg:hidden">          // Mobile only
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
```

---

## Animation Guidelines

### Transitions

Use subtle, functional animations:

```typescript
// Standard transitions
transition-all duration-200    // Default for most elements
transition-colors duration-150 // Color changes only
transition-transform duration-300 // Movement animations

// Sidebar collapse
transition-[width] duration-300 ease-in-out
```

### Motion Preferences

Respect user preferences:

```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Color Usage

### Semantic Colors

```typescript
// Status colors
success: 'text-green-600'     // Positive actions, confirmations
warning: 'text-yellow-600'    // Warnings, pending states
error: 'text-red-600'         // Errors, destructive actions
info: 'text-blue-600'         // Information, in-progress

// Background variants
success: 'bg-green-50 text-green-700'
warning: 'bg-yellow-50 text-yellow-700'
error: 'bg-red-50 text-red-700'
info: 'bg-blue-50 text-blue-700'
```

### Do's and Don'ts

```typescript
// DO: Use semantic colors for meaning
<Badge className="bg-green-100 text-green-800">Confirmed</Badge>

// DON'T: Use colors without meaning
<Badge className="bg-purple-100">Confirmed</Badge>  // Purple has no semantic meaning

// DO: Use muted variants for secondary info
<span className="text-muted-foreground">Last updated 2 hours ago</span>

// DON'T: Use full-strength colors for everything
<span className="text-black">Last updated 2 hours ago</span>
```

---

## Error Handling

### Error Messages

```typescript
// User-friendly error messages
const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Unable to connect. Please check your internet connection.',
  NOT_FOUND: 'The item you're looking for doesn't exist or was deleted.',
  UNAUTHORIZED: 'Please log in to continue.',
  VALIDATION_ERROR: 'Please check the form for errors.',
  SERVER_ERROR: 'Something went wrong. Please try again later.',
};
```

### Error States

```typescript
// Page-level error
<ErrorState
  title="Failed to load customers"
  description="We couldn't load your customer list. Please try again."
  action={<Button onClick={retry}>Try Again</Button>}
/>

// Inline error
<FormField
  error="Phone number must be 10 digits"
/>
```

---

## Empty States

Every list/table MUST have an empty state:

```typescript
<EmptyState
  icon={Users}
  title="No customers yet"
  description="Add your first customer to start building your client list."
  action={
    <Button onClick={openAddCustomer}>
      <Plus className="h-4 w-4 mr-2" />
      Add Customer
    </Button>
  }
/>
```

---

## Checklist for New Pages

Before submitting a new page, verify:

- [ ] Uses `PageContainer`, `PageHeader` structure
- [ ] Has loading skeleton state
- [ ] Has error state with retry action
- [ ] Has empty state for lists
- [ ] Mobile responsive (test at 375px width)
- [ ] Keyboard navigable (Tab through all actions)
- [ ] All buttons have visible text or aria-label
- [ ] Destructive actions have confirmation dialog
- [ ] Form validation shows inline errors
- [ ] Success/error toasts for actions
- [ ] Uses semantic status colors
- [ ] Follows spacing guidelines (4px grid)
