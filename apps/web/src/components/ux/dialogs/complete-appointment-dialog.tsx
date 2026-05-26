'use client';

import { useState, useCallback } from 'react';
import { format, differenceInMinutes } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { useCompleteAppointment } from '@/hooks/queries/use-appointments';
import { useTranslations } from 'next-intl';

interface CompleteAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  customerName: string;
  scheduledStartTime: string; // HH:mm format
  scheduledEndTime: string; // HH:mm format
  actualStartTime: Date | null;
  onSuccess?: () => void;
}

export function CompleteAppointmentDialog({
  open,
  onOpenChange,
  appointmentId,
  customerName,
  scheduledStartTime,
  scheduledEndTime,
  actualStartTime,
  onSuccess,
}: CompleteAppointmentDialogProps) {
  const t = useTranslations('appointments.complete');
  const { handleError } = useErrorHandler();
  const completeAppointment = useCompleteAppointment();

  // Calculate default end time (current time)
  const now = new Date();
  const defaultEndTime = format(now, 'HH:mm');
  const [endTime, setEndTime] = useState(defaultEndTime);

  // Calculate durations for display
  const calculateMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const scheduledStartMinutes = calculateMinutes(scheduledStartTime);
  const scheduledEndMinutes = calculateMinutes(scheduledEndTime);
  const actualEndMinutes = calculateMinutes(endTime);

  const scheduledDuration = scheduledEndMinutes - scheduledStartMinutes;
  const actualDuration = actualStartTime
    ? differenceInMinutes(new Date(`2024-01-01T${endTime}`), actualStartTime)
    : actualEndMinutes - scheduledStartMinutes;

  const variance = actualDuration - scheduledDuration;
  const isOvertime = variance > 0;

  const handleComplete = useCallback(async () => {
    try {
      // Create ISO datetime for the end time (use today's date)
      const today = format(new Date(), 'yyyy-MM-dd');
      const actualEndDateTime = `${today}T${endTime}:00Z`;

      await completeAppointment.mutateAsync({
        appointmentId,
        actualEndTime: actualEndDateTime,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      handleError(error, {
        customMessage: t('completeError'),
      });
    }
  }, [appointmentId, endTime, completeAppointment, onOpenChange, onSuccess, handleError, t]);

  // Prevent closing dialog while mutation is pending
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && completeAppointment.isPending) {
        return;
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, completeAppointment.isPending]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-md"
        onPointerDownOutside={(e) => {
          // Prevent closing by clicking outside while pending
          if (completeAppointment.isPending) {
            e.preventDefault();
          }
        }}
        onEscapeKeyDown={(e) => {
          // Prevent closing by escape key while pending
          if (completeAppointment.isPending) {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Name */}
          <div>
            <Label className="text-sm text-gray-600">{t('customer')}</Label>
            <p className="font-medium">{customerName}</p>
          </div>

          {/* Scheduled Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-sm text-gray-600">{t('scheduledTime')}</Label>
              <p className="font-medium">
                {scheduledStartTime} - {scheduledEndTime}
              </p>
              <p className="text-xs text-gray-500">
                {scheduledDuration} {t('minutes')}
              </p>
            </div>

            {/* Actual Time */}
            <div>
              <Label className="text-sm text-gray-600">{t('actualTime')}</Label>
              <p className="font-medium">
                {scheduledStartTime} - {endTime}
              </p>
              <p className={`text-xs ${isOvertime ? 'text-red-600' : 'text-green-600'}`}>
                {actualDuration} {t('minutes')}
                {variance !== 0 && (
                  <span className="ml-1">
                    ({isOvertime ? '+' : ''}
                    {variance} {t('minutes')})
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* End Time Input */}
          <div>
            <Label htmlFor="end-time" className="text-sm">
              {t('endTime')}
            </Label>
            <Input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">{t('endTimeHint')}</p>
          </div>

          {/* Variance Warning */}
          {isOvertime && variance > 15 && (
            <div className="bg-orange-50 border border-orange-200 rounded p-3">
              <p className="text-sm text-orange-800">
                {t('overtimeWarning', { minutes: variance })}
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={completeAppointment.isPending}
          >
            {t('cancel')}
          </Button>
          <Button onClick={handleComplete} disabled={completeAppointment.isPending}>
            {completeAppointment.isPending ? t('completing') : t('complete')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
