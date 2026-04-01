'use client';

/**
 * Reschedule Appointment Dialog
 *
 * Dialog for rescheduling appointments with:
 * - Date picker
 * - Hybrid time picker (native input + quick select)
 * - Optional stylist change
 * - Reason field
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, User, RefreshCw, AlertTriangle } from 'lucide-react';

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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DatePicker } from '@/components/common';
import { useRescheduleAppointment } from '@/hooks/queries/use-appointments';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useBranchContext } from '@/hooks/use-branch-context';
import { cn } from '@/lib/utils';
import type { Appointment } from '@/types/appointments';

interface RescheduleAppointmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointment: Appointment;
  onSuccess?: () => void;
}

const MAX_RESCHEDULES = 3;

/**
 * Parse a date string to Date object for display
 * Handles both 'yyyy-MM-dd' and ISO datetime formats
 */
function parseDateString(dateStr: string): Date {
  // If it's an ISO datetime string, extract just the date part
  const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
  // Create date using local timezone by parsing as yyyy-MM-dd
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a date string to 'yyyy-MM-dd' for API
 * Handles both 'yyyy-MM-dd' and ISO datetime formats
 */
function toDateString(dateStr: string): string {
  return dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
}

export function RescheduleAppointmentDialog({
  open,
  onOpenChange,
  appointment,
  onSuccess,
}: RescheduleAppointmentDialogProps) {
  const { branchId } = useBranchContext();

  // Form state
  const [newDate, setNewDate] = useState<string>('');
  const [newTime, setNewTime] = useState<string>('');
  const [stylistId, setStylistId] = useState<string>('');
  const [reason, setReason] = useState<string>('');

  // Fetch stylists
  const { data: staffData, isLoading: staffLoading } = useStaffList({
    branchId: branchId || '',
    role: 'stylist',
  });

  const rescheduleMutation = useRescheduleAppointment();

  // Initialize form when dialog opens
  useEffect(() => {
    if (open && appointment) {
      setNewDate(toDateString(appointment.scheduledDate));
      setNewTime(appointment.scheduledTime);
      setStylistId(appointment.stylistId || '');
      setReason('');
    }
  }, [open, appointment]);

  // Generate time slots (30-min intervals for quick select)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 9; hour <= 20; hour++) {
      for (let min = 0; min < 60; min += 30) {
        slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!newDate || !newTime) return;

    try {
      await rescheduleMutation.mutateAsync({
        id: appointment.id,
        data: {
          newDate,
          newTime,
          stylistId: stylistId || undefined,
          reason: reason || undefined,
        },
      });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to reschedule appointment:', error);
    }
  }, [
    appointment.id,
    newDate,
    newTime,
    stylistId,
    reason,
    rescheduleMutation,
    onOpenChange,
    onSuccess,
  ]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen) {
        setNewDate('');
        setNewTime('');
        setStylistId('');
        setReason('');
      }
      onOpenChange(newOpen);
    },
    [onOpenChange]
  );

  const stylists = staffData?.data || [];
  const rescheduleCount = appointment.rescheduleCount || 0;
  const canReschedule = rescheduleCount < MAX_RESCHEDULES;

  // Check if date/time has changed
  const hasChanges =
    newDate !== appointment.scheduledDate ||
    newTime !== appointment.scheduledTime ||
    stylistId !== (appointment.stylistId || '');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Reschedule Appointment
          </DialogTitle>
          <DialogDescription>
            Change the date, time, or stylist for this appointment.
          </DialogDescription>
        </DialogHeader>

        {!canReschedule ? (
          <div className="py-6 text-center">
            <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <h3 className="font-semibold mb-2">Reschedule limit reached</h3>
            <p className="text-sm text-muted-foreground">
              This appointment has been rescheduled {rescheduleCount} times.
              <br />
              Maximum {MAX_RESCHEDULES} reschedules allowed.
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Current schedule info */}
            <div className="p-3 rounded-lg bg-muted/50 text-sm">
              <p className="text-muted-foreground mb-1">Current schedule:</p>
              <p className="font-medium">
                {format(parseDateString(appointment.scheduledDate), 'EEE, MMM d, yyyy')} at{' '}
                {appointment.scheduledTime}
              </p>
              {rescheduleCount > 0 && (
                <p className="text-xs text-amber-600 mt-1">
                  Rescheduled {rescheduleCount} of {MAX_RESCHEDULES} times
                </p>
              )}
            </div>

            {/* New Date */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                New Date
              </Label>
              <DatePicker
                value={newDate ? parseDateString(newDate) : undefined}
                onChange={(date) => setNewDate(date ? format(date, 'yyyy-MM-dd') : '')}
                placeholder="Select new date"
              />
            </div>

            {/* New Time - Hybrid */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                New Time
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'w-full justify-start font-normal',
                      !newTime && 'text-muted-foreground'
                    )}
                  >
                    <Clock className="mr-2 h-4 w-4" />
                    {newTime || 'Select time'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-3" align="start">
                  <div className="space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">
                        Enter exact time
                      </Label>
                      <Input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1.5 block">
                        Quick select
                      </Label>
                      <div className="grid grid-cols-4 gap-1.5 max-h-40 overflow-y-auto">
                        {timeSlots.map((time) => (
                          <Button
                            key={time}
                            type="button"
                            variant={newTime === time ? 'default' : 'ghost'}
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => setNewTime(time)}
                          >
                            {time}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            {/* Stylist Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                Stylist
                <span className="text-muted-foreground font-normal text-xs">(optional change)</span>
              </Label>
              {staffLoading ? (
                <div className="flex gap-2">
                  <Skeleton className="h-14 w-14 rounded-lg" />
                  <Skeleton className="h-14 w-14 rounded-lg" />
                  <Skeleton className="h-14 w-14 rounded-lg" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {stylists.map((stylist) => (
                    <button
                      key={stylist.userId}
                      type="button"
                      onClick={() => setStylistId(stylist.userId)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all min-w-[70px]',
                        stylistId === stylist.userId
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'hover:bg-muted/50'
                      )}
                    >
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          className={cn(
                            'text-xs font-medium',
                            stylistId === stylist.userId
                              ? 'bg-primary text-primary-foreground'
                              : 'bg-muted'
                          )}
                        >
                          {(stylist.user?.name || 'U').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-center truncate max-w-[60px]">
                        {stylist.user?.name || 'Unknown'}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-2">
              <Label>
                Reason <span className="text-muted-foreground font-normal text-xs">(optional)</span>
              </Label>
              <Textarea
                placeholder="Why is this appointment being rescheduled?"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={rescheduleMutation.isPending}
          >
            Cancel
          </Button>
          {canReschedule && (
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!newDate || !newTime || !hasChanges || rescheduleMutation.isPending}
            >
              {rescheduleMutation.isPending ? 'Rescheduling...' : 'Reschedule'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
