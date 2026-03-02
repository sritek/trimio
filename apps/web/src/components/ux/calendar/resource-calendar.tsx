/**
 * Resource Calendar Component
 * Visual calendar with stylists as columns and time slots as rows
 */

'use client';

import { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  DragEndEvent,
  DragStartEvent,
  pointerWithin,
} from '@dnd-kit/core';
import { format, addMinutes } from 'date-fns';
import { AlertCircle, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CalendarHeader } from './calendar-header';
import { StylistColumnHeader } from './stylist-column';
import { AppointmentBlock } from './appointment-block';
import { DroppableSlot } from './droppable-slot';
import { CurrentTimeIndicator } from './current-time-indicator';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common';
import { useCalendarStore } from '@/stores/calendar-store';
import { cn } from '@/lib/utils';
import type {
  CalendarAppointment,
  ResourceCalendarData,
} from '@/hooks/queries/use-resource-calendar';
import type { AppointmentStatus } from '@/stores/calendar-store';

interface ResourceCalendarProps {
  data: ResourceCalendarData | undefined;
  isLoading: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onAppointmentClick: (appointmentId: string) => void;
  onSlotClick: (stylistId: string, date: string, time: string) => void;
  onAppointmentMove: (
    appointmentId: string,
    newStylistId: string | undefined,
    newDate: string,
    newTime: string
  ) => void;
  onFilterClick?: () => void;
  hasActiveFilters?: boolean;
}

