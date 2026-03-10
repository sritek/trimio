'use client';

import { format, parseISO } from 'date-fns';
import { Eye } from 'lucide-react';

import { formatCurrency } from '@/lib/format';

import { Button } from '@/components/ui/button';

import { StatusBadge } from '@/components/common';
import type { ColumnDef } from '@/components/common';
import type { Invoice } from '@/types/billing';

// ============================================
// Column Definitions
// ============================================

interface GetColumnsOptions {
  onView: (id: string) => void;
}

export function getInvoiceColumns({ onView }: GetColumnsOptions): ColumnDef<Invoice>[] {
  return [
    {
      accessorKey: 'invoiceNumber',
      header: 'Invoice Number',
      cell: ({ row }) => (
        <span className="font-medium">
          {row.original.invoiceNumber || `Draft-${row.original.id.slice(0, 8)}`}
        </span>
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
      cell: ({ row }) => <InvoiceActions invoice={row.original} onView={onView} />,
    },
  ];
}

// ============================================
// Actions Component
// ============================================

interface InvoiceActionsProps {
  invoice: Invoice;
  onView: (id: string) => void;
}

function InvoiceActions({ invoice, onView }: InvoiceActionsProps) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="View Invoice"
      onClick={() => onView(invoice.id)}
    >
      <Eye className="mr-2 h-4 w-4" />
    </Button>
  );
}
