'use client';

import { AlertTriangle, Calendar, Eye, Phone, User } from 'lucide-react';

import { formatCurrency } from '@/lib/format';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  onView: (id: string) => void;
}

export function getAppointmentColumns({ onView }: GetColumnsOptions): ColumnDef<Appointment>[] {
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
        <Button variant="ghost" size="icon" onClick={() => onView(row.original.id)}>
          <Eye className="h-4 w-4" />
        </Button>
      ),
    },
  ];
}
