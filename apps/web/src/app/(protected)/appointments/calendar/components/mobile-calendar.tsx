/**
 * Mobile Calendar Component
 * Single-stylist view optimized for mobile devices
 */

'use client';

import { useMemo, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addMinutes } from 'date-fns';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { useCalendarStore } from '@/stores/calendar-store';
import type { ResourceCalendarData } from '@/hooks/queries/use-resource-calendar';

interface MobileCalendarProps {
  data: ResourceCalendarData | undefined;
  isLoading: boolean;
  onAppointmentClick: (appointmentId: string) => void;
  onSlotClick: (stylistId: string, date: string, time: string) => void;
}

// Status color mapping - consistent with appointment-block.tsx
const STATUS_COLORS: Record<string, string> = {
  booked: 'bg-sky-100 border-sky-500 text-sky-700',
  confirmed: 'bg-emerald-100 border-emerald-500 text-emerald-700',
  checked_in: 'bg-violet-100 border-violet-500 text-violet-700',
  in_progress: 'bg-amber-100 border-amber-500 text-amber-700',
  completed: 'bg-slate-100 border-slate-400 text-slate-600',
  cancelled: 'bg-red-100 border-red-500 text-red-600',
  no_show: 'bg-rose-100 border-rose-500 text-rose-600',
};

