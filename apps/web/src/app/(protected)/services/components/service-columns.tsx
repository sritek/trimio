'use client';

import { useTranslations } from 'next-intl';
import { Copy, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

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
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

export function getServiceColumns({
  canWrite,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
}: GetColumnsOptions): ColumnDef<Service>[] {
  return [
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
      cell: ({ row }) => <ServiceStatusBadges service={row.original} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <ServiceActions
          service={row.original}
          canWrite={canWrite}
          onView={onView}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ),
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

function ServiceStatusBadges({ service }: { service: Service }) {
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
  canWrite: boolean;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}

function ServiceActions({
  service,
  canWrite,
  onView,
  onEdit,
  onDuplicate,
  onDelete,
}: ServiceActionsProps) {
  const t = useTranslations('common');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(service.id)}>
          <Eye className="mr-2 h-4 w-4" />
          {t('actions.viewDetails')}
        </DropdownMenuItem>
        {canWrite && (
          <>
            <DropdownMenuItem onClick={() => onEdit(service.id)}>
              <Pencil className="mr-2 h-4 w-4" />
              {t('actions.edit')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onDuplicate(service.id)}>
              <Copy className="mr-2 h-4 w-4" />
              {t('actions.duplicate')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => onDelete(service.id)} className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              {t('actions.delete')}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
