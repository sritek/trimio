'use client';

/**
 * Confirm Appointment Dialog
 *
 * Simple confirmation dialog for confirming booked appointments.
 */

import { useCallback } from 'react';
import { CheckCircle } from 'lucide-react';

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

interface ConfirmAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  customerName?: string;
  scheduledTime?: string;
  onSuccess?: () => void;
}

export function ConfirmAppointmentDialog({
  open,
  onOpenChange,
  appointmentId,
  customerName,
  scheduledTime,
  onSuccess,
}: ConfirmAppointmentDialogProps) {
  const updateStatusMutation = useUpdateAppointmentStatus();

  const handleConfirm = useCallback(async () => {
    try {
      await updateStatusMutation.mutateAsync({
        id: appointmentId,
        status: 'confirmed',
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to confirm appointment:', error);
    }
  }, [appointmentId, updateStatusMutation, onOpenChange, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Confirm Appointment
          </DialogTitle>
          <DialogDescription>
            {customerName ? (
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
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            This will mark the appointment as confirmed and notify the customer if notifications are
            enabled.
          </p>
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
          <Button type="button" onClick={handleConfirm} disabled={updateStatusMutation.isPending}>
            {updateStatusMutation.isPending ? 'Confirming...' : 'Confirm Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
