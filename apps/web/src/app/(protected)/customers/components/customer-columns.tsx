'use client';

import Link from 'next/link';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { ColumnDef } from '@/components/common';
import type { BookingStatus, Customer } from '@/types/customers';

// ============================================
// Helper Functions
// ============================================

export function getTagVariant(tag: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (tag) {
    case 'VIP':
      return 'default';
      ``;
    case 'New':
      return 'secondary';
    case 'Inactive':
      return 'destructive';
    case 'Regular':
      return 'outline';
    default:
      return 'outline';
  }
}

export function getStatusBadgeVariant(
  status: BookingStatus
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'normal':
      return 'secondary';
    case 'blocked':
      return 'destructive';
    default:
      return 'secondary';
  }
}

// ============================================
// Column Definitions
// ============================================

interface GetColumnsOptions {
  canWrite: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function getCustomerColumns({
  canWrite,
  onEdit,
  onDelete,
}: GetColumnsOptions): ColumnDef<Customer>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Customer',
      cell: ({ row }) => {
        const customer = row.original;
        return (
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <Link href={`/customers/${customer.id}`} className="font-medium hover:underline">
                  {customer.name}
                </Link>
              </div>
              {customer.email && (
                <span className="text-sm text-muted-foreground">{customer.email}</span>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => <span className="font-mono text-sm">{row.original.phone}</span>,
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => {
        const tags = row.original.tags;
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant={getTagVariant(tag)} className="text-xs">
                {tag}
              </Badge>
            ))}
            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'loyaltyPoints',
      header: 'Loyalty',
      cell: ({ row }) => (
        <div className="flex items-center gap-1 text-amber-600">
          <span>{row.original.loyaltyPoints.toLocaleString()} pts</span>
        </div>
      ),
    },
    {
      accessorKey: 'bookingStatus',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.bookingStatus;
        return (
          <Badge variant={getStatusBadgeVariant(status)}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) =>
        canWrite ? (
          <CustomerActions customer={row.original} onEdit={onEdit} onDelete={onDelete} />
        ) : null,
    },
  ];
}

// ============================================
// Actions Component
// ============================================

interface CustomerActionsProps {
  customer: Customer;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function CustomerActions({ customer, onEdit, onDelete }: CustomerActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(customer.id)}>
          <Pencil className="mr-2 h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(customer.id)} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          Deactivate
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
