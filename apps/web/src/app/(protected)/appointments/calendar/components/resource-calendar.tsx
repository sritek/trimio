/**
 * Resource Calendar Component
 * Visual calendar with stylists as columns and time slots as rows
 * Uses CSS Grid for proper sticky headers and synchronized scrolling
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
import { AlertCircle, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { CalendarHeader } from './calendar-header';
import { StylistColumnHeader } from './stylist-column-header';
import { AppointmentBlock } from './appointment-block';
import { DroppableSlot } from './droppable-slot';
import { CurrentTimeIndicator } from './current-time-indicator';
import { computeOverlapLayout } from './overlap-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common';
import { useCalendarStore, type FilterableAppointmentStatus } from '@/stores/calendar-store';
import { cn } from '@/lib/utils';
import type {
  CalendarAppointment,
  ResourceCalendarData,
} from '@/hooks/queries/use-resource-calendar';

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
  activeFilterCount?: number;
}

// Slot height constants based on interval
const SLOT_HEIGHTS: Record<number, number> = {
  15: 30,
  30: 60,
  60: 80,
};

// Header heights and column widths
const STYLIST_HEADER_HEIGHT = 72;
const TIME_COLUMN_WIDTH = 64;
const MIN_STYLIST_COLUMN_WIDTH = 180; // Minimum width for readability

export function ResourceCalendar({
  data,
  isLoading,
  error,
  onRetry,
  onAppointmentClick,
  onSlotClick,
  onAppointmentMove,
  onFilterClick,
  activeFilterCount = 0,
}: ResourceCalendarProps) {
  const router = useRouter();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [draggedAppointment, setDraggedAppointment] = useState<CalendarAppointment | null>(null);
  const [scrollState, setScrollState] = useState({ canScrollLeft: false, canScrollRight: false });
  const [containerWidth, setContainerWidth] = useState(0);

  const {
    selectedDate,
    timeSlotInterval,
    setTimeSlotInterval,
    goToToday,
    goToNextDay,
    goToPreviousDay,
    filters,
  } = useCalendarStore();

  // Calculate slot height based on interval
  const slotHeight = SLOT_HEIGHTS[timeSlotInterval] || 60;

  // Track horizontal scroll state for fade indicators
  const updateScrollState = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setContainerWidth(clientWidth);
    setScrollState({
      canScrollLeft: scrollLeft > 5,
      canScrollRight: scrollLeft < scrollWidth - clientWidth - 5,
    });
  }, []);

  // Update scroll state on scroll and resize
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    updateScrollState();
    container.addEventListener('scroll', updateScrollState);
    window.addEventListener('resize', updateScrollState);

    // Initial container width measurement
    const resizeObserver = new ResizeObserver(() => {
      updateScrollState();
    });
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', updateScrollState);
      window.removeEventListener('resize', updateScrollState);
      resizeObserver.disconnect();
    };
  }, [updateScrollState, data?.stylists]);

  // Generate time slots based on working hours and interval
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

    while (currentTime < latestEndTime) {
      slots.push(format(currentTime, 'HH:mm'));
      currentTime = addMinutes(currentTime, timeSlotInterval);
    }

    return slots;
  }, [data?.workingHours, data?.appointments, timeSlotInterval]);

  // Check if slot is after working hours
  const isSlotAfterHours = useCallback(
    (time: string) => {
      if (!data?.workingHours) return false;
      return time >= data.workingHours.end;
    },
    [data?.workingHours]
  );

  // Filter stylists based on active filters
  const filteredStylists = useMemo(() => {
    if (!data?.stylists) return [];
    if (filters.stylistIds.length === 0) return data.stylists;
    return data.stylists.filter((s) => filters.stylistIds.includes(s.id));
  }, [data?.stylists, filters.stylistIds]);

  // Calculate optimal column width based on container width and number of stylists
  const stylistColumnWidth = useMemo(() => {
    const numStylists = filteredStylists.length;
    if (numStylists === 0 || containerWidth === 0) return MIN_STYLIST_COLUMN_WIDTH;

    const availableWidth = containerWidth - TIME_COLUMN_WIDTH;
    const calculatedWidth = Math.floor(availableWidth / numStylists);

    // Use minimum width if calculated is too small, otherwise expand to fill
    return Math.max(MIN_STYLIST_COLUMN_WIDTH, calculatedWidth);
  }, [containerWidth, filteredStylists.length]);

  // Check if horizontal scrolling is needed
  const needsHorizontalScroll = useMemo(() => {
    const totalGridWidth = TIME_COLUMN_WIDTH + filteredStylists.length * stylistColumnWidth;
    return totalGridWidth > containerWidth;
  }, [filteredStylists.length, stylistColumnWidth, containerWidth]);

  // Filter appointments based on active filters
  const filteredAppointments = useMemo(() => {
    if (!data?.appointments) return [];
    let filtered = data.appointments;

    if (filters.stylistIds.length > 0) {
      filtered = filtered.filter(
        (apt) => apt.stylistId && filters.stylistIds.includes(apt.stylistId)
      );
    }

    if (filters.statuses.length > 0) {
      filtered = filtered.filter((apt) =>
        filters.statuses.includes(apt.status as FilterableAppointmentStatus)
      );
    }

    return filtered;
  }, [data?.appointments, filters]);

  // Pre-compute overlap layout for all appointments
  const overlapLayout = useMemo(
    () => computeOverlapLayout(filteredAppointments),
    [filteredAppointments]
  );

  // Scroll by one column width
  const scrollByColumn = useCallback(
    (direction: 'left' | 'right') => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const scrollAmount = direction === 'right' ? stylistColumnWidth : -stylistColumnWidth;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    },
    [stylistColumnWidth]
  );

  // Check for slot conflicts
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

  // Date navigation handlers
  const handleDateChange = useCallback(
    (direction: 'prev' | 'next' | 'today') => {
      if (direction === 'today') goToToday();
      else if (direction === 'next') goToNextDay();
      else goToPreviousDay();
    },
    [goToToday, goToNextDay, goToPreviousDay]
  );

  // Drag handlers
  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const appointmentId = event.active.id as string;
      const appointment = data?.appointments.find((apt) => apt.id === appointmentId);
      if (appointment) setDraggedAppointment(appointment);
    },
    [data?.appointments]
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const currentDraggedAppointment = draggedAppointment;
      setDraggedAppointment(null);

      const { over } = event;
      if (!over || !currentDraggedAppointment) return;

      const dropData = over.data.current as
        | { stylistId: string; date: string; time: string }
        | undefined;
      if (!dropData) return;

      const samePosition =
        dropData.stylistId === currentDraggedAppointment.stylistId &&
        dropData.time === currentDraggedAppointment.startTime;

      if (samePosition) return;

      const hasConflict = checkSlotConflict(
        dropData.stylistId,
        dropData.time,
        currentDraggedAppointment.id
      );

      if (hasConflict) return;

      onAppointmentMove(
        currentDraggedAppointment.id,
        dropData.stylistId !== currentDraggedAppointment.stylistId ? dropData.stylistId : undefined,
        dropData.date,
        dropData.time
      );
    },
    [draggedAppointment, onAppointmentMove, checkSlotConflict]
  );

  const handleDragCancel = useCallback(() => setDraggedAppointment(null), []);

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

  // Render appointment block with density based on overlap
  const renderAppointment = useCallback(
    (appointment: CalendarAppointment, height: number, totalColumns: number) => {
      const stylist = data?.stylists.find((s) => s.id === appointment.stylistId);

      // Determine density based on how many columns share the space
      let density: 'full' | 'compact' | 'chip' = 'full';
      if (totalColumns >= 4) {
        density = 'chip';
      } else if (totalColumns >= 2) {
        density = 'compact';
      }

      return (
        <AppointmentBlock
          appointment={appointment}
          stylistColor={stylist?.color || '#6366f1'}
          height={height}
          density={density}
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
            description={error.message || 'An error occurred while loading the calendar.'}
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

  // No stylists state
  if (!data.stylists || data.stylists.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center p-8">
          <EmptyState
            icon={Users}
            title="No stylists assigned"
            description="Assign stylists to this branch to see the calendar."
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

  const numStylists = filteredStylists.length;

  return (
    <DndContext
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b bg-background">
          <CalendarHeader
            date={selectedDate}
            timeSlotInterval={timeSlotInterval}
            onDateChange={handleDateChange}
            onIntervalChange={setTimeSlotInterval}
            onFilterClick={onFilterClick}
            activeFilterCount={activeFilterCount}
          />
        </div>

        {/* Calendar Grid Container */}
        <div className="flex-1 overflow-hidden relative">
          {/* Left scroll shadow */}
          <div
            className={cn(
              'absolute left-0 top-0 bottom-0 w-8 z-40 pointer-events-none transition-opacity duration-300',
              'bg-gradient-to-r from-background/80 to-transparent',
              scrollState.canScrollLeft ? 'opacity-100' : 'opacity-0'
            )}
            style={{ left: TIME_COLUMN_WIDTH }}
          />

          {/* Right scroll indicator with fade and arrow */}
          <div
            className={cn(
              'absolute right-0 top-0 bottom-0 w-16 z-40 pointer-events-none transition-opacity duration-300',
              'bg-gradient-to-l from-background via-background/60 to-transparent',
              scrollState.canScrollRight ? 'opacity-100' : 'opacity-0'
            )}
          />

          {/* Scroll arrow buttons */}
          {scrollState.canScrollLeft && (
            <button
              onClick={() => scrollByColumn('left')}
              className={cn(
                'absolute top-1/2 -translate-y-1/2 z-50 p-2 rounded-full',
                'bg-background/90 border shadow-lg hover:bg-accent',
                'transition-all duration-200 hover:scale-110'
              )}
              style={{ left: TIME_COLUMN_WIDTH + 8 }}
              aria-label="Scroll left"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
          )}

          {scrollState.canScrollRight && (
            <button
              onClick={() => scrollByColumn('right')}
              className={cn(
                'absolute right-2 top-1/2 -translate-y-1/2 z-50 p-2 rounded-full',
                'bg-background/90 border shadow-lg hover:bg-accent',
                'transition-all duration-200 hover:scale-110'
              )}
              aria-label="Scroll right"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          )}

          <div ref={scrollContainerRef} className="absolute inset-0 overflow-auto">
            {/* CSS Grid Layout with dynamic column widths */}
            <div
              className={cn('grid', needsHorizontalScroll && 'min-w-max')}
              style={{
                gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(${numStylists}, ${stylistColumnWidth}px)`,
                gridTemplateRows: `${STYLIST_HEADER_HEIGHT}px repeat(${timeSlots.length}, ${slotHeight}px)`,
              }}
            >
              {/* Top-left corner cell (sticky both ways) */}
              <div
                className="sticky top-0 left-0 z-30 bg-muted border-b border-r flex items-center justify-center"
                style={{ gridRow: 1, gridColumn: 1 }}
              >
                <span className="text-xs font-medium text-muted-foreground">Time</span>
              </div>

              {/* Stylist Headers (sticky top) */}
              {filteredStylists.map((stylist, index) => (
                <div
                  key={stylist.id}
                  className="sticky top-0 z-20 bg-muted border-b border-r"
                  style={{ gridRow: 1, gridColumn: index + 2 }}
                >
                  <StylistColumnHeader stylist={stylist} className="h-full border-0" />
                </div>
              ))}

              {/* Time Labels (sticky left) */}
              {timeSlots.map((time, rowIndex) => {
                const afterHours = isSlotAfterHours(time);
                return (
                  <div
                    key={`time-${time}`}
                    className={cn(
                      'sticky left-0 z-20 bg-muted border-b border-r flex items-start justify-end pr-2 pt-2',
                      afterHours && 'bg-orange-100/50 dark:bg-orange-950/30'
                    )}
                    style={{ gridRow: rowIndex + 2, gridColumn: 1 }}
                  >
                    <span
                      className={cn(
                        'text-xs font-medium -mt-2',
                        afterHours
                          ? 'text-orange-600 dark:text-orange-400'
                          : 'text-muted-foreground'
                      )}
                    >
                      {time}
                    </span>
                  </div>
                );
              })}

              {/* Grid Cells - Time slots for each stylist */}
              {filteredStylists.map((stylist, colIndex) =>
                timeSlots.map((time, rowIndex) => {
                  const slotMins = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]);
                  const nextSlotMins = slotMins + timeSlotInterval;

                  // Find appointments starting in this slot
                  const appointmentsStartingInSlot = filteredAppointments.filter((apt) => {
                    if (apt.stylistId !== stylist.id) return false;
                    const aptStartMins =
                      parseInt(apt.startTime.split(':')[0]) * 60 +
                      parseInt(apt.startTime.split(':')[1]);
                    return aptStartMins >= slotMins && aptStartMins < nextSlotMins;
                  });

                  // Find breaks starting in this slot (to render as positioned blocks)
                  const breaksStartingInSlot = stylist.breaks.filter((b) => {
                    const breakStartMins =
                      parseInt(b.start.split(':')[0]) * 60 + parseInt(b.start.split(':')[1]);
                    return breakStartMins >= slotMins && breakStartMins < nextSlotMins;
                  });

                  // Check if slot is occupied by ongoing appointment
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

                  // Check if slot overlaps with any blocked slot
                  const isBlocked = stylist.blockedSlots.some((s) => {
                    if (s.isFullDay) return true;
                    const blockStartMins =
                      parseInt(s.start.split(':')[0]) * 60 + parseInt(s.start.split(':')[1]);
                    const blockEndMins =
                      parseInt(s.end.split(':')[0]) * 60 + parseInt(s.end.split(':')[1]);
                    // Slot overlaps with blocked slot if: slotStart < blockEnd AND slotEnd > blockStart
                    return slotMins < blockEndMins && nextSlotMins > blockStartMins;
                  });
                  const isOutsideHours =
                    !stylist.workingHours ||
                    time < stylist.workingHours.start ||
                    time >= stylist.workingHours.end;
                  const isAfterHours = isSlotAfterHours(time);
                  const hasConflict = draggedAppointment
                    ? checkSlotConflict(stylist.id, time, draggedAppointment.id)
                    : false;

                  // Check if any appointments in this slot have conflicts
                  const hasConflictingAppointments = appointmentsStartingInSlot.some(
                    (apt) => apt.hasConflict
                  );

                  // Check if slot overlaps with any break (for disabling click/drop)
                  const slotOverlapsBreak = stylist.breaks.some((b) => {
                    const breakStartMins =
                      parseInt(b.start.split(':')[0]) * 60 + parseInt(b.start.split(':')[1]);
                    const breakEndMins =
                      parseInt(b.end.split(':')[0]) * 60 + parseInt(b.end.split(':')[1]);
                    // Slot overlaps with break if: slotStart < breakEnd AND slotEnd > breakStart
                    return slotMins < breakEndMins && nextSlotMins > breakStartMins;
                  });

                  const slotId = `${stylist.id}-${time}`;

                  return (
                    <div
                      key={slotId}
                      className="relative"
                      style={{ gridRow: rowIndex + 2, gridColumn: colIndex + 2 }}
                    >
                      <DroppableSlot
                        id={slotId}
                        stylistId={stylist.id}
                        date={selectedDate}
                        time={time}
                        height={slotHeight}
                        isBreak={slotOverlapsBreak}
                        isBlocked={isBlocked}
                        isOutsideHours={isOutsideHours}
                        isAfterHours={isAfterHours}
                        hasConflict={hasConflict}
                        hasConflictingAppointments={hasConflictingAppointments}
                        onClick={
                          !isOccupied &&
                          !slotOverlapsBreak &&
                          appointmentsStartingInSlot.length === 0
                            ? () => onSlotClick(stylist.id, selectedDate, time)
                            : undefined
                        }
                      >
                        {/* Render breaks starting in this slot */}
                        {breaksStartingInSlot.map((brk) => {
                          const breakStartMins =
                            parseInt(brk.start.split(':')[0]) * 60 +
                            parseInt(brk.start.split(':')[1]);
                          const breakEndMins =
                            parseInt(brk.end.split(':')[0]) * 60 + parseInt(brk.end.split(':')[1]);
                          const duration = breakEndMins - breakStartMins;
                          const height = (duration / timeSlotInterval) * slotHeight;
                          const offsetMins = breakStartMins - slotMins;
                          const topOffset = (offsetMins / timeSlotInterval) * slotHeight;

                          return (
                            <div
                              key={brk.id}
                              className="absolute z-[5] left-0 right-0 mx-1 rounded border border-amber-300 dark:border-amber-700 flex items-center justify-center pointer-events-none"
                              style={{
                                height: `${height}px`,
                                top: `${topOffset}px`,
                                background: `repeating-linear-gradient(
                                  -45deg,
                                  rgb(251 191 36 / 0.15),
                                  rgb(251 191 36 / 0.15) 4px,
                                  rgb(251 191 36 / 0.3) 4px,
                                  rgb(251 191 36 / 0.3) 8px
                                )`,
                              }}
                            >
                              <span className="text-xs font-medium text-amber-700 dark:text-amber-300 truncate px-2 py-0.5 bg-white/70 dark:bg-gray-900/70 rounded">
                                {brk.name || 'Break'}
                              </span>
                            </div>
                          );
                        })}

                        {/* Render appointments starting in this slot */}
                        {appointmentsStartingInSlot.map((appointment) => {
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

                          // Use pre-computed overlap layout
                          const layout = overlapLayout.get(appointment.id);
                          const totalColumns = layout?.totalColumns ?? 1;
                          const column = layout?.column ?? 0;
                          const span = layout?.span ?? 1;
                          const colWidth = 100 / totalColumns;
                          const leftPercent = column * colWidth;
                          const widthPercent = span * colWidth;

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
                              {renderAppointment(appointment, height, totalColumns)}
                            </div>
                          );
                        })}
                      </DroppableSlot>
                    </div>
                  );
                })
              )}
            </div>

            {/* Current Time Indicator */}
            <CurrentTimeIndicator
              workingHours={data.workingHours}
              timeSlotInterval={timeSlotInterval}
              slotHeight={slotHeight}
              selectedDate={selectedDate}
              headerHeight={STYLIST_HEADER_HEIGHT}
              leftOffset={TIME_COLUMN_WIDTH}
            />
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
