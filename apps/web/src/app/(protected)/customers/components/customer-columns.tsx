'use client';

import { useRouter } from 'next/navigation';
import { AlertTriangle, Eye, MoreHorizontal, Pencil, Star, Trash2, Wallet } from 'lucide-react';

import { formatCurrency } from '@/lib/format';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import type { ColumnDef } from '@/components/common';
import type { BookingStatus, Customer } from '@/types/customers';

// ============================================
// Helper Functions
// ============================================

export function getTagVariant(tag: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (tag) {
    case 'VIP':
      return 'default';
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
    case 'vip':
      return 'default';
    case 'normal':
      return 'secondary';
    case 'blocked':
      return 'destructive';
    case 'restricted':
      return 'outline';
    default:
      return 'secondary';
  }
}

// ============================================
// Column Definitions
// ============================================

interface GetColumnsOptions {
  canWrite: boolean;
  onDelete: (id: string) => void;
}

export function getCustomerColumns({
  canWrite,
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
                <span className="font-medium">{customer.name}</span>
                {customer.allergies && customer.allergies.length > 0 && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Allergies: {customer.allergies.join(', ')}</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
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
      header: () => <div className="text-right">Loyalty</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Star className="size-3 text-amber-500" />
          <span>{row.original.loyaltyPoints.toLocaleString()}</span>
        </div>
      ),
    },
    {
      accessorKey: 'walletBalance',
      header: () => <div className="text-right">Wallet</div>,
      cell: ({ row }) => (
        <div className="flex items-center justify-end gap-1">
          <Wallet className="h-3 w-3 text-green-600" />
          <span>{formatCurrency(row.original.walletBalance)}</span>
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
      cell: ({ row }) => (
        <CustomerActions customer={row.original} canWrite={canWrite} onDelete={onDelete} />
      ),
    },
  ];
}

// ============================================
// Actions Component
// ============================================

interface CustomerActionsProps {
  customer: Customer;
  canWrite: boolean;
  onDelete: (id: string) => void;
}

function CustomerActions({ customer, canWrite, onDelete }: CustomerActionsProps) {
  const router = useRouter();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}`)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>
        {canWrite && (
          <>
            <DropdownMenuItem onClick={() => router.push(`/customers/${customer.id}?edit=true`)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(customer.id)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Deactivate
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
