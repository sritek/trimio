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
      {appointment.hasConflict && (
        <div className="text-red-600 font-medium border-t border-gray-200 pt-2">
          ⚠️ This appointment has a conflict
        </div>
      )}
    </div>
  );
}

// Statuses that allow drag-and-drop rescheduling
const MOVABLE_STATUSES = ['booked', 'confirmed', 'checked_in'];

export function AppointmentBlock({
  appointment,
  stylistColor,
  height,
  isDragging = false,
  onClick,
}: AppointmentBlockProps) {
  // Check if appointment can be moved
  const canMove = MOVABLE_STATUSES.includes(appointment.status);

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

  const statusStyle = STATUS_STYLES[appointment.status] || STATUS_STYLES.booked;
  const isCompact = height < 40;
  const showServices = height >= 50;
  const services = appointment.services || [];

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
        // Cursor: pointer for clicking to open details
        'cursor-pointer',
        (isDragging || isCurrentlyDragging) &&
          'shadow-xl ring-2 ring-primary/50 opacity-90 scale-[1.02]',
        appointment.hasConflict && 'ring-2 ring-red-500',
        // Unassigned appointment indicator - dashed border
        !appointment.stylistId && 'border-2 border-dashed border-orange-400 dark:border-orange-500'
      )}
    >
      {/* Drag Handle - only for movable appointments */}
      {canMove && <DragHandle listeners={listeners} attributes={attributes} disabled={!canMove} />}

      {/* Left accent bar using stylist color */}
      <div
        className={cn('absolute top-0 bottom-0 w-1 rounded-l-lg', canMove ? 'left-5' : 'left-0')}
        style={{ backgroundColor: stylistColor }}
      />

      {/* Content - shifted right to make room for drag handle */}
      <div className={cn('pr-2 py-1 h-full flex flex-col', canMove ? 'pl-7' : 'pl-2.5')}>
        {/* Customer Name */}
        <div
          className={cn(
            'font-semibold truncate leading-tight',
            statusStyle.text,
            isCompact ? 'text-xs' : 'text-sm'
          )}
        >
          {appointment.customerName || 'Unknown Customer'}
        </div>

        {/* Services */}
        {showServices && services.length > 0 && (
          <div className={cn('text-xs truncate opacity-75', statusStyle.text)}>
            {services.join(', ')}
          </div>
        )}

        {/* Time (only if enough space) */}
        {height >= 60 && (
          <div className={cn('text-xs mt-auto opacity-60', statusStyle.text)}>
            {appointment.startTime} - {appointment.endTime}
          </div>
        )}
      </div>

      {/* Status indicator dot */}
      <div className={cn('absolute top-1.5 right-1.5 w-2 h-2 rounded-full', statusStyle.accent)} />

      {/* Booking type indicator */}
      {appointment.bookingType === 'walk_in' && (
        <span className="absolute bottom-1 right-1 text-[10px] font-medium bg-amber-500 text-white px-1 rounded">
          W
        </span>
      )}

      {/* Conflict indicator */}
      {appointment.hasConflict && (
        <span className="absolute top-1 right-4 text-xs bg-red-500 text-white px-1 rounded font-bold">
          !
        </span>
      )}

      {/* Unassigned indicator */}
      {!appointment.stylistId && (
        <span className="absolute top-1 right-4 text-[10px] font-medium bg-orange-500 text-white px-1 rounded">
          Unassigned
        </span>
      )}

      {/* In-progress animation */}
      {appointment.status === 'in_progress' && (
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
