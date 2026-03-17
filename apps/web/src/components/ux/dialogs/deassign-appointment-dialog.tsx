'use client';

/**
 * Deassign Appointment Dialog
 * Confirms deassignment of appointment from station
 */

import { useCallback } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useDeassignStation } from '@/hooks/queries/use-stations';
import { useBranchContext } from '@/hooks/use-branch-context';
import { toast } from 'sonner';

interface DeassignAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  customerName?: string;
  onSuccess?: () => void;
}

export function DeassignAppointmentDialog({
  open,
  onOpenChange,
  appointmentId,
  customerName,
  onSuccess,
}: DeassignAppointmentDialogProps) {
  const { branchId } = useBranchContext();
  const deassignMutation = useDeassignStation(branchId || undefined);

  const handleDeassign = useCallback(() => {
    deassignMutation.mutate(appointmentId, {
      onSuccess: () => {
        toast.success('Appointment deassigned from station');
        onOpenChange(false);
        onSuccess?.();
      },
      onError: (error: any) => {
        toast.error(error?.message || 'Failed to deassign appointment');
      },
    });
  }, [appointmentId, deassignMutation, onOpenChange, onSuccess]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Deassign Appointment
          </DialogTitle>
          <DialogDescription>
            {customerName ? (
              <>
                Are you sure you want to deassign{' '}
                <span className="font-medium">{customerName}</span> from the station? The
                appointment will remain checked-in.
              </>
            ) : (
              'Are you sure you want to deassign this appointment from the station? The appointment will remain checked-in.'
            )}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deassignMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDeassign}
            disabled={deassignMutation.isPending}
          >
            {deassignMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Deassigning...
              </>
            ) : (
              'Deassign'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
