'use client';

import {
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  MoreHorizontal,
  Phone,
  Play,
  User,
  XCircle,
} from 'lucide-react';

import { formatCurrency } from '@/lib/format';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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

import { AppointmentStatusBadge } from './appointment-status-badge';

import type { ColumnDef } from '@/components/common';
import type { Appointment, BookingType } from '@/types/appointments';
import { formatDate } from 'date-fns';

// ============================================
// Helper Functions
// ============================================

const bookingTypeLabels: Record<BookingType, string> = {
  online: 'Online',
  phone: 'Phone',
  walk_in: 'Walk-in',
};

const bookingTypeIcons: Record<BookingType, React.ReactNode> = {
  online: <Calendar className="h-3 w-3" />,
  phone: <Phone className="h-3 w-3" />,
  walk_in: <User className="h-3 w-3" />,
};

// ============================================
// Column Definitions
// ============================================

interface GetColumnsOptions {
  canWrite: boolean;
  onView: (id: string) => void;
  onCheckIn: (id: string) => void;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onNoShow: (id: string) => void;
  onCheckout?: (id: string) => void;
}

export function getAppointmentColumns({
  canWrite,
  onView,
  onCheckIn,
  onStart,
  onComplete,
  onCancel,
  onNoShow,
  onCheckout,
}: GetColumnsOptions): ColumnDef<Appointment>[] {
  return [
    {
      accessorKey: 'scheduledDateTime',
      header: 'Time',
      cell: ({ row }) => {
        const apt = row.original;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{formatDate(apt.scheduledDate, 'PPP')}</span>
            <div className="flex gap-2 items-center">
              <span className="text-xs text-muted-foreground">{apt.scheduledTime}</span>
              <span className="text-xs text-muted-foreground">{apt.totalDuration} min</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'customer',
      header: 'Customer',
      cell: ({ row }) => {
        const apt = row.original;
        const name = apt.customer?.name || apt.customerName || 'Guest';
        const phone = apt.customer?.phone || apt.customerPhone;
        return (
          <div className="flex flex-col">
            <span className="font-medium">{name}</span>
            {phone && <span className="text-xs text-muted-foreground font-mono">{phone}</span>}
          </div>
        );
      },
    },
    {
      accessorKey: 'stylist',
      header: 'Stylist',
      cell: ({ row }) => {
        const apt = row.original;
        const stylistName = apt.stylist?.name;
        if (!stylistName) {
          return <span className="text-muted-foreground text-sm">Unassigned</span>;
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
      accessorKey: 'services',
      header: 'Services',
      cell: ({ row }) => {
        const services = row.original.services || [];
        return (
          <div className="flex flex-wrap gap-1 max-w-[200px]">
            {services.slice(0, 2).map((s) => (
              <Badge key={s.id} variant="outline" className="text-xs">
                {s.serviceName}
              </Badge>
            ))}
            {services.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{services.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'bookingType',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.original.bookingType;
        return (
          <div className="flex items-center gap-1">
            {bookingTypeIcons[type]}
            <span className="text-sm">{bookingTypeLabels[type]}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'totalAmount',
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right font-medium">{formatCurrency(row.original.totalAmount)}</div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const apt = row.original;
        return (
          <div className="flex items-center gap-2">
            <AppointmentStatusBadge status={apt.status} />
            {apt.hasConflict && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Has scheduling conflict</p>
                    {apt.conflictNotes && (
                      <p className="text-xs text-muted-foreground">{apt.conflictNotes}</p>
                    )}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <AppointmentActions
          appointment={row.original}
          canWrite={canWrite}
          onView={onView}
          onCheckIn={onCheckIn}
          onStart={onStart}
          onComplete={onComplete}
          onCancel={onCancel}
          onNoShow={onNoShow}
          onCheckout={onCheckout}
        />
      ),
    },
  ];
}

// ============================================
// Actions Component
// ============================================

interface AppointmentActionsProps {
  appointment: Appointment;
  canWrite: boolean;
  onView: (id: string) => void;
  onCheckIn: (id: string) => void;
  onStart: (id: string) => void;
  onComplete: (id: string) => void;
  onCancel: (id: string) => void;
  onNoShow: (id: string) => void;
  onCheckout?: (id: string) => void;
}

function AppointmentActions({
  appointment,
  canWrite,
  onView,
  onCheckIn,
  onStart,
  onComplete,
  onCancel,
  onNoShow,
  onCheckout,
}: AppointmentActionsProps) {
  const { status, id } = appointment;

  const canCheckIn = status === 'booked' || status === 'confirmed';
  const canStart = status === 'checked_in';
  const canComplete = status === 'in_progress';
  const canCancel = status === 'booked' || status === 'confirmed' || status === 'checked_in';
  const canMarkNoShow = status === 'booked' || status === 'confirmed';
  const canCheckout = status === 'in_progress' || status === 'completed';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onView(id)}>
          <Eye className="mr-2 h-4 w-4" />
          View Details
        </DropdownMenuItem>

        {canWrite && (
          <>
            <DropdownMenuSeparator />

            {canCheckIn && (
              <DropdownMenuItem onClick={() => onCheckIn(id)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Check In
              </DropdownMenuItem>
            )}

            {canStart && (
              <DropdownMenuItem onClick={() => onStart(id)}>
                <Play className="mr-2 h-4 w-4" />
                Start Service
              </DropdownMenuItem>
            )}

            {canComplete && (
              <DropdownMenuItem onClick={() => onComplete(id)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete
              </DropdownMenuItem>
            )}

            {canCheckout && onCheckout && (
              <DropdownMenuItem onClick={() => onCheckout(id)}>
                <CreditCard className="mr-2 h-4 w-4" />
                Checkout
              </DropdownMenuItem>
            )}

            {canCancel && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onCancel(id)} className="text-destructive">
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel
                </DropdownMenuItem>
              </>
            )}

            {canMarkNoShow && (
              <DropdownMenuItem onClick={() => onNoShow(id)} className="text-destructive">
                <Clock className="mr-2 h-4 w-4" />
                Mark No-Show
              </DropdownMenuItem>
            )}
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
