'use client';

/**
 * Station Columns
 * Column definitions for stations DataTable
 */

import { Edit, Trash2, Power, PowerOff } from 'lucide-react';
import type { ColumnDef } from '@/components/common';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Station } from '@/types/stations';

interface GetColumnsOptions {
  canWrite: boolean;
  onEdit: (station: Station) => void;
  onDelete: (station: Station) => void;
  onToggleStatus: (station: Station) => void;
}

export function getStationColumns({
  canWrite,
  onEdit,
  onDelete,
  onToggleStatus,
}: GetColumnsOptions): ColumnDef<Station>[] {
  const columns: ColumnDef<Station>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
    },
    {
      accessorKey: 'stationType.name',
      header: 'Type',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded"
            style={{ backgroundColor: row.original.stationType?.color || '#6B7280' }}
          />
          <span>{row.original.stationType?.name || '-'}</span>
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'active' ? 'default' : 'secondary'}>
          {row.original.status === 'active' ? 'Active' : 'Out of Service'}
        </Badge>
      ),
    },
    {
      accessorKey: 'notes',
      header: 'Notes',
      cell: ({ row }) => (
        <span className="text-muted-foreground truncate max-w-[200px] block">
          {row.original.notes || '-'}
        </span>
      ),
    },
  ];

  if (canWrite) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleStatus(row.original)}
            title={row.original.status === 'active' ? 'Mark Out of Service' : 'Mark Active'}
          >
            {row.original.status === 'active' ? (
              <PowerOff className="h-4 w-4" />
            ) : (
              <Power className="h-4 w-4" />
            )}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(row.original)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  }

  return columns;
}
