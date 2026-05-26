'use client';

/**
 * Complete Service Dialog
 * Allows selecting completion date/time when marking a service as complete
 * Shows warning for pending appointments from previous days
 */

import { useState, useEffect, useMemo } from 'react';
import { format, parseISO, isBefore, startOfDay } from 'date-fns';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DatePicker, TimePicker } from '@/components/common';

interface CompleteServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
  appointmentDate?: string; // ISO date string (e.g., "2026-05-24")
  appointmentTime?: string; // Time string (e.g., "10:30")
  onConfirm: (completedAt: string) => void;
  isLoading?: boolean;
  /** If true, shows "Complete & Checkout" instead of just "Complete" */
  isCheckoutMode?: boolean;
}

export function CompleteServiceDialog({
  open,
  onOpenChange,
  serviceName,
  appointmentDate,
  appointmentTime,
  onConfirm,
  isLoading = false,
  isCheckoutMode = false,
}: CompleteServiceDialogProps) {
  // Initialize with current date/time
  const now = useMemo(() => new Date(), []);
  const [completionDate, setCompletionDate] = useState<Date | undefined>(now);
  const [completionTime, setCompletionTime] = useState(format(now, 'HH:mm'));

  // Reset to current date/time when dialog opens
  useEffect(() => {
    if (open) {
      const currentNow = new Date();
      setCompletionDate(currentNow);
      setCompletionTime(format(currentNow, 'HH:mm'));
    }
  }, [open]);

  // Check if appointment is from a previous day (pending)
  const isPendingAppointment = useMemo(() => {
    if (!appointmentDate) return false;
    try {
      const aptDate = parseISO(appointmentDate);
      return isBefore(startOfDay(aptDate), startOfDay(new Date()));
    } catch {
      return false;
    }
  }, [appointmentDate]);

  // Format the appointment date for display
  const formattedAppointmentDate = useMemo(() => {
    if (!appointmentDate) return '';
    try {
      return format(parseISO(appointmentDate), 'EEEE, MMMM d, yyyy');
    } catch {
      return appointmentDate;
    }
  }, [appointmentDate]);

  const handleConfirm = () => {
    if (!completionDate) return;

    // Combine date and time into ISO string
    const [hours, minutes] = completionTime.split(':').map(Number);
    const completedAt = new Date(completionDate);
    completedAt.setHours(hours, minutes, 0, 0);

    onConfirm(completedAt.toISOString());
  };

  const confirmButtonText = isCheckoutMode ? 'Complete & Checkout' : 'Complete Service';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {isCheckoutMode ? 'Complete & Checkout' : 'Complete Service'}
          </DialogTitle>
          <DialogDescription>
            {isCheckoutMode
              ? `Mark "${serviceName}" as completed and proceed to checkout.`
              : `Mark "${serviceName}" as completed.`}
          </DialogDescription>
        </DialogHeader>

        {/* Pending Appointment Warning */}
        {isPendingAppointment && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-900">Pending Appointment</p>
              <p className="text-sm text-red-700 mt-0.5">
                This appointment was scheduled for{' '}
                <span className="font-medium">{formattedAppointmentDate}</span>
                {appointmentTime && ` at ${appointmentTime}`}. Please verify the completion
                date/time below.
              </p>
            </div>
          </div>
        )}

        {/* Date/Time Selection */}
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="completion-date" className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              Completion Date & Time
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <DatePicker
                value={completionDate}
                onChange={setCompletionDate}
                placeholder="Select date"
              />
              <TimePicker
                id="completion-time"
                value={completionTime}
                onChange={setCompletionTime}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              When was this service actually completed?
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={isLoading || !completionDate}>
            {isLoading ? 'Completing...' : confirmButtonText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
