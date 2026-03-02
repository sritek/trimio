'use client';

/**
 * Cancel Appointment Dialog
 *
 * Dialog for cancelling appointments with reason collection.
 * Uses useCancelAppointment hook for proper cancellation.
 */

import { useState, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useCancelAppointment } from '@/hooks/queries/use-appointments';

interface CancelAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  customerName?: string;
  onSuccess?: () => void;
}

export function CancelAppointmentDialog({
  open,
  onOpenChange,
  appointmentId,
  customerName,
  onSuccess,
}: CancelAppointmentDialogProps) {
  const [reason, setReason] = useState('');
  const [isSalonCancelled, setIsSalonCancelled] = useState(false);

  const cancelMutation = useCancelAppointment();

  const handleCancel = useCallback(async () => {
    if (!reason.trim()) return;

    try {
      await cancelMutation.mutateAsync({
        id: appointmentId,
        data: {
          reason: reason.trim(),
          isSalonCancelled,
        },
      });
      setReason('');
      setIsSalonCancelled(false);
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to cancel appointment:', error);
    }
  }, [appointmentId, reason, isSalonCancelled, cancelMutation, onOpenChange, onSuccess]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setReason('');
        setIsSalonCancelled(false);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            Cancel Appointment
          </DialogTitle>
          <DialogDescription>
            {customerName
              ? `Cancel the appointment for ${customerName}. This action cannot be undone.`
              : 'Cancel this appointment. This action cannot be undone.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">
              Reason for cancellation <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="cancel-reason"
              placeholder="Please provide a reason for cancellation..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="salon-cancelled" className="text-sm font-medium">
                Cancelled by salon
              </Label>
              <p className="text-xs text-muted-foreground">
                Enable if the salon initiated this cancellation
              </p>
            </div>
            <Switch
              id="salon-cancelled"
              checked={isSalonCancelled}
              onCheckedChange={setIsSalonCancelled}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={cancelMutation.isPending}
          >
            Keep Appointment
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleCancel}
            disabled={!reason.trim() || cancelMutation.isPending}
          >
            {cancelMutation.isPending ? 'Cancelling...' : 'Cancel Appointment'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
