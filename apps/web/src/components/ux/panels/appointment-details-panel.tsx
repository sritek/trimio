'use client';

/**
 * Appointment Details Panel
 * Based on: .kiro/specs/ux-consolidation-slideover/design.md
 * Requirements: 4.2, 4.3, 4.5, 7.1
 *
 * SlideOver panel for viewing and acting on appointment details.
 * Displays customer info, services, stylist, time, status, and notes.
 * Includes quick action buttons for status changes and checkout.
 */

import { useState, useCallback, useMemo } from 'react';
import { format, parseISO } from 'date-fns';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Scissors,
  FileText,
  CheckCircle,
  PlayCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  RefreshCw,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/common';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useClosePanel, useOpenPanel } from '@/components/ux/slide-over';
import { CustomerInfoPopover } from '@/components/ux/customer-info-popover';
import {
  ConfirmAppointmentDialog,
  CancelAppointmentDialog,
  RescheduleAppointmentDialog,
} from '@/components/ux/dialogs';
import { useAppointment, useUpdateAppointmentStatus } from '@/hooks/queries/use-appointments';
import { useAuthStore } from '@/stores/auth-store';
import { maskPhoneNumber, shouldMaskPhoneForRole } from '@/lib/phone-masking';

interface AppointmentDetailsPanelProps {
  appointmentId: string;
}

// Status action configurations
const STATUS_ACTIONS = {
  booked: [
    { status: 'confirmed', label: 'Confirm', icon: CheckCircle, variant: 'default' as const },
    { status: 'cancelled', label: 'Cancel', icon: XCircle, variant: 'destructive' as const },
  ],
  confirmed: [
    { status: 'checked_in', label: 'Check In', icon: CheckCircle, variant: 'default' as const },
    { status: 'cancelled', label: 'Cancel', icon: XCircle, variant: 'destructive' as const },
  ],
  checked_in: [
    { status: 'in_progress', label: 'Start', icon: PlayCircle, variant: 'default' as const },
    { status: 'no_show', label: 'No Show', icon: AlertCircle, variant: 'destructive' as const },
  ],
  in_progress: [
    { status: 'completed', label: 'Complete', icon: CheckCircle, variant: 'default' as const },
  ],
  completed: [],
  cancelled: [],
  no_show: [],
};

