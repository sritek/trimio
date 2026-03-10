/**
 * Time Slot Component
 * Individual time slot cell in the resource calendar
 */

'use client';

import { cn } from '@/lib/utils';
import { useDroppable } from '@dnd-kit/core';

interface TimeSlotProps {
  stylistId: string;
  time: string;
  date: string;
  isBlocked?: boolean;
  isBreak?: boolean;
  breakName?: string;
  isOutsideWorkingHours?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
  height?: number;
}

export function TimeSlot({
  stylistId,
  time,
  date,
  isBlocked = false,
  isBreak = false,
  breakName,
  isOutsideWorkingHours = false,
  onClick,
  children,
  height = 30,
}: TimeSlotProps) {
  const droppableId = `${stylistId}-${date}-${time}`;

  const { isOver, setNodeRef } = useDroppable({
    id: droppableId,
    disabled: isBlocked || isBreak || isOutsideWorkingHours,
    data: {
      stylistId,
      date,
      time,
    },
  });

  const isClickable = !isBlocked && !isBreak && !isOutsideWorkingHours && !children;

  return (
    <div
      ref={setNodeRef}
      onClick={isClickable ? onClick : undefined}
      style={{ height: `${height}px` }}
      className={cn(
        'relative border-b border-r transition-colors',
        // Base states
        isOutsideWorkingHours && 'bg-muted/50',
        isBlocked && 'bg-red-50 dark:bg-red-950/20',
        isBreak && 'bg-amber-50 dark:bg-amber-950/20',
        // Interactive states
        isClickable && 'cursor-pointer hover:bg-primary/5',
        // Drop target state
        isOver && !isBlocked && !isBreak && 'bg-primary/10 ring-2 ring-primary ring-inset',
        // Has content
        children && 'overflow-visible'
      )}
      title={isBreak ? breakName : isBlocked ? 'Blocked' : undefined}
    >
      {/* Break indicator */}
      {isBreak && !children && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-amber-600 dark:text-amber-400 font-medium truncate px-1">
            {breakName || 'Break'}
          </span>
        </div>
      )}

      {/* Blocked indicator */}
      {isBlocked && !children && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs text-red-600 dark:text-red-400 font-medium">Blocked</span>
        </div>
      )}

      {/* Appointment content */}
      {children}
    </div>
  );
}
