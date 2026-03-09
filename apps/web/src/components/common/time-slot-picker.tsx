'use client';

/**
 * TimeSlotPicker - Enhanced time picker with quick-select slots and busy slot indicators
 *
 * Features:
 * - Button trigger showing selected time
 * - Popover with manual time input
 * - Quick-select grid of time slots
 * - Visual indicators for busy slots (appointments, breaks, blocked)
 * - Suggested available slots section
 * - Configurable slot interval and working hours
 * - Loading state while fetching busy slots
 */

import { useMemo } from 'react';
import { Clock, AlertCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import type { BusySlot } from '@/types/appointments';

interface TimeSlotPickerProps {
  /** Selected time in HH:mm format */
  value: string;
  /** Callback when time changes */
  onChange: (time: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Start hour (0-23) */
  startHour?: number;
  /** End hour (0-23) */
  endHour?: number;
  /** Interval in minutes (15, 30, 60) */
  interval?: number;
  /** Show error state */
  hasError?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Busy slots to show as unavailable */
  busySlots?: BusySlot[];
  /** Loading state for busy slots */
  isLoadingBusySlots?: boolean;
  /** Duration of the appointment in minutes (for conflict checking) */
  appointmentDuration?: number;
}

/**
 * Check if a time slot overlaps with any busy slot
 */
function getSlotStatus(
  slotTime: string,
  busySlots: BusySlot[],
  duration: number
): { isBusy: boolean; busySlot?: BusySlot } {
  if (!busySlots.length) return { isBusy: false };

  // Calculate slot end time
  const [hours, mins] = slotTime.split(':').map(Number);
  const slotStartMinutes = hours * 60 + mins;
  const slotEndMinutes = slotStartMinutes + duration;
  const slotEndTime = `${Math.floor(slotEndMinutes / 60)
    .toString()
    .padStart(2, '0')}:${(slotEndMinutes % 60).toString().padStart(2, '0')}`;

  for (const busy of busySlots) {
    // Check if slot overlaps with busy period
    if (slotTime < busy.endTime && slotEndTime > busy.startTime) {
      return { isBusy: true, busySlot: busy };
    }
  }

  return { isBusy: false };
}

/**
 * Format time for display (e.g., "09:30" -> "9:30 AM")
 */
function formatDisplayTime(time: string): string {
  const [hours, minutes] = time.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function TimeSlotPicker({
  value,
  onChange,
  placeholder = 'Select time',
  startHour = 9,
  endHour = 20,
  interval = 30,
  hasError = false,
  disabled = false,
  className,
  busySlots = [],
  isLoadingBusySlots = false,
  appointmentDuration = 30,
}: TimeSlotPickerProps) {
  // Generate time slots based on configuration
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      for (let min = 0; min < 60; min += interval) {
        // Don't add slots past the end hour
        if (hour === endHour && min > 0) break;
        slots.push(`${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`);
      }
    }
    return slots;
  }, [startHour, endHour, interval]);

  // Calculate slot statuses
  const slotStatuses = useMemo(() => {
    return timeSlots.map((time) => ({
      time,
      ...getSlotStatus(time, busySlots, appointmentDuration),
    }));
  }, [timeSlots, busySlots, appointmentDuration]);

  // Get suggested available slots (first 3 available)
  const suggestedSlots = useMemo(() => {
    if (!busySlots.length) return [];
    return slotStatuses.filter((s) => !s.isBusy).slice(0, 4);
  }, [slotStatuses, busySlots]);

  // Format display time
  const displayTime = useMemo(() => {
    if (!value) return null;
    return formatDisplayTime(value);
  }, [value]);

  // Check if selected time is in a busy slot
  const selectedSlotStatus = useMemo(() => {
    if (!value) return { isBusy: false };
    return getSlotStatus(value, busySlots, appointmentDuration);
  }, [value, busySlots, appointmentDuration]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled || isLoadingBusySlots}
          className={cn(
            'w-full justify-start font-normal',
            !value && 'text-muted-foreground',
            hasError && 'border-destructive',
            selectedSlotStatus.isBusy && 'border-amber-500 bg-amber-50 dark:bg-amber-950/20',
            isLoadingBusySlots && 'opacity-70',
            className
          )}
        >
          {isLoadingBusySlots ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading schedule...
            </>
          ) : (
            <>
              <Clock className="mr-2 h-4 w-4" />
              {displayTime || placeholder}
              {selectedSlotStatus.isBusy && (
                <AlertCircle className="ml-auto h-4 w-4 text-amber-500" />
              )}
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-3"
        align="start"
        onWheelCapture={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          {/* Loading state */}
          {isLoadingBusySlots && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading stylist schedule...
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <div className="flex gap-1.5">
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-7 w-16" />
                </div>
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-4 w-20" />
                <div className="grid grid-cols-4 gap-1.5">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <Skeleton key={i} className="h-8" />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Content when not loading */}
          {!isLoadingBusySlots && (
            <>
              {/* Warning if selected time is busy */}
              {selectedSlotStatus.isBusy && selectedSlotStatus.busySlot && (
                <div className="flex items-start gap-2 p-2 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-sm">
                  <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Stylist busy {selectedSlotStatus.busySlot.startTime} -{' '}
                      {selectedSlotStatus.busySlot.endTime}
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      {selectedSlotStatus.busySlot.label || selectedSlotStatus.busySlot.type}
                    </p>
                  </div>
                </div>
              )}

              {/* Suggested available slots */}
              {suggestedSlots.length > 0 && (
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Suggested available times
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestedSlots.map(({ time }) => (
                      <Button
                        key={time}
                        type="button"
                        variant={value === time ? 'default' : 'secondary'}
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => onChange(time)}
                      >
                        {formatDisplayTime(time)}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Manual time input */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Enter exact time
                </Label>
                <Input
                  type="time"
                  value={value || ''}
                  onChange={(e) => onChange(e.target.value)}
                  className="w-full"
                />
              </div>

              {/* Quick select grid */}
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  {busySlots.length > 0 ? 'All time slots' : 'Quick select'}
                </Label>
                <div className="grid grid-cols-4 gap-1.5 max-h-48 overflow-y-auto">
                  <TooltipProvider delayDuration={200}>
                    {slotStatuses.map(({ time, isBusy, busySlot }) => (
                      <Tooltip key={time}>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant={value === time ? 'default' : isBusy ? 'ghost' : 'ghost'}
                            size="sm"
                            className={cn(
                              'h-8 text-xs relative',
                              isBusy && value !== time && 'text-muted-foreground/50 line-through',
                              isBusy && value !== time && 'bg-muted/30'
                            )}
                            onClick={() => onChange(time)}
                          >
                            {time}
                            {isBusy && value !== time && (
                              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-400" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        {isBusy && busySlot && (
                          <TooltipContent side="top" className="text-xs">
                            <p className="font-medium">
                              {busySlot.type === 'appointment'
                                ? 'Appointment'
                                : busySlot.type === 'break'
                                  ? 'Break'
                                  : 'Blocked'}
                            </p>
                            <p className="text-muted-foreground">
                              {busySlot.startTime} - {busySlot.endTime}
                              {busySlot.label && ` • ${busySlot.label}`}
                            </p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    ))}
                  </TooltipProvider>
                </div>
              </div>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
