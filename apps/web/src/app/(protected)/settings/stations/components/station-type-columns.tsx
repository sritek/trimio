'use client';

/**
 * Station Type Columns
 * Column definitions for station types DataTable
 */

import { Edit, Trash2 } from 'lucide-react';
import type { ColumnDef } from '@/components/common';
import { Button } from '@/components/ui/button';
import type { StationType } from '@/types/stations';

interface GetColumnsOptions {
  canWrite: boolean;
  onEdit: (stationType: StationType) => void;
  onDelete: (stationType: StationType) => void;
}

export function getStationTypeColumns({
  canWrite,
  onEdit,
  onDelete,
}: GetColumnsOptions): ColumnDef<StationType>[] {
  const columns: ColumnDef<StationType>[] = [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded" style={{ backgroundColor: row.original.color }} />
          <span className="font-medium">{row.original.name}</span>
          {row.original.isDefault && (
            <span className="text-xs text-muted-foreground">(Default)</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: '_count.stations',
      header: 'Stations',
      cell: ({ row }) => row.original._count?.stations ?? 0,
    },
  ];

  if (canWrite) {
    columns.push({
      id: 'actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={() => onEdit(row.original)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(row.original)}
            disabled={(row.original._count?.stations ?? 0) > 0}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    });
  }

  return columns;
}