export function AppointmentDetailsPanel({ appointmentId }: AppointmentDetailsPanelProps) {
  const closePanel = useClosePanel();
  const { openCheckout } = useOpenPanel();
  const { user } = useAuthStore();
  const shouldMask = user?.role ? shouldMaskPhoneForRole(user.role) : false;

  // Dialog states
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);

  const { data: appointment, isLoading, error } = useAppointment(appointmentId);
  const updateStatusMutation = useUpdateAppointmentStatus();

  // Get available actions based on current status
  const availableActions = useMemo(() => {
    if (!appointment) return [];
    return STATUS_ACTIONS[appointment.status as keyof typeof STATUS_ACTIONS] || [];
  }, [appointment]);

  // Check if checkout button should be shown
  const showCheckout = useMemo(() => {
    if (!appointment) return false;
    return appointment.status === 'in_progress' || appointment.status === 'completed';
  }, [appointment]);

  // Handle status change (for non-dialog actions like check-in, start, complete, no-show)
  const handleStatusChange = useCallback(
    async (newStatus: string) => {
      if (!appointment) return;

      // Use dialogs for confirm and cancel
      if (newStatus === 'confirmed') {
        setConfirmDialogOpen(true);
        return;
      }
      if (newStatus === 'cancelled') {
        setCancelDialogOpen(true);
        return;
      }

      // Direct status change for other statuses
      try {
        await updateStatusMutation.mutateAsync({
          id: appointmentId,
          status: newStatus,
        });
      } catch (error) {
        console.error('Failed to update status:', error);
      }
    },
    [appointment, appointmentId, updateStatusMutation]
  );

  // Handle checkout click
  const handleCheckout = useCallback(() => {
    openCheckout(appointmentId);
  }, [appointmentId, openCheckout]);

  // Handle reschedule click
  const handleReschedule = useCallback(() => {
    setRescheduleDialogOpen(true);
  }, []);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Separator />
        <div className="space-y-4">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-6 w-full" />
        </div>
        <Separator />
        <div className="space-y-2">
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  // Error state
  if (error || !appointment) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load appointment</h3>
        <p className="text-muted-foreground mb-4">{error?.message || 'Appointment not found'}</p>
        <Button variant="outline" onClick={() => closePanel()}>
          Close
        </Button>
      </div>
    );
  }

  // Format date and time
  const formattedDate = format(parseISO(appointment.scheduledDate), 'EEEE, MMMM d, yyyy');
  const formattedTime = `${appointment.scheduledTime} - ${appointment.endTime || '--:--'}`;

  return (
    <div className="flex flex-col h-full">
      {/* Main Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Customer Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-semibold">
              {appointment.customerName || 'Walk-in Customer'}
            </h3>
            {appointment.customerPhone && appointment.customerId && (
              <CustomerInfoPopover customerId={appointment.customerId}>
                <button className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors mt-1">
                  <Phone className="h-4 w-4" />
                  <span className="text-sm">
                    {shouldMask
                      ? maskPhoneNumber(appointment.customerPhone)
                      : appointment.customerPhone}
                  </span>
                </button>
              </CustomerInfoPopover>
            )}
            {appointment.customerPhone && !appointment.customerId && (
              <div className="flex items-center gap-1 text-muted-foreground mt-1">
                <Phone className="h-4 w-4" />
                <span className="text-sm">
                  {shouldMask
                    ? maskPhoneNumber(appointment.customerPhone)
                    : appointment.customerPhone}
                </span>
              </div>
            )}
          </div>
          <StatusBadge status={appointment.status} showDot />
        </div>

        <Separator />

        {/* Appointment Details */}
        <div className="space-y-4">
          {/* Date */}
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <span>{formattedDate}</span>
          </div>

          {/* Time */}
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <span>{formattedTime}</span>
          </div>

          {/* Stylist */}
          {appointment.stylist?.name && (
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <span>{appointment.stylist.name}</span>
            </div>
          )}
        </div>

        <Separator />

        {/* Services */}
        <div>
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <Scissors className="h-4 w-4" />
            Services
          </h4>
          <div className="space-y-2">
            {appointment.services && appointment.services.length > 0 ? (
              appointment.services.map((service, index) => (
                <div
                  key={service.id || index}
                  className="flex justify-between items-center py-2 px-3 bg-muted/50 rounded-md"
                >
                  <span>{service.serviceName}</span>
                  <span className="font-medium">
                    ₹{service.unitPrice?.toLocaleString('en-IN') || 0}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No services added</p>
            )}
          </div>
          {appointment.totalAmount != null && appointment.totalAmount > 0 && (
            <div className="flex justify-between items-center mt-3 pt-3 border-t font-semibold">
              <span>Total</span>
              <span>₹{appointment.totalAmount.toLocaleString('en-IN')}</span>
            </div>
          )}
        </div>

        {/* Notes */}
        {(appointment.customerNotes || appointment.internalNotes) && (
          <>
            <Separator />
            <div>
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Notes
              </h4>
              {appointment.customerNotes && (
                <p className="text-muted-foreground text-sm bg-muted/50 p-3 rounded-md mb-2">
                  <span className="font-medium">Customer: </span>
                  {appointment.customerNotes}
                </p>
              )}
              {appointment.internalNotes && (
                <p className="text-muted-foreground text-sm bg-muted/50 p-3 rounded-md">
                  <span className="font-medium">Internal: </span>
                  {appointment.internalNotes}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="border-t p-4 space-y-3">
        {/* Status Actions */}
        {availableActions.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {availableActions.map((action) => {
              const Icon = action.icon;
              return (
                <Button
                  key={action.status}
                  variant={action.variant}
                  size="sm"
                  onClick={() => handleStatusChange(action.status)}
                  disabled={updateStatusMutation.isPending}
                >
                  <Icon className="h-4 w-4 mr-1" />
                  {action.label}
                </Button>
              );
            })}

            {/* Reschedule button for non-completed appointments */}
            {!['completed', 'cancelled', 'no_show'].includes(appointment.status) && (
              <Button variant="outline" size="sm" onClick={handleReschedule}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Reschedule
              </Button>
            )}
          </div>
        )}

        {/* Checkout Button */}
        {showCheckout && (
          <Button className="w-full" size="lg" onClick={handleCheckout}>
            <CreditCard className="h-5 w-5 mr-2" />
            Checkout
          </Button>
        )}
      </div>

      {/* Dialogs */}
      <ConfirmAppointmentDialog
        open={confirmDialogOpen}
        onOpenChange={setConfirmDialogOpen}
        appointmentId={appointmentId}
        customerName={appointment.customerName || undefined}
        scheduledTime={appointment.scheduledTime}
      />

      <CancelAppointmentDialog
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        appointmentId={appointmentId}
        customerName={appointment.customerName || undefined}
      />

      <RescheduleAppointmentDialog
        open={rescheduleDialogOpen}
        onOpenChange={setRescheduleDialogOpen}
        appointment={appointment}
      />
    </div>
  );
}
