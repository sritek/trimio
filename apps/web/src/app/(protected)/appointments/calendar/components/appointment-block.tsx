/**
 * Appointment Block Component
 * Visual representation of an appointment in the calendar
 * Supports drag-and-drop for rescheduling via explicit drag handle
 */

'use client';

import { useCallback } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { cn } from '@/lib/utils';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { useAuthStore } from '@/stores/auth-store';
import { maskPhoneNumber, shouldMaskPhoneForRole } from '@/lib/phone-masking';
import { DragHandle } from './drag-handle';
import type { CalendarAppointment } from '@/hooks/queries/use-resource-calendar';

interface AppointmentBlockProps {
  appointment: CalendarAppointment;
  stylistColor: string;
  height: number;
  isDragging?: boolean;
  onClick?: () => void;
  /** Display density: full (default), compact (narrow), or chip (very narrow) */
  density?: 'full' | 'compact' | 'chip';
}

// Beautiful status color mapping with solid backgrounds
const STATUS_STYLES: Record<string, { bg: string; text: string; accent: string }> = {
  booked: {
    bg: 'bg-sky-100 dark:bg-sky-900/60',
    text: 'text-sky-900 dark:text-sky-100',
    accent: 'bg-sky-500',
  },
  confirmed: {
    bg: 'bg-emerald-100 dark:bg-emerald-900/60',
    text: 'text-emerald-900 dark:text-emerald-100',
    accent: 'bg-emerald-500',
  },
  checked_in: {
    bg: 'bg-violet-100 dark:bg-violet-900/60',
    text: 'text-violet-900 dark:text-violet-100',
    accent: 'bg-violet-500',
  },
  in_progress: {
    bg: 'bg-amber-100 dark:bg-amber-900/60',
    text: 'text-amber-900 dark:text-amber-100',
    accent: 'bg-amber-500',
  },
  completed: {
    bg: 'bg-slate-100 dark:bg-slate-800/60',
    text: 'text-slate-600 dark:text-slate-300',
    accent: 'bg-slate-400',
  },
  cancelled: {
    bg: 'bg-red-100 dark:bg-red-900/60',
    text: 'text-red-700 dark:text-red-200 line-through opacity-70',
    accent: 'bg-red-500',
  },
  no_show: {
    bg: 'bg-rose-100 dark:bg-rose-900/60',
    text: 'text-rose-800 dark:text-rose-200',
    accent: 'bg-rose-500',
  },
};

// Conflict severity styles
const CONFLICT_STYLES = {
  warning: {
    border: 'border-l-4 border-l-amber-500',
    ring: 'ring-1 ring-amber-400/50',
    badge: 'bg-amber-500',
  },
  severe: {
    border: 'border-l-4 border-l-red-500',
    ring: 'ring-2 ring-red-500',
    badge: 'bg-red-500',
  },
};

// Status labels for display
const STATUS_LABELS: Record<string, string> = {
  booked: 'Booked',
  confirmed: 'Confirmed',
  checked_in: 'Checked In',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
  no_show: 'No Show',
};

// Booking type labels
const BOOKING_TYPE_LABELS: Record<string, string> = {
  online: 'Online',
  phone: 'Phone',
  walk_in: 'Walk-in',
};