export function MobileCalendar({
  data,
  isLoading,
  onAppointmentClick,
  onSlotClick,
}: MobileCalendarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const {
    selectedDate,
    timeSlotInterval,
    selectedStylistId,
    setSelectedStylist,
    goToToday,
    goToNextDay,
    goToPreviousDay,
  } = useCalendarStore();

  // Get current stylist
  const currentStylist = useMemo(() => {
    if (!data?.stylists.length) return null;
    if (selectedStylistId) {
      return data.stylists.find((s) => s.id === selectedStylistId) || data.stylists[0];
    }
    return data.stylists[0];
  }, [data?.stylists, selectedStylistId]);

  // Set initial stylist
  useEffect(() => {
    if (data?.stylists.length && !selectedStylistId) {
      setSelectedStylist(data.stylists[0].id);
    }
  }, [data?.stylists, selectedStylistId, setSelectedStylist]);

  // Generate time slots
  const timeSlots = useMemo(() => {
    if (!data?.workingHours) return [];

    const slots: string[] = [];
    const [startHour, startMin] = data.workingHours.start.split(':').map(Number);
    const [endHour, endMin] = data.workingHours.end.split(':').map(Number);

    let currentTime = new Date();
    currentTime.setHours(startHour, startMin, 0, 0);

    const endTime = new Date();
    endTime.setHours(endHour, endMin, 0, 0);

    while (currentTime < endTime) {
      slots.push(format(currentTime, 'HH:mm'));
      currentTime = addMinutes(currentTime, timeSlotInterval);
    }

    return slots;
  }, [data?.workingHours, timeSlotInterval]);

  // Get appointments for current stylist
  const stylistAppointments = useMemo(() => {
    if (!data?.appointments || !currentStylist) return [];
    return data.appointments.filter(
      (apt) => apt.stylistId === currentStylist.id && apt.date === selectedDate
    );
  }, [data?.appointments, currentStylist, selectedDate]);

  // Scroll to current time on mount
  useEffect(() => {
    if (!scrollRef.current || !data?.workingHours) return;

    const now = new Date();
    const [startHour] = data.workingHours.start.split(':').map(Number);
    const currentHour = now.getHours();

    if (currentHour >= startHour) {
      const minutesSinceStart = (currentHour - startHour) * 60 + now.getMinutes();
      const scrollPosition = (minutesSinceStart / timeSlotInterval) * 60; // 60px per slot
      scrollRef.current.scrollTop = Math.max(0, scrollPosition - 100);
    }
  }, [data?.workingHours, timeSlotInterval]);

  if (isLoading || !data || !currentStylist) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-pulse text-muted-foreground">Loading...</div>
      </div>
    );
  }

  const getInitials = (name: string) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

  return (
    <div className="flex flex-col h-full">
      {/* Date Navigation */}
      <div className="flex items-center justify-between p-3 border-b">
        <Button variant="ghost" size="icon" onClick={goToPreviousDay}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <button onClick={goToToday} className="font-semibold">
            {format(new Date(selectedDate), 'EEE, MMM d')}
          </button>
        </div>
        <Button variant="ghost" size="icon" onClick={goToNextDay}>
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* Stylist Tabs */}
      <ScrollArea className="border-b">
        <div className="flex p-2 gap-2">
          {data.stylists.map((stylist) => (
            <button
              key={stylist.id}
              onClick={() => setSelectedStylist(stylist.id)}
              className={cn(
                'flex flex-col items-center gap-1 p-2 rounded-lg min-w-[70px] transition-colors',
                currentStylist.id === stylist.id
                  ? 'bg-primary/10 ring-2 ring-primary'
                  : 'hover:bg-muted'
              )}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={stylist.avatar || undefined} />
                <AvatarFallback
                  style={{ backgroundColor: stylist.color }}
                  className="text-white text-xs"
                >
                  {getInitials(stylist.name)}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs font-medium truncate max-w-[60px]">
                {stylist.name.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Time Slots */}
      <div ref={scrollRef} className="flex-1 overflow-auto">
        <div className="relative">
          {timeSlots.map((time) => {
            const appointment = stylistAppointments.find((apt) => apt.startTime === time);
            const isOccupied = stylistAppointments.some(
              (apt) => apt.startTime <= time && apt.endTime > time
            );
            const isBreak = currentStylist.breaks.some((b) => time >= b.start && time < b.end);
            const isBlocked = currentStylist.blockedSlots.some(
              (s) => s.isFullDay || (time >= s.start && time < s.end)
            );

            // Render appointment
            if (appointment) {
              const startMins =
                parseInt(appointment.startTime.split(':')[0]) * 60 +
                parseInt(appointment.startTime.split(':')[1]);
              const endMins =
                parseInt(appointment.endTime.split(':')[0]) * 60 +
                parseInt(appointment.endTime.split(':')[1]);
              const duration = endMins - startMins;
              const height = (duration / timeSlotInterval) * 60;

              return (
                <div key={time} className="flex border-b" style={{ height: '60px' }}>
                  <div className="w-16 flex-shrink-0 text-xs text-muted-foreground p-2 border-r">
                    {time}
                  </div>
                  <div className="flex-1 relative">
                    <button
                      onClick={() => onAppointmentClick(appointment.id)}
                      className={cn(
                        'absolute left-1 right-1 top-0 rounded-md border-l-4 p-2 text-left',
                        STATUS_COLORS[appointment.status] || STATUS_COLORS.booked
                      )}
                      style={{
                        height: `${height}px`,
                        borderLeftColor: currentStylist.color,
                      }}
                    >
                      <div className="font-medium text-sm truncate">{appointment.customerName}</div>
                      <div className="text-xs truncate opacity-80">
                        {appointment.services.join(', ')}
                      </div>
                      <div className="text-xs mt-1">
                        {appointment.startTime} - {appointment.endTime}
                      </div>
                    </button>
                  </div>
                </div>
              );
            }

            // Skip occupied slots
            if (isOccupied) {
              return (
                <div key={time} className="flex border-b" style={{ height: '60px' }}>
                  <div className="w-16 flex-shrink-0 text-xs text-muted-foreground p-2 border-r">
                    {time}
                  </div>
                  <div className="flex-1" />
                </div>
              );
            }

            // Regular slot
            return (
              <div key={time} className="flex border-b" style={{ height: '60px' }}>
                <div className="w-16 flex-shrink-0 text-xs text-muted-foreground p-2 border-r">
                  {time}
                </div>
                <button
                  onClick={() => {
                    if (!isBreak && !isBlocked) {
                      onSlotClick(currentStylist.id, selectedDate, time);
                    }
                  }}
                  disabled={isBreak || isBlocked}
                  className={cn(
                    'flex-1 text-left p-2 transition-colors',
                    isBreak && 'bg-amber-50 dark:bg-amber-950/20',
                    isBlocked && 'bg-red-50 dark:bg-red-950/20',
                    !isBreak && !isBlocked && 'hover:bg-primary/5 active:bg-primary/10'
                  )}
                >
                  {isBreak && (
                    <span className="text-xs text-amber-600 dark:text-amber-400">Break</span>
                  )}
                  {isBlocked && (
                    <span className="text-xs text-red-600 dark:text-red-400">Blocked</span>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
