'use client';

import Link from 'next/link';
import { format, parseISO } from 'date-fns';
import { Eye } from 'lucide-react';

import { formatCurrency } from '@/lib/format';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

import { StatusBadge } from '@/components/common';
import type { ColumnDef } from '@/components/common';
import type { Invoice } from '@/types/billing';

// ============================================
// Helper Functions
// ============================================

function getPrimaryStylist(invoice: Invoice): string | null {
  // Get the first stylist name from invoice items
  if (invoice.items && invoice.items.length > 0) {
    for (const item of invoice.items) {
      if (item.stylistName) {
        return item.stylistName;
      }
    }
  }
  return null;
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
        const stylistName = getPrimaryStylist(row.original);
        if (!stylistName) {
          return <span className="text-muted-foreground text-sm">-</span>;
        }
        const initials = stylistName
          .split(' ')
          .map((n) => n[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        return (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm">{stylistName}</span>
          </div>
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
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
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
