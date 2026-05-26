'use client';

import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Eye } from 'lucide-react';

import { formatCurrency } from '@/lib/format';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { StatusBadge } from '@/components/common';
import type { ColumnDef } from '@/components/common';
import type { Invoice } from '@/types/billing';

// ============================================
// Helper Functions
// ============================================

interface StylistInfo {
  id: string;
  name: string;
}

function getUniqueStylists(invoice: Invoice): StylistInfo[] {
  const stylistMap = new Map<string, string>();

  if (invoice.items && invoice.items.length > 0) {
    for (const item of invoice.items) {
      if (item.stylistId && item.stylistName) {
        // Use stylistId as key to avoid duplicates
        stylistMap.set(item.stylistId, item.stylistName);
      }
    }
  }

  return Array.from(stylistMap.entries()).map(([id, name]) => ({ id, name }));
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

// ============================================
// Column Definitions
// ============================================

interface GetColumnsOptions {
  onQuickView: (id: string) => void;
}

export function getInvoiceColumns({ onQuickView }: GetColumnsOptions): ColumnDef<Invoice>[] {
  return [
    {
      accessorKey: 'invoiceNumber',
      header: 'Invoice Number',
      cell: ({ row }) => (
        <Link href={`/billing/${row.original.id}`} className="font-medium hover:underline">
          {row.original.invoiceNumber || `Draft-${row.original.id.slice(0, 8)}`}
        </Link>
      ),
    },
    {
      accessorKey: 'invoiceDate',
      header: 'Date',
      cell: ({ row }) => format(parseISO(row.original.invoiceDate), 'dd/MM/yyyy'),
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => (
        <div>
          <div className="font-medium">{row.original.customerName}</div>
          {row.original.customerPhone && (
            <div className="text-sm text-muted-foreground">{row.original.customerPhone}</div>
          )}
        </div>
      ),
    },
    {
      id: 'stylist',
      header: 'Staff',
      cell: ({ row }) => {
        const stylists = getUniqueStylists(row.original);

        if (stylists.length === 0) {
          return <span className="text-muted-foreground text-sm">-</span>;
        }

        // Single stylist - show full name
        if (stylists.length === 1) {
          const stylist = stylists[0];
          const initials = getInitials(stylist.name);
          return (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm">{stylist.name}</span>
            </div>
          );
        }

        // Multiple stylists - show stacked avatars with tooltip
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center">
                  {/* Stacked avatars - show up to 3 */}
                  <div className="flex -space-x-2">
                    {stylists.slice(0, 3).map((stylist, index) => (
                      <Avatar
                        key={stylist.id}
                        className="h-6 w-6 border-2 border-background"
                        style={{ zIndex: 3 - index }}
                      >
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {getInitials(stylist.name)}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {stylists.length > 3 && (
                      <Avatar className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className="text-xs bg-muted text-muted-foreground">
                          +{stylists.length - 3}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                  <span className="ml-2 text-sm text-muted-foreground">
                    {stylists.length} staff
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="start">
                <div className="space-y-1">
                  {stylists.map((stylist) => (
                    <div key={stylist.id} className="text-sm">
                      {stylist.name}
                    </div>
                  ))}
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
    },
    {
      accessorKey: 'grandTotal',
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">{formatCurrency(row.original.grandTotal)}</div>
      ),
    },
    {
      id: 'commission',
      header: () => <div className="text-right">Commission</div>,
      cell: ({ row }) => {
        const total = (row.original.items || []).reduce(
          (sum, item) => sum + (item.commissionAmount || 0),
          0
        );
        return (
          <div className="text-right text-sm">
            {total > 0 ? formatCurrency(total) : <span className="text-muted-foreground">-</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'paymentStatus',
      header: 'Payment',
      cell: ({ row }) => <StatusBadge status={row.original.paymentStatus} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => <InvoiceActions invoice={row.original} onQuickView={onQuickView} />,
    },
  ];
}

// ============================================
// Actions Component
// ============================================

interface InvoiceActionsProps {
  invoice: Invoice;
  onQuickView: (id: string) => void;
}

function InvoiceActions({ invoice, onQuickView }: InvoiceActionsProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="Quick View Invoice"
      onClick={() => onQuickView(invoice.id)}
    >
      <Eye className="h-4 w-4" />
    </Button>
  );
}
