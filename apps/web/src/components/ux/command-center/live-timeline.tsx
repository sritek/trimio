'use client';

/**
 * Live Timeline Component
 * Shows a compact timeline of the next 2 hours with stylist schedules
 * Requirements: 4.7
 */

import { memo, useMemo } from 'react';
import { format, addMinutes, parseISO, differenceInMinutes } from 'date-fns';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { TimelineEntry } from '@/types/dashboard';

interface LiveTimelineProps {
  entries: TimelineEntry[];
  currentTime: Date;
  isLoading?: boolean;
  onSlotClick?: (stylistId: string, time: string) => void;
  onAppointmentClick?: (appointmentId: string) => void;
  className?: string;
}

// Generate time slots for the next 2 hours in 30-minute intervals
function generateTimeSlots(currentTime: Date): Date[] {
  const slots: Date[] = [];
  // Round down to nearest 30 minutes
  const startMinutes = Math.floor(currentTime.getMinutes() / 30) * 30;
  const start = new Date(currentTime);
  start.setMinutes(startMinutes, 0, 0);

  // Generate 5 slots (2.5 hours)
  for (let i = 0; i < 5; i++) {
    slots.push(addMinutes(start, i * 30));
  }
  return slots;
}

const STATUS_COLORS: Record<string, string> = {
  booked: 'bg-sky-500',
  confirmed: 'bg-emerald-500',
  checked_in: 'bg-violet-500',
  in_progress: 'bg-amber-500',
  completed: 'bg-slate-400',
  cancelled: 'bg-red-500',
  no_show: 'bg-rose-500',
};

function LiveTimelineComponent({
  entries,
  currentTime,
  isLoading,
  onSlotClick,
  onAppointmentClick,
  className,
}: LiveTimelineProps) {
  const timeSlots = useMemo(() => generateTimeSlots(currentTime), [currentTime]);

  // Calculate current time position as percentage
  const currentTimePosition = useMemo(() => {
    const startTime = timeSlots[0];
    const endTime = timeSlots[timeSlots.length - 1];
    const totalMinutes = differenceInMinutes(endTime, startTime);
    const elapsedMinutes = differenceInMinutes(currentTime, startTime);
    return Math.max(0, Math.min(100, (elapsedMinutes / totalMinutes) * 100));
  }, [currentTime, timeSlots]);

  if (isLoading) {
    return (
      <div className={cn('space-y-4', className)}>
        <h3 className="text-lg font-semibold">Timeline</h3>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <TimelineRowSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-4', className)}>
      <h3 className="text-lg font-semibold">Timeline</h3>

      <div className="relative">
        {/* Time header */}
        <div className="flex mb-2 pl-12">
          {timeSlots.map((slot, i) => (
            <div key={i} className="flex-1 text-xs text-muted-foreground text-center">
              {format(slot, 'h:mm a')}
            </div>
          ))}
        </div>

        {/* Current time indicator */}
        <div
          className="absolute top-8 bottom-0 w-0.5 bg-red-500 z-10"
          style={{ left: `calc(48px + ${currentTimePosition}% * (100% - 48px) / 100)` }}
        >
          <div className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-red-500" />
        </div>

        {/* Stylist rows */}
        <div className="space-y-2">
          {entries.map((entry) => (
            <TimelineRow
              key={entry.stylistId}
              entry={entry}
              timeSlots={timeSlots}
              onSlotClick={onSlotClick}
              onAppointmentClick={onAppointmentClick}
            />
          ))}
        </div>

        {entries.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No stylists scheduled for this time period.
          </div>
        )}
      </div>
    </div>
  );
}

interface TimelineRowProps {
  entry: TimelineEntry;
  timeSlots: Date[];
  onSlotClick?: (stylistId: string, time: string) => void;
  onAppointmentClick?: (appointmentId: string) => void;
}

function TimelineRow({ entry, timeSlots, onSlotClick, onAppointmentClick }: TimelineRowProps) {
  const startTime = timeSlots[0];
  const endTime = addMinutes(timeSlots[timeSlots.length - 1], 30);
  const totalMinutes = differenceInMinutes(endTime, startTime);

  // Calculate appointment positions
  const appointmentBlocks = useMemo(() => {
    return entry.appointments
      .map((apt) => {
        const aptStart = parseISO(apt.startTime);
        const aptEnd = parseISO(apt.endTime);

        // Clamp to visible range
        const visibleStart = aptStart < startTime ? startTime : aptStart;
        const visibleEnd = aptEnd > endTime ? endTime : aptEnd;

        const leftMinutes = differenceInMinutes(visibleStart, startTime);
        const widthMinutes = differenceInMinutes(visibleEnd, visibleStart);

        return {
          ...apt,
          left: (leftMinutes / totalMinutes) * 100,
          width: (widthMinutes / totalMinutes) * 100,
          isVisible: widthMinutes > 0,
        };
      })
      .filter((apt) => apt.isVisible);
  }, [entry.appointments, startTime, endTime, totalMinutes]);

  return (
    <div className="flex items-center gap-2 h-10">
      {/* Stylist avatar */}
      <div className="w-10 shrink-0">
        <Avatar className="h-8 w-8">
          <AvatarImage src={entry.avatar || undefined} alt={entry.stylistName} />
          <AvatarFallback className="text-xs">
            {entry.stylistName
              .split(' ')
              .map((n) => n[0])
              .join('')
              .slice(0, 2)}
          </AvatarFallback>
        </Avatar>
      </div>

      {/* Timeline track */}
      <div
        className="flex-1 relative h-8 bg-muted rounded cursor-pointer"
        onClick={(e) => {
          if (onSlotClick) {
            // Calculate clicked time based on position
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left;
            const percentage = clickX / rect.width;
            const clickedMinutes = Math.round((percentage * totalMinutes) / 30) * 30;
            const clickedTime = addMinutes(startTime, clickedMinutes);
            onSlotClick(entry.stylistId, clickedTime.toISOString());
          }
        }}
      >
        {/* Appointment blocks */}
        <TooltipProvider>
          {appointmentBlocks.map((apt) => (
            <Tooltip key={apt.id}>
              <TooltipTrigger asChild>
                <div
                  className={cn(
                    'absolute top-1 bottom-1 rounded cursor-pointer transition-opacity hover:opacity-80',
                    STATUS_COLORS[apt.status] || 'bg-blue-500'
                  )}
                  style={{
                    left: `${apt.left}%`,
                    width: `${apt.width}%`,
                    minWidth: '4px',
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onAppointmentClick) {
                      onAppointmentClick(apt.id);
                    }
                  }}
                >
                  {apt.width > 15 && (
                    <span className="absolute inset-0 flex items-center justify-center text-xs text-white font-medium truncate px-1">
                      {apt.customerName.split(' ')[0]}
                    </span>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-sm">
                  <p className="font-medium">{apt.customerName}</p>
                  <p className="text-muted-foreground">
                    {format(parseISO(apt.startTime), 'h:mm a')} -{' '}
                    {format(parseISO(apt.endTime), 'h:mm a')}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          ))}
        </TooltipProvider>
      </div>
    </div>
  );
}

function TimelineRowSkeleton() {
  return (
    <div className="flex items-center gap-2 h-10">
      <Skeleton className="h-8 w-8 rounded-full" />
      <Skeleton className="flex-1 h-8 rounded" />
    </div>
  );
}

export const LiveTimeline = memo(LiveTimelineComponent);
