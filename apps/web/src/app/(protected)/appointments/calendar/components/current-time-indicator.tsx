/**
 * Current Time Indicator Component
 * Red line showing current time on the calendar
 */

'use client';

import { useState, useEffect } from 'react';
import { format, isToday, parseISO } from 'date-fns';

interface CurrentTimeIndicatorProps {
  workingHours: { start: string; end: string };
  timeSlotInterval: number;
  slotHeight: number;
  selectedDate?: string;
  headerHeight?: number;
  leftOffset?: number;
}

export function CurrentTimeIndicator({
  workingHours,
  timeSlotInterval,
  slotHeight,
  selectedDate,
  headerHeight = 72,
  leftOffset = 64,
}: CurrentTimeIndicatorProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Only show on today's date
  if (selectedDate) {
    try {
      const selectedDateObj = parseISO(selectedDate);
      if (!isToday(selectedDateObj)) {
        return null;
      }
    } catch {
      // If parsing fails, continue with the check
    }
  }

  // Calculate position
  const now = currentTime;
  const currentTimeStr = format(now, 'HH:mm');
  const [startHour, startMin] = workingHours.start.split(':').map(Number);
  const [endHour, endMin] = workingHours.end.split(':').map(Number);

  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // Check if current time is within working hours
  if (currentMinutes < startMinutes || currentMinutes >= endMinutes) {
    return null;
  }

  // Calculate top position (accounting for header)
  const minutesSinceStart = currentMinutes - startMinutes;
  const topPosition = headerHeight + (minutesSinceStart / timeSlotInterval) * slotHeight;

  return (
    <div
      className="absolute z-30 pointer-events-none w-full"
      style={{
        top: `${topPosition}px`,
        left: `${leftOffset}px`,
        right: 0,
      }}
    >
      {/* Time label */}
      <div className="absolute -top-2.5 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded font-medium shadow-sm">
        {currentTimeStr}
      </div>
      {/* Line */}
      <div className="h-0.5 bg-red-500 w-full shadow-sm" />
    </div>
  );
}
