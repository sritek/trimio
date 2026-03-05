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
  isAfterHours?: boolean; // Beyond branch closing time (overtime)
  hasConflict?: boolean;
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
    // After-hours slots can still receive drops (for phone/walk-in)
    disabled: isBreak || isBlocked || isOutsideHours,
  });

  const isDragging = !!active;
  // After-hours slots are droppable but show visual distinction
  const canDrop = !isBreak && !isBlocked && !isOutsideHours;

  // Track last click time to debounce rapid clicks
  const lastClickTimeRef = useRef<number>(0);

  // Stable click handler with debouncing and drag check
  const handleClick = useCallback(() => {
    // Don't trigger click during drag operations
    if (isDragging) return;

    // Don't trigger click for invalid slots
    if (!canDrop) return;

    // Debounce rapid clicks to prevent multiple panels from opening
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
        // Base states
        isOutsideHours && 'bg-muted/50',
        isBlocked && 'bg-red-50 dark:bg-red-950/20',
        isBreak && 'bg-amber-200/60 dark:bg-amber-900/50',
        // After-hours styling (overtime - striped pattern)
        isAfterHours && !isBreak && !isBlocked && 'bg-orange-50/50 dark:bg-orange-950/20',
        // Interactive states (only when not break/blocked/outside)
        canDrop && !isDragging && 'cursor-pointer hover:bg-primary/5',
        // Drag hover states
        isDragging && canDrop && 'bg-primary/5',
        isOver && canDrop && !hasConflict && 'bg-primary/20 ring-2 ring-primary ring-inset',
        isOver &&
          canDrop &&
          hasConflict &&
          'bg-red-100 dark:bg-red-900/30 ring-2 ring-red-500 ring-inset',
        // Disabled drop indicator
        isDragging && !canDrop && 'opacity-50'
      )}
    >
      {/* Break indicator */}
      {isBreak && (
        <div className="flex items-center justify-center h-full">
          <span className="text-xs font-semibold text-amber-800 dark:text-amber-200 truncate bg-amber-300/50 dark:bg-amber-700/50 rounded px-2 py-0.5">
            Break
          </span>
        </div>
      )}

      {/* Conflict warning when dragging over occupied slot */}
      {isOver && hasConflict && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-100/80 dark:bg-red-900/50 z-20">
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
