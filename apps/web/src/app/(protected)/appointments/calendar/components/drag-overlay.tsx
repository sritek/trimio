/**
 * Drag Overlay Component
 * Ghost preview shown while dragging an appointment
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 10.7
 */

'use client';

import { DragOverlay as DndDragOverlay } from '@dnd-kit/core';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { usePrefersReducedMotion } from '@/hooks/use-reduced-motion';
import type { CalendarAppointment } from '@/hooks/queries/use-resource-calendar';

interface DragOverlayProps {
  appointment: CalendarAppointment | null;
  stylistColor?: string;
}

export function DragOverlay({ appointment, stylistColor = '#6366f1' }: DragOverlayProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (!appointment) return null;

  return (
    <DndDragOverlay
      dropAnimation={
        prefersReducedMotion
          ? null
          : {
              duration: 200,
              easing: 'ease-out',
            }
      }
    >
      <motion.div
        initial={prefersReducedMotion ? {} : { scale: 1, opacity: 0.8 }}
        animate={
          prefersReducedMotion
            ? {}
            : {
                scale: 1.05,
                opacity: 0.9,
                boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
              }
        }
        className={cn(
          'rounded-md border-l-4 px-3 py-2',
          'bg-white dark:bg-gray-800',
          'cursor-grabbing',
          'min-w-[150px] max-w-[200px]',
          'shadow-xl'
        )}
        style={{
          borderLeftColor: stylistColor,
          transform: 'rotate(-2deg)',
        }}
      >
        <div className="font-medium text-sm truncate">{appointment.customerName}</div>
        <div className="text-xs text-muted-foreground truncate">
          {appointment.services.join(', ')}
        </div>
        <div className="text-xs text-muted-foreground mt-1">
          {appointment.startTime} - {appointment.endTime}
        </div>
      </motion.div>
    </DndDragOverlay>
  );
}