function AppointmentTooltip({ appointment }: { appointment: CalendarAppointment }) {
  const { user } = useAuthStore();
  const shouldMask = user?.role ? shouldMaskPhoneForRole(user.role) : false;
  const services = appointment.services || [];

  return (
    <div className="space-y-2 text-sm text-gray-900">
      <div className="font-semibold">{appointment.customerName || 'Unknown Customer'}</div>
      {appointment.customerPhone && (
        <div className="text-gray-600">
          {shouldMask ? maskPhoneNumber(appointment.customerPhone) : appointment.customerPhone}
        </div>
      )}
      {services.length > 0 && (
        <div className="border-t border-gray-200 pt-2">
          <div className="font-medium">Services:</div>
          <ul className="list-disc list-inside text-gray-700">
            {services.map((service, idx) => (
              <li key={idx}>{service}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex justify-between border-t border-gray-200 pt-2">
        <span className="text-gray-600">Time:</span>
        <span className="font-medium">
          {appointment.startTime || '--:--'} - {appointment.endTime || '--:--'}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Status:</span>
        <span className="font-medium">
          {STATUS_LABELS[appointment.status] || appointment.status || 'Unknown'}
        </span>
      </div>
      <div className="flex justify-between">
        <span className="text-gray-600">Type:</span>
        <span className="font-medium">
          {BOOKING_TYPE_LABELS[appointment.bookingType] || appointment.bookingType || 'Unknown'}
        </span>
      </div>
      {appointment.totalAmount != null && appointment.totalAmount > 0 && (
        <div className="flex justify-between border-t border-gray-200 pt-2">
          <span className="text-gray-600">Total:</span>
          <span className="font-medium">₹{appointment.totalAmount.toLocaleString('en-IN')}</span>
        </div>
      )}
      {appointment.hasConflict && appointment.conflictInfo && (
        <div
          className={cn(
            'border-t border-gray-200 pt-2',
            appointment.conflictInfo.severity === 'severe' ? 'text-red-600' : 'text-amber-600'
          )}
        >
          <div className="font-medium flex items-center gap-1">⚠️ Scheduling Conflict</div>
          <div className="text-xs mt-1">
            Overlaps by {appointment.conflictInfo.overlapMinutes} min with{' '}
            {appointment.conflictInfo.conflictingAppointmentIds.length} appointment(s)
          </div>
        </div>
      )}
    </div>
  );
}

// Statuses that allow drag-and-drop rescheduling
const MOVABLE_STATUSES = ['booked', 'confirmed', 'checked_in'];

// Optimistic appointment styles
const OPTIMISTIC_STYLES = {
  bg: 'bg-primary/20 dark:bg-primary/30',
  text: 'text-primary-foreground dark:text-primary-foreground',
  accent: 'bg-primary',
};

export function AppointmentBlock({
  appointment,
  stylistColor,
  height,
  isDragging = false,
  onClick,
  density = 'full',
}: AppointmentBlockProps) {
  // Check if this is an optimistic (pending) appointment
  const isOptimistic = appointment.isOptimistic === true;

  // Check if appointment can be moved (not optimistic ones)
  const canMove = !isOptimistic && MOVABLE_STATUSES.includes(appointment.status);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging: isCurrentlyDragging,
  } = useDraggable({
    id: appointment.id,
    data: {
      appointment,
    },
    disabled: !canMove,
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 50,
      }
    : undefined;

  // Use optimistic styles if pending, otherwise use status styles
  const statusStyle = isOptimistic
    ? OPTIMISTIC_STYLES
    : STATUS_STYLES[appointment.status] || STATUS_STYLES.booked;
  const conflictStyle =
    !isOptimistic && appointment.hasConflict && appointment.conflictInfo
      ? CONFLICT_STYLES[appointment.conflictInfo.severity]
      : null;
  const isCompact = density === 'compact' || height < 40;
  const isChip = density === 'chip';
  const showServices = density === 'full' && height >= 40;
  const services = appointment.services || [];

  // Get customer initials for chip mode
  const customerInitials = (appointment.customerName || 'U')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Handle click on the appointment body (not drag handle)
  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // Don't trigger click if we're dragging
      if (isCurrentlyDragging || isDragging) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }
      onClick?.();
    },
    [isCurrentlyDragging, isDragging, onClick]
  );

  const blockContent = (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        height: `${height}px`,
      }}
      onClick={handleClick}
      className={cn(
        'rounded-lg overflow-hidden relative group',
        'transition-all duration-150',
        'shadow-sm hover:shadow-md',
        'border border-black/5 dark:border-white/10',
        statusStyle.bg,
        // Cursor: pointer for clicking to open details (not for optimistic)
        !isOptimistic && 'cursor-pointer',
        // Optimistic appointment styling - pulsing animation
        isOptimistic && 'animate-pulse cursor-wait border-2 border-dashed border-primary/50',
        (isDragging || isCurrentlyDragging) &&
          'shadow-xl ring-2 ring-primary/50 opacity-90 scale-[1.02]',
        // Conflict styling based on severity
        conflictStyle && conflictStyle.border,
        conflictStyle && conflictStyle.ring,
        // Unassigned appointment indicator - dashed border
        !isOptimistic &&
          !appointment.stylistId &&
          'border-2 border-dashed border-orange-400 dark:border-orange-500'
      )}
    >
      {/* Drag Handle - only for movable appointments (hidden in chip mode) */}
      {canMove && density !== 'chip' && (
        <DragHandle listeners={listeners} attributes={attributes} disabled={!canMove} />
      )}

      {/* Left accent bar using stylist color */}
      <div
        className={cn(
          'absolute top-0 bottom-0 rounded-l-lg',
          isChip ? 'w-1 left-0' : 'w-1',
          !isChip && (canMove ? 'left-5' : 'left-0')
        )}
        style={{ backgroundColor: stylistColor }}
      />

      {/* Content — adapts to density */}
      {isChip ? (
        /* Chip mode: initials + status dot, minimal footprint */
        <div className="px-1 py-0.5 h-full flex items-center gap-1 pl-2">
          <span
            className={cn('text-[10px] font-bold leading-none truncate', statusStyle.text)}
          >
            {customerInitials}
          </span>
          {height >= 30 && (
            <span className={cn('text-[9px] truncate opacity-70 leading-none', statusStyle.text)}>
              {appointment.startTime}
            </span>
          )}
        </div>
      ) : (
        /* Full / Compact mode */
        <div className={cn('pr-2 py-1 h-full flex flex-col', canMove ? 'pl-7' : 'pl-2.5')}>
          {/* Customer Name */}
          <div
            className={cn(
              'font-semibold truncate leading-tight',
              statusStyle.text,
              isCompact ? 'text-[11px]' : 'text-sm'
            )}
          >
            {appointment.customerName || 'Unknown Customer'}
          </div>

          {/* Services — only in full mode with enough height */}
          {showServices && services.length > 0 && (
            <div className={cn('text-xs truncate opacity-75', statusStyle.text)}>
              {services.join(', ')}
            </div>
          )}

          {/* Time — shown in compact as single line, in full when tall enough */}
          {isCompact && height >= 30 ? (
            <div className={cn('text-[10px] opacity-60 truncate', statusStyle.text)}>
              {appointment.startTime} - {appointment.endTime}
            </div>
          ) : (
            !isCompact &&
            height >= 60 && (
              <div className={cn('text-xs mt-auto opacity-60', statusStyle.text)}>
                {appointment.startTime} - {appointment.endTime}
              </div>
            )
          )}
        </div>
      )}

      {/* Status indicator dot */}
      <div className={cn('absolute top-1.5 right-1.5 w-2 h-2 rounded-full', statusStyle.accent)} />

      {/* Booking type indicator — hide in chip mode */}
      {!isChip && appointment.bookingType === 'walk_in' && (
        <span className="absolute bottom-1 right-1 text-[10px] font-medium bg-amber-500 text-white px-1 rounded">
          W
        </span>
      )}

      {/* Conflict indicator with severity */}
      {appointment.hasConflict && appointment.conflictInfo && (
        <span
          className={cn(
            'absolute top-1 text-white px-1 rounded font-bold',
            isChip ? 'right-1 text-[9px]' : 'right-4 text-xs',
            conflictStyle?.badge || 'bg-red-500'
          )}
        >
          {isChip
            ? '!'
            : appointment.conflictInfo.conflictingAppointmentIds.length > 1
              ? `${appointment.conflictInfo.conflictingAppointmentIds.length}!`
              : '!'}
        </span>
      )}

      {/* Unassigned indicator — hide in chip mode */}
      {!isChip && !isOptimistic && !appointment.stylistId && (
        <span className="absolute top-1 right-4 text-[10px] font-medium bg-orange-500 text-white px-1 rounded">
          Unassigned
        </span>
      )}

      {/* Optimistic/Creating indicator */}
      {isOptimistic && (
        <span className="absolute top-1 right-1 text-[10px] font-medium bg-primary text-primary-foreground px-1.5 rounded animate-pulse">
          Creating...
        </span>
      )}

      {/* In-progress animation */}
      {!isOptimistic && appointment.status === 'in_progress' && (
        <div className="absolute inset-0 bg-gradient-to-r from-amber-400/20 to-transparent animate-pulse pointer-events-none rounded-lg" />
      )}

      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 dark:group-hover:bg-white/5 transition-colors pointer-events-none rounded-lg" />
    </div>
  );

  // Wrap with tooltip for hover details
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root delayDuration={500}>
        <TooltipPrimitive.Trigger asChild>{blockContent}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side="right"
            sideOffset={8}
            className="z-[9999] max-w-xs rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 shadow-xl"
          >
            <AppointmentTooltip appointment={appointment} />
            <TooltipPrimitive.Arrow className="fill-white" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

// Export status colors for legend
export const APPOINTMENT_STATUS_COLORS = STATUS_STYLES;
export const APPOINTMENT_STATUS_LABELS = STATUS_LABELS;
