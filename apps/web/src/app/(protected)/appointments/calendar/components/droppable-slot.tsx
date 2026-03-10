/**
 * Droppable Time Slot Component
 * A time slot that can receive dragged appointments
 */

'use client';

import { useCallback, useRef } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import { AlertTriangle } from 'lucide-react';

// Debounce interval in milliseconds to prevent rapid clicks
const CLICK_DEBOUNCE_MS = 300;

interface DroppableSlotProps {
  id: string;
  stylistId: string;
  date: string;
  time: string;
  height: number;
  isBreak?: boolean;
  isBlocked?: boolean;
  isOutsideHours?: boolean;
  isAfterHours?: boolean;
  hasConflict?: boolean;
  hasConflictingAppointments?: boolean; // Slot contains appointments that conflict with each other
  onClick?: () => void;
  children?: React.ReactNode;
}

export function DroppableSlot({
  id,
  stylistId,
  date,
  time,
  height,
  isBreak = false,
  isBlocked = false,
  isOutsideHours = false,
  isAfterHours = false,
  hasConflict = false,
  hasConflictingAppointments = false,
  onClick,
  children,
}: DroppableSlotProps) {
  const { isOver, setNodeRef, active } = useDroppable({
    id,
    data: {
      stylistId,
      date,
      time,
    },
    disabled: isBreak || isBlocked || isOutsideHours,
  });

  const isDragging = !!active;
  const canDrop = !isBreak && !isBlocked && !isOutsideHours;

  // Track last click time to debounce rapid clicks
  const lastClickTimeRef = useRef<number>(0);

  // Stable click handler with debouncing and drag check
  const handleClick = useCallback(() => {
    if (isDragging) return;
    if (!canDrop) return;

    const now = Date.now();
    if (now - lastClickTimeRef.current < CLICK_DEBOUNCE_MS) return;
    lastClickTimeRef.current = now;

    onClick?.();
  }, [isDragging, canDrop, onClick]);

  return (
    <div
      ref={setNodeRef}
      onClick={handleClick}
      style={{ height: `${height}px` }}
      className={cn(
        'border-b border-r transition-all duration-150 relative',
        // Base background - default white/dark
        'bg-background',
        // Outside working hours (before open or after close for this stylist)
        isOutsideHours && 'bg-muted/40',
        // Blocked time
        isBlocked && 'bg-red-50 dark:bg-red-950/20',
        // Break time
        isBreak && 'bg-amber-100/80 dark:bg-amber-900/40',
        // After-hours styling (overtime) - more visible orange tint
        isAfterHours &&
          !isBreak &&
          !isBlocked &&
          !isOutsideHours &&
          'bg-orange-100/70 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
        // Conflict zone highlighting - slot contains conflicting appointments
        hasConflictingAppointments &&
          !isBreak &&
          !isBlocked &&
          'bg-amber-50/50 dark:bg-amber-950/20',
        // Interactive states
        canDrop && !isDragging && 'cursor-pointer hover:bg-primary/5',
        // Drag hover states
        isDragging && canDrop && 'bg-primary/5',
        isOver && canDrop && !hasConflict && 'bg-primary/15 ring-2 ring-primary ring-inset',
        isOver &&
          canDrop &&
          hasConflict &&
          'bg-red-100 dark:bg-red-900/30 ring-2 ring-red-500 ring-inset',
        // Disabled drop indicator
        isDragging && !canDrop && 'opacity-60'
      )}
    >
      {/* Break indicator */}
      {isBreak && (
        <div className="flex items-center justify-center h-full">
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-200 truncate bg-amber-200/70 dark:bg-amber-700/50 rounded px-2 py-0.5 shadow-sm">
            Break
          </span>
        </div>
      )}

      {/* After-hours indicator - subtle label at top of slot */}
      {isAfterHours && !isBreak && !isBlocked && !isOutsideHours && !children && (
        <div className="absolute top-0 right-0 px-1">
          <span className="text-[10px] font-medium text-orange-500 dark:text-orange-400">OT</span>
        </div>
      )}

      {/* Conflict warning when dragging over occupied slot */}
      {isOver && hasConflict && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-100/90 dark:bg-red-900/60 z-20">
          <div className="flex items-center gap-1 text-red-600 dark:text-red-300 text-xs font-medium">
            <AlertTriangle className="h-3 w-3" />
            <span>Conflict</span>
          </div>
        </div>
      )}

      {/* Drop indicator line */}
      {isOver && canDrop && !hasConflict && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary z-20" />
      )}

      {children}
    </div>
  );
}
