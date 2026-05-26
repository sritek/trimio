'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { MoreHorizontal, Pencil, Power } from 'lucide-react';

import { formatDate } from '@/lib/format';

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
import type { StaffProfile } from '@/types/staff';

// ============================================
// Helper Functions
// ============================================

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  switch (role) {
    case 'branch_manager':
      return 'default';
    case 'stylist':
      return 'secondary';
    case 'receptionist':
      return 'outline';
    default:
      return 'outline';
  }
}

function getPrimaryBranch(staffMember: StaffProfile): string {
  const primary = staffMember.user?.branchAssignments?.find((b) => b.isPrimary);
  return primary?.branch?.name ?? '-';
}

// ============================================
// Column Definitions
// ============================================

interface GetColumnsOptions {
  canWrite: boolean;
  onEdit: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
}

export function getStaffColumns({
  canWrite,
  onEdit,
  onToggleStatus,
}: GetColumnsOptions): ColumnDef<StaffProfile>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => {
        const member = row.original;
        return (
          <Link href={`/staff/${member.userId}`} className="font-medium hover:underline">
            {member.user?.name ?? '-'}
          </Link>
        );
      },
    },
    {
      accessorKey: 'employeeCode',
      header: 'Employee Code',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.employeeCode ?? '-'}</span>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const role = row.original.user?.role ?? '';
        return <StaffRoleBadge role={role} />;
      },
    },
    {
      accessorKey: 'phone',
      header: 'Phone',
      cell: ({ row }) => row.original.user?.phone ?? '-',
    },
    {
      accessorKey: 'branch',
      header: 'Branch',
      cell: ({ row }) => getPrimaryBranch(row.original),
    },
    {
      accessorKey: 'dateOfJoining',
      header: 'Joining Date',
      cell: ({ row }) => formatDate(row.original.dateOfJoining),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => <StaffStatusBadge isActive={row.original.isActive} />,
    },
    {
      id: 'actions',
      cell: ({ row }) =>
        canWrite ? (
          <StaffActions staff={row.original} onEdit={onEdit} onToggleStatus={onToggleStatus} />
        ) : null,
    },
  ];
}

// ============================================
// Badge Components
// ============================================

function StaffRoleBadge({ role }: { role: string }) {
  const t = useTranslations('staff');
  return <Badge variant={getRoleBadgeVariant(role)}>{t(`roles.${role}` as any)}</Badge>;
}

function StaffStatusBadge({ isActive }: { isActive: boolean }) {
  const t = useTranslations('common');
  return (
    <Badge variant={isActive ? 'default' : 'secondary'}>
      {isActive ? t('status.active') : t('status.inactive')}
    </Badge>
  );
}

// ============================================
// Actions Component
// ============================================

interface StaffActionsProps {
  staff: StaffProfile;
  onEdit: (id: string) => void;
  onToggleStatus: (id: string, isActive: boolean) => void;
}

function StaffActions({ staff, onEdit, onToggleStatus }: StaffActionsProps) {
  const t = useTranslations('common');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onEdit(staff.userId)}>
          <Pencil className="mr-2 h-4 w-4" />
          {t('actions.edit')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onToggleStatus(staff.userId, staff.isActive)}
          className={staff.isActive ? 'text-destructive' : ''}
        >
          <Power className="mr-2 h-4 w-4" />
          {staff.isActive ? 'Deactivate' : 'Activate'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
