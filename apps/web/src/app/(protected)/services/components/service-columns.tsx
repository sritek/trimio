'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Copy, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

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

import type { ColumnDef } from '@/components/common';
import type { Service } from '@/types/services';

// ============================================
// Column Definitions
// ============================================

interface GetColumnsOptions {
  canWrite: boolean;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function getServiceColumns({
  canWrite,
  onEdit,
  onDelete,
}: GetColumnsOptions): ColumnDef<Service>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Service',
      cell: ({ row }) => (
        <div className="flex flex-col">
          <Link href={`/services/${row.original.id}`} className="font-medium hover:underline">
            {row.original.name}
          </Link>
          <span className="text-sm text-muted-foreground">{row.original.sku}</span>
        </div>
      ),
    },
    {
      accessorKey: 'category',
      header: 'Category',
      cell: ({ row }) => {
        const category = row.original.category;
        if (!category) return null;
        return (
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: category.color }} />
            <span className="text-sm">{category.name}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'basePrice',
      header: () => <div className="text-right">Price</div>,
      cell: ({ row }) => <div className="text-right">{formatCurrency(row.original.basePrice)}</div>,
    },
    {
      accessorKey: 'durationMinutes',
      header: () => <div className="text-right">Duration</div>,
      cell: ({ row }) => <ServiceDuration minutes={row.original.durationMinutes} />,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <ServiceStatusBadge service={row.original} />,
    },
    {
      id: 'actions',
      cell: ({ row }) =>
        canWrite ? (
          <ServiceActions service={row.original} onEdit={onEdit} onDelete={onDelete} />
        ) : null,
    },
  ];
}

// ============================================
// Helper Components
// ============================================

function ServiceDuration({ minutes }: { minutes: number }) {
  const t = useTranslations('common');
  return (
    <div className="text-right">
      {minutes} {t('time.min')}
    </div>
  );
}

function ServiceStatusBadge({ service }: { service: Service }) {
  const t = useTranslations('common');
  return (
    <Badge variant={service.isActive ? 'default' : 'secondary'}>
      {service.isActive ? t('status.active') : t('status.inactive')}
    </Badge>
  );
}

// ============================================
// Actions Component
// ============================================

interface ServiceActionsProps {
  service: Service;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

function ServiceActions({ service, onEdit, onDelete }: ServiceActionsProps) {
  const t = useTranslations('common');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(service.id)}>
          <Pencil className="mr-2 h-4 w-4" />
          {t('actions.edit')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onDelete(service.id)} className="text-destructive">
          <Trash2 className="mr-2 h-4 w-4" />
          {t('actions.delete')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