export function ResourceCalendar({
  data,
  isLoading,
  error,
  onRetry,
  onAppointmentClick,
  onSlotClick,
  onAppointmentMove,
  onFilterClick,
  hasActiveFilters = false,
}: ResourceCalendarProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [draggedAppointment, setDraggedAppointment] = useState<CalendarAppointment | null>(null);

  const {
    selectedDate,
    timeSlotInterval,
    setTimeSlotInterval,
    goToToday,
    goToNextDay,
    goToPreviousDay,
    filters,
  } = useCalendarStore();

  // Generate time slots based on working hours and interval
  // Dynamically extend if there are appointments beyond working hours (phone/walk-in)
  const timeSlots = useMemo(() => {
    if (!data?.workingHours) return [];

    const slots: string[] = [];
    const [startHour, startMin] = data.workingHours.start.split(':').map(Number);
    const [endHour, endMin] = data.workingHours.end.split(':').map(Number);

    let currentTime = new Date();
    currentTime.setHours(startHour, startMin, 0, 0);

    const workingEndTime = new Date();
    workingEndTime.setHours(endHour, endMin, 0, 0);

    // Find the latest appointment end time to extend calendar if needed
    let latestEndTime = workingEndTime;
    if (data.appointments && data.appointments.length > 0) {
      data.appointments.forEach((apt) => {
        const [aptEndHour, aptEndMin] = apt.endTime.split(':').map(Number);
        const aptEnd = new Date();
        aptEnd.setHours(aptEndHour, aptEndMin, 0, 0);
        if (aptEnd > latestEndTime) {
          latestEndTime = aptEnd;
        }
      });
    }

    // Generate slots up to the latest end time (working hours or appointment end, whichever is later)
    while (currentTime < latestEndTime) {
      slots.push(format(currentTime, 'HH:mm'));
      currentTime = addMinutes(currentTime, timeSlotInterval);
    }

    return slots;
  }, [data?.workingHours, data?.appointments, timeSlotInterval]);

  // Determine which slots are outside working hours (for visual distinction)
  const isSlotAfterHours = useCallback(
    (time: string) => {
      if (!data?.workingHours) return false;
      return time >= data.workingHours.end;
    },
    [data?.workingHours]
  );

  // Calculate slot height based on interval
  const slotHeight = useMemo(() => {
    switch (timeSlotInterval) {
      case 15:
        return 24;
      case 30:
        return 50;
      case 60:
        return 70;
      default:
        return 30;
    }
  }, [timeSlotInterval]);

  // Filter stylists based on active filters
  const filteredStylists = useMemo(() => {
    if (!data?.stylists) return [];
    if (filters.stylistIds.length === 0) return data.stylists;
    return data.stylists.filter((s) => filters.stylistIds.includes(s.id));
  }, [data?.stylists, filters.stylistIds]);

  // Filter appointments based on active filters
  const filteredAppointments = useMemo(() => {
    if (!data?.appointments) return [];
    let filtered = data.appointments;

    if (filters.stylistIds.length > 0) {
      filtered = filtered.filter(
        (apt) => apt.stylistId && filters.stylistIds.includes(apt.stylistId)
      );
    }

    // Include filter - if set, only show these statuses
    if (filters.statuses.length > 0) {
      filtered = filtered.filter((apt) =>
        filters.statuses.includes(apt.status as AppointmentStatus)
      );
    }

    // Exclude filter - hide these statuses (applied after include filter)
    if (filters.excludedStatuses && filters.excludedStatuses.length > 0) {
      filtered = filtered.filter(
        (apt) => !filters.excludedStatuses.includes(apt.status as AppointmentStatus)
      );
    }

    return filtered;
  }, [data?.appointments, filters]);

  // Check if a slot has a conflict with existing appointments
  const checkSlotConflict = useCallback(
    (stylistId: string, time: string, excludeAppointmentId?: string) => {
      const slotMins = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);

      return filteredAppointments.some((apt) => {
        if (apt.stylistId !== stylistId) return false;
        if (excludeAppointmentId && apt.id === excludeAppointmentId) return false;

        const aptStartMins =
          parseInt(apt.startTime.split(':')[0]) * 60 + parseInt(apt.startTime.split(':')[1]);
        const aptEndMins =
          parseInt(apt.endTime.split(':')[0]) * 60 + parseInt(apt.endTime.split(':')[1]);

        return slotMins >= aptStartMins && slotMins < aptEndMins;
      });
    },
    [filteredAppointments]
  );

  // Handle date navigation - day view only
  const handleDateChange = useCallback(
    (direction: 'prev' | 'next' | 'today') => {
      if (direction === 'today') {
        goToToday();
      } else if (direction === 'next') {
        goToNextDay();
      } else {
        goToPreviousDay();
      }
    },
    [goToToday, goToNextDay, goToPreviousDay]
  );

  // Handle drag start
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const appointmentId = event.active.id as string;
      const appointment = data?.appointments.find((apt) => apt.id === appointmentId);
      if (appointment) {
        setDraggedAppointment(appointment);
      }
    },
    [data?.appointments]
  );

  // Handle drag over
  const handleDragOver = useCallback(() => {
    // Drag over handling is done via DroppableSlot's isOver state
  }, []);

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const currentDraggedAppointment = draggedAppointment;
      setDraggedAppointment(null);

      const { over } = event;
      if (!over || !currentDraggedAppointment) return;

      const dropData = over.data.current as
        | {
            stylistId: string;
            date: string;
            time: string;
          }
        | undefined;

      if (!dropData) return;

      // Check if position changed
      const samePosition =
        dropData.stylistId === currentDraggedAppointment.stylistId &&
        dropData.time === currentDraggedAppointment.startTime;

      if (samePosition) return;

      // Check for conflicts at the target slot before triggering move
      const hasConflict = checkSlotConflict(
        dropData.stylistId,
        dropData.time,
        currentDraggedAppointment.id
      );

      if (hasConflict) {
        // Don't proceed with the move if there's a conflict
        return;
      }

      // Trigger move
      onAppointmentMove(
        currentDraggedAppointment.id,
        dropData.stylistId !== currentDraggedAppointment.stylistId ? dropData.stylistId : undefined,
        dropData.date,
        dropData.time
      );
    },
    [draggedAppointment, onAppointmentMove, checkSlotConflict]
  );

  // Handle drag cancel
  const handleDragCancel = useCallback(() => {
    setDraggedAppointment(null);
  }, []);

  // Scroll to current time on mount
  useEffect(() => {
    if (!scrollContainerRef.current || !data?.workingHours) return;

    const now = new Date();
    const [startHour] = data.workingHours.start.split(':').map(Number);
    const currentHour = now.getHours();

    if (currentHour >= startHour) {
      const minutesSinceStart = (currentHour - startHour) * 60 + now.getMinutes();
      const scrollPosition = (minutesSinceStart / timeSlotInterval) * slotHeight;
      scrollContainerRef.current.scrollTop = Math.max(0, scrollPosition - 100);
    }
  }, [data?.workingHours, timeSlotInterval, slotHeight]);

  // Render appointment block
  const renderAppointment = useCallback(
    (appointment: CalendarAppointment, height: number) => {
      const stylist = data?.stylists.find((s) => s.id === appointment.stylistId);
      return (
        <AppointmentBlock
          appointment={appointment}
          stylistColor={stylist?.color || '#6366f1'}
          height={height}
          onClick={() => onAppointmentClick(appointment.id)}
        />
      );
    },
    [data?.stylists, onAppointmentClick]
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between p-4 border-b">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-48" />
        </div>
        <div className="flex-1 p-4">
          <div className="flex gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex-1">
                <Skeleton className="h-16 w-full mb-2" />
                <Skeleton className="h-[400px] w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-8">
          <EmptyState
            icon={AlertCircle}
            title="Failed to load calendar"
            description={
              error.message || 'An error occurred while loading the calendar. Please try again.'
            }
            action={
              onRetry && (
                <Button onClick={onRetry} variant="outline">
                  Try Again
                </Button>
              )
            }
          />
        </div>
      </div>
    );
  }

  // No data state
  if (!data) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-8">
          <EmptyState
            icon={AlertCircle}
            title="No calendar data"
            description="Unable to load calendar data. Please try refreshing the page."
            action={
              onRetry && (
                <Button onClick={onRetry} variant="outline">
                  Refresh
                </Button>
              )
            }
          />
        </div>
      </div>
    );
  }

  // No stylists assigned state
  if (!data.stylists || data.stylists.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-8">
          <EmptyState
            icon={Users}
            title="No stylists assigned"
            description="Assign stylists to this branch to see the calendar and manage appointments."
            action={
              <Button onClick={() => router.push('/staff')} variant="outline">
                Manage Staff
              </Button>
            }
          />
        </div>
      </div>
    );
  }

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="p-4">
          <CalendarHeader
            date={selectedDate}
            timeSlotInterval={timeSlotInterval}
            onDateChange={handleDateChange}
            onIntervalChange={setTimeSlotInterval}
            onFilterClick={onFilterClick}
            hasActiveFilters={hasActiveFilters}
          />
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-hidden">
          <div className="flex h-full">
            {/* Time Column */}
            <div className="flex flex-col border-r bg-muted/30 sticky left-0 z-20 w-16">
              {/* Empty header cell */}
              <div className="h-[72px] border-b flex items-end justify-center pb-2">
                <span className="text-xs text-muted-foreground">Time</span>
              </div>
              {/* Time labels */}
              {timeSlots.map((time) => {
                const afterHours = isSlotAfterHours(time);
                return (
                  <div
                    key={time}
                    className={cn(
                      'flex items-start justify-end pr-2 text-xs border-b',
                      afterHours
                        ? 'text-orange-600 dark:text-orange-400 bg-orange-50/50 dark:bg-orange-950/20'
                        : 'text-muted-foreground'
                    )}
                    style={{ height: `${slotHeight}px` }}
                  >
                    <span className="-mt-2">{time}</span>
                  </div>
                );
              })}
            </div>

            {/* Scrollable content */}
            <div ref={scrollContainerRef} className="flex-1 overflow-auto relative">
              {/* Stylist Headers */}
              <div className="flex sticky top-0 z-10 bg-background">
                {filteredStylists.map((stylist) => (
                  <StylistColumnHeader key={stylist.id} stylist={stylist} className="flex-1" />
                ))}
              </div>

              {/* Grid Content */}
              <div className="flex relative">
                {/* Current Time Indicator */}
                <CurrentTimeIndicator
                  workingHours={data.workingHours}
                  timeSlotInterval={timeSlotInterval}
                  slotHeight={slotHeight}
                  selectedDate={selectedDate}
                />

                {/* Stylist Columns */}
                {filteredStylists.map((stylist) => (
                  <div key={stylist.id} className="flex flex-col flex-1 min-w-[140px]">
                    {timeSlots.map((time) => {
                      // Convert time slot to minutes for comparison
                      const slotMins =
                        parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
                      const nextSlotMins = slotMins + timeSlotInterval;

                      // Find ALL appointments that START within this time slot (for side-by-side display)
                      const appointmentsStartingInSlot = filteredAppointments.filter((apt) => {
                        if (apt.stylistId !== stylist.id) return false;
                        const aptStartMins =
                          parseInt(apt.startTime.split(':')[0]) * 60 +
                          parseInt(apt.startTime.split(':')[1]);
                        return aptStartMins >= slotMins && aptStartMins < nextSlotMins;
                      });

                      // Check if this slot is occupied by an appointment that started earlier
                      const isOccupied = filteredAppointments.some((apt) => {
                        if (apt.stylistId !== stylist.id) return false;
                        const aptStartMins =
                          parseInt(apt.startTime.split(':')[0]) * 60 +
                          parseInt(apt.startTime.split(':')[1]);
                        const aptEndMins =
                          parseInt(apt.endTime.split(':')[0]) * 60 +
                          parseInt(apt.endTime.split(':')[1]);
                        return aptStartMins < slotMins && aptEndMins > slotMins;
                      });

                      const isBreak = stylist.breaks.some((b) => time >= b.start && time < b.end);
                      const isBlocked = stylist.blockedSlots.some(
                        (s) => s.isFullDay || (time >= s.start && time < s.end)
                      );
                      const isOutsideHours =
                        !stylist.workingHours ||
                        time < stylist.workingHours.start ||
                        time >= stylist.workingHours.end;
                      const isAfterHours = isSlotAfterHours(time);

                      // Check for conflict when dragging
                      const hasConflict = draggedAppointment
                        ? checkSlotConflict(stylist.id, time, draggedAppointment.id)
                        : false;

                      const slotId = `${stylist.id}-${time}`;

                      // Render appointments at start time (side by side if multiple)
                      if (appointmentsStartingInSlot.length > 0) {
                        const numAppointments = appointmentsStartingInSlot.length;

                        return (
                          <DroppableSlot
                            key={time}
                            id={slotId}
                            stylistId={stylist.id}
                            date={selectedDate}
                            time={time}
                            height={slotHeight}
                            hasConflict={hasConflict}
                            isAfterHours={isAfterHours}
                          >
                            {appointmentsStartingInSlot.map((appointment, index) => {
                              const startMins =
                                parseInt(appointment.startTime.split(':')[0]) * 60 +
                                parseInt(appointment.startTime.split(':')[1]);
                              const endMins =
                                parseInt(appointment.endTime.split(':')[0]) * 60 +
                                parseInt(appointment.endTime.split(':')[1]);
                              const duration = endMins - startMins;
                              const height = (duration / timeSlotInterval) * slotHeight;
                              const offsetMins = startMins - slotMins;
                              const topOffset = (offsetMins / timeSlotInterval) * slotHeight;

                              // Calculate width and left position for side-by-side display
                              const widthPercent = 100 / numAppointments;
                              const leftPercent = index * widthPercent;

                              return (
                                <div
                                  key={appointment.id}
                                  className="absolute z-10"
                                  style={{
                                    height: `${height}px`,
                                    top: `${topOffset}px`,
                                    left: `calc(${leftPercent}% + 2px)`,
                                    width: `calc(${widthPercent}% - 4px)`,
                                  }}
                                >
                                  {renderAppointment(appointment, height)}
                                </div>
                              );
                            })}
                          </DroppableSlot>
                        );
                      }

                      // Occupied slot (appointment spans multiple slots)
                      if (isOccupied) {
                        return (
                          <DroppableSlot
                            key={time}
                            id={slotId}
                            stylistId={stylist.id}
                            date={selectedDate}
                            time={time}
                            height={slotHeight}
                            hasConflict={hasConflict}
                            isAfterHours={isAfterHours}
                          />
                        );
                      }

                      // Regular empty slot
                      return (
                        <DroppableSlot
                          key={time}
                          id={slotId}
                          stylistId={stylist.id}
                          date={selectedDate}
                          time={time}
                          height={slotHeight}
                          isBreak={isBreak}
                          isBlocked={isBlocked}
                          isOutsideHours={isOutsideHours}
                          isAfterHours={isAfterHours}
                          hasConflict={hasConflict}
                          onClick={() => onSlotClick(stylist.id, selectedDate, time)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay dropAnimation={null}>
        {draggedAppointment && (
          <div className="opacity-90 shadow-2xl">
            <AppointmentBlock
              appointment={draggedAppointment}
              stylistColor={
                data.stylists.find((s) => s.id === draggedAppointment.stylistId)?.color || '#6366f1'
              }
              height={60}
              isDragging
            />
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
