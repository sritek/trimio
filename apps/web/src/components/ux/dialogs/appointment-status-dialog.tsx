'use client';

/**
 * Appointment Status Dialog
 *
 * A reusable confirmation dialog for simple appointment status changes.
 * Supports: confirm, check_in, no_show
 *
 * For complex status changes (cancel with reason, start with station), use dedicated dialogs.
 */

import { useCallback } from 'react';
import { CheckCircle, UserCheck, AlertTriangle, type LucideIcon } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useUpdateAppointmentStatus } from '@/hooks/queries/use-appointments';
import type { AppointmentStatus } from '@/types/appointments';

type SimpleStatusChange = 'confirmed' | 'checked_in' | 'no_show';

interface StatusConfig {
  icon: LucideIcon;
  iconColor: string;
  title: string;
  getDescription: (customerName?: string, scheduledTime?: string) => React.ReactNode;
  helpText: string;
  confirmText: string;
  confirmingText: string;
  variant: 'default' | 'destructive';
}

const STATUS_CONFIGS: Record<SimpleStatusChange, StatusConfig> = {
  confirmed: {
    icon: CheckCircle,
    iconColor: 'text-green-600',
    title: 'Confirm Appointment',
    getDescription: (customerName, scheduledTime) =>
      customerName ? (
        <>
          Confirm the appointment for <span className="font-medium">{customerName}</span>
          {scheduledTime && (
            <>
              {' '}
              at <span className="font-medium">{scheduledTime}</span>
            </>
          )}
          ?
        </>
      ) : (
        'Confirm this appointment?'
      ),
    helpText:
      'This will mark the appointment as confirmed and notify the customer if notifications are enabled.',
    confirmText: 'Confirm Appointment',
    confirmingText: 'Confirming...',
    variant: 'default',
  },
  checked_in: {
    icon: UserCheck,
    iconColor: 'text-blue-600',
    title: 'Check In Customer',
    getDescription: (customerName, scheduledTime) =>
      customerName ? (
        <>
          Check in <span className="font-medium">{customerName}</span>
          {scheduledTime && (
            <>
              {' '}
              for their <span className="font-medium">{scheduledTime}</span> appointment
            </>
          )}
          ?
        </>
      ) : (
        'Check in this customer?'
      ),
    helpText: 'This will mark the customer as arrived and ready for their appointment.',
    confirmText: 'Check In',
    confirmingText: 'Checking in...',
    variant: 'default',
  },
  no_show: {
    icon: AlertTriangle,
    iconColor: 'text-amber-600',
    title: 'Mark as No-Show',
    getDescription: (customerName) =>
      customerName ? (
        <>
          Mark <span className="font-medium">{customerName}</span> as a no-show?
        </>
      ) : (
        'Mark this appointment as a no-show?'
      ),
    helpText:
      "This will record that the customer didn't show up. Repeated no-shows may affect their booking privileges.",
    confirmText: 'Mark No-Show',
    confirmingText: 'Marking...',
    variant: 'destructive',
  },
};

interface AppointmentStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  targetStatus: SimpleStatusChange;
  customerName?: string;
  scheduledTime?: string;
  onSuccess?: () => void;
}

export function AppointmentStatusDialog({
  open,
  onOpenChange,
  appointmentId,
  targetStatus,
  customerName,
  scheduledTime,
  onSuccess,
}: AppointmentStatusDialogProps) {
  const updateStatusMutation = useUpdateAppointmentStatus();
  const config = STATUS_CONFIGS[targetStatus];
  const Icon = config.icon;

  const handleConfirm = useCallback(async () => {
    try {
      await updateStatusMutation.mutateAsync({
        id: appointmentId,
        status: targetStatus as AppointmentStatus,
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error(`Failed to update appointment status to ${targetStatus}:`, error);
    }
  }, [appointmentId, targetStatus, updateStatusMutation, onOpenChange, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${config.iconColor}`} />
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {config.getDescription(customerName, scheduledTime)}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">{config.helpText}</p>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateStatusMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant={config.variant}
            onClick={handleConfirm}
            disabled={updateStatusMutation.isPending}
          >
            {updateStatusMutation.isPending ? config.confirmingText : config.confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
