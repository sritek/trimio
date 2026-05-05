/**
 * StatusBadge - Consistent status indicator across the app
 */

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusType =
  // Appointment statuses
  | 'booked'
  | 'confirmed'
  | 'checked_in'
  | 'in_progress'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled'
  | 'scheduled'
  | 'pending'
  // Service statuses
  | 'skipped'
  // Invoice statuses
  | 'draft'
  | 'finalized'
  | 'refunded'
  // Payment statuses
  | 'paid'
  | 'partial'
  | 'unpaid'
  // Membership statuses
  | 'active'
  | 'inactive'
  | 'frozen'
  | 'expired'
  | 'transferred'
  // Package types (short form)
  | 'value'
  | 'service'
  | 'combo'
  // Package types (full form)
  | 'value_package'
  | 'service_package'
  | 'combo_package'
  // Package statuses
  | 'depleted'
  | 'exhausted'
  // Queue statuses
  | 'waiting'
  | 'serving'
  | 'called'
  | 'left'
  // Audit statuses
  | 'posted'
  // General statuses
  | 'published';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'default';
  showDot?: boolean;
  label?: string; // Optional custom label for i18n support
  className?: string;
}

const STATUS_CONFIG: Record<StatusType, { label: string; variant: string; dotColor: string }> = {
  // Appointment statuses - unique colors for each
  booked: {
    label: 'Booked',
    variant: 'bg-sky-100 text-sky-800 hover:bg-sky-100',
    dotColor: 'bg-sky-500',
  },
  confirmed: {
    label: 'Confirmed',
    variant: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
    dotColor: 'bg-emerald-500',
  },
  checked_in: {
    label: 'Checked In',
    variant: 'bg-violet-100 text-violet-800 hover:bg-violet-100',
    dotColor: 'bg-violet-500',
  },
  in_progress: {
    label: 'In Progress',
    variant: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
    dotColor: 'bg-amber-500',
  },
  completed: {
    label: 'Completed',
    variant: 'bg-slate-100 text-slate-600 hover:bg-slate-100',
    dotColor: 'bg-slate-400',
  },
  cancelled: {
    label: 'Cancelled',
    variant: 'bg-red-100 text-red-800 hover:bg-red-100',
    dotColor: 'bg-red-500',
  },
  no_show: {
    label: 'No Show',
    variant: 'bg-rose-100 text-rose-800 hover:bg-rose-100',
    dotColor: 'bg-rose-500',
  },
  rescheduled: {
    label: 'Rescheduled',
    variant: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
    dotColor: 'bg-orange-500',
  },
  scheduled: {
    label: 'Scheduled',
    variant: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    dotColor: 'bg-blue-500',
  },
  pending: {
    label: 'Pending',
    variant: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    dotColor: 'bg-yellow-500',
  },

  // Service statuses
  skipped: {
    label: 'Skipped',
    variant: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    dotColor: 'bg-gray-500',
  },

  // Invoice statuses
  draft: {
    label: 'Draft',
    variant: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    dotColor: 'bg-yellow-500',
  },
  finalized: {
    label: 'Finalized',
    variant: 'bg-green-100 text-green-800 hover:bg-green-100',
    dotColor: 'bg-green-500',
  },
  refunded: {
    label: 'Refunded',
    variant: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    dotColor: 'bg-gray-500',
  },

  // Payment statuses
  paid: {
    label: 'Paid',
    variant: 'bg-green-100 text-green-800 hover:bg-green-100',
    dotColor: 'bg-green-500',
  },
  partial: {
    label: 'Partial',
    variant: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    dotColor: 'bg-yellow-500',
  },
  unpaid: {
    label: 'Unpaid',
    variant: 'bg-red-100 text-red-800 hover:bg-red-100',
    dotColor: 'bg-red-500',
  },

  // Membership statuses
  active: {
    label: 'Active',
    variant: 'bg-green-100 text-green-800 hover:bg-green-100',
    dotColor: 'bg-green-500',
  },
  inactive: {
    label: 'Inactive',
    variant: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    dotColor: 'bg-gray-500',
  },
  frozen: {
    label: 'Frozen',
    variant: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    dotColor: 'bg-blue-500',
  },
  expired: {
    label: 'Expired',
    variant: 'bg-red-100 text-red-800 hover:bg-red-100',
    dotColor: 'bg-red-500',
  },
  transferred: {
    label: 'Transferred',
    variant: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
    dotColor: 'bg-purple-500',
  },

  // Package types (short form)
  value: {
    label: 'Value',
    variant: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
    dotColor: 'bg-emerald-500',
  },
  service: {
    label: 'Service',
    variant: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    dotColor: 'bg-blue-500',
  },
  combo: {
    label: 'Combo',
    variant: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
    dotColor: 'bg-purple-500',
  },

  // Package types (full form)
  value_package: {
    label: 'Value Package',
    variant: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
    dotColor: 'bg-emerald-500',
  },
  service_package: {
    label: 'Service Package',
    variant: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    dotColor: 'bg-blue-500',
  },
  combo_package: {
    label: 'Combo Package',
    variant: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
    dotColor: 'bg-purple-500',
  },

  // Package statuses
  depleted: {
    label: 'Depleted',
    variant: 'bg-gray-100 text-gray-800 hover:bg-gray-100',
    dotColor: 'bg-gray-500',
  },
  exhausted: {
    label: 'Exhausted',
    variant: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    dotColor: 'bg-blue-500',
  },

  // Queue statuses
  waiting: {
    label: 'Waiting',
    variant: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100',
    dotColor: 'bg-yellow-500',
  },
  serving: {
    label: 'Serving',
    variant: 'bg-green-100 text-green-800 hover:bg-green-100',
    dotColor: 'bg-green-500',
  },
  called: {
    label: 'Called',
    variant: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    dotColor: 'bg-blue-500',
  },
  left: {
    label: 'Left',
    variant: 'bg-red-100 text-red-800 hover:bg-red-100',
    dotColor: 'bg-red-500',
  },

  // Audit statuses
  posted: {
    label: 'Posted',
    variant: 'bg-green-100 text-green-800 hover:bg-green-100',
    dotColor: 'bg-green-500',
  },

  // General statuses
  published: {
    label: 'Published',
    variant: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
    dotColor: 'bg-blue-500',
  },
};

export function StatusBadge({
  status,
  size = 'default',
  showDot = false,
  label,
  className,
}: StatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.pending;

  return (
    <Badge
      variant="outline"
      className={cn(
        config.variant,
        size === 'sm' && 'text-xs px-2 py-0',
        'border-transparent font-medium',
        className
      )}
    >
      {showDot && <span className={cn('w-2 h-2 rounded-full mr-1.5', config.dotColor)} />}
      {label ?? config.label}
    </Badge>
  );
}
