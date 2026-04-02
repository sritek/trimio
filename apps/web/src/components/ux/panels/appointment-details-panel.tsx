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
import { useRouter } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import {
  Calendar,
  Clock,
  User,
  Phone,
  Scissors,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle,
  CreditCard,
  RefreshCw,
  Pencil,
  Armchair,
  Receipt,
  ExternalLink,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { StatusBadge, Notice } from '@/components/common';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { useClosePanel, useOpenPanel } from '@/components/ux/slide-over';
import { CustomerInfoPopover } from '@/components/ux/customer-info-popover';
import {
  AppointmentStatusDialog,
  CancelAppointmentDialog,
  EditServicesDialog,
  RescheduleAppointmentDialog,
  StartServiceDialog,
} from '@/components/ux/dialogs';
import { useAppointment } from '@/hooks/queries/use-appointments';
import { useAuthStore } from '@/stores/auth-store';
import { maskPhoneNumber, shouldMaskPhoneForRole } from '@/lib/phone-masking';
import { AppointmentStatus } from '@/types/appointments';
import { cn } from '@/lib/utils';

interface AppointmentDetailsPanelProps {
  appointmentId: string;
  // For floor view checkout flow
  isCheckoutMode?: boolean;
}

// Status action configurations - removed 'complete' from in_progress since checkout handles it
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
    { status: 'in_progress', label: 'Start', icon: Scissors, variant: 'default' as const },
    { status: 'no_show', label: 'No Show', icon: AlertCircle, variant: 'destructive' as const },
  ],
  in_progress: [], // No status actions - only checkout available
  completed: [],
  cancelled: [],
  no_show: [],
};

export function AppointmentDetailsPanel({
  appointmentId,
  isCheckoutMode = false,
}: AppointmentDetailsPanelProps) {
  const closePanel = useClosePanel();
  const router = useRouter();
  const { openCheckout } = useOpenPanel();
  const { user } = useAuthStore();
  const shouldMask = user?.role ? shouldMaskPhoneForRole(user.role) : false;

  // Dialog states
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [statusDialogTarget, setStatusDialogTarget] = useState<
    'confirmed' | 'checked_in' | 'no_show'
  >('confirmed');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [editServicesDialogOpen, setEditServicesDialogOpen] = useState(false);
  const [startServiceDialogOpen, setStartServiceDialogOpen] = useState(false);

  // Queries
  const { data: appointment, isLoading, error } = useAppointment(appointmentId);

  // Get available actions based on current status
  const availableActions = useMemo(() => {
    if (!appointment) return [];
    return STATUS_ACTIONS[appointment.status as keyof typeof STATUS_ACTIONS] || [];
  }, [appointment]);

  // Check if checkout button should be shown
  // Only show for in_progress appointments (completed means payment already captured)
  const showCheckout = useMemo(() => {
    if (!appointment) return false;
    return appointment.status === 'in_progress';
  }, [appointment]);

  // Handle status change - open appropriate dialog
  const handleStatusChange = useCallback(
    (newStatus: string) => {
      if (!appointment) return;

      // Use common status dialog for confirm, check-in, no-show
      if (newStatus === 'confirmed' || newStatus === 'checked_in' || newStatus === 'no_show') {
        setStatusDialogTarget(newStatus as 'confirmed' | 'checked_in' | 'no_show');
        setStatusDialogOpen(true);
        return;
      }

      // Use dedicated dialogs for cancel and start
      if (newStatus === 'cancelled') {
        setCancelDialogOpen(true);
        return;
      }
      if (newStatus === 'in_progress') {
        setStartServiceDialogOpen(true);
        return;
      }
    },
    [appointment]
  );

  // Handle checkout click - just opens checkout panel, doesn't change status
  const handleCheckout = useCallback(() => {
    openCheckout(appointmentId);
  }, [appointmentId, openCheckout]);

  // Handle reschedule click
  const handleReschedule = useCallback(() => {
    setRescheduleDialogOpen(true);
  }, []);

  // Handle proceed to checkout from floor view (opens checkout panel directly)
  // Note: The appointment will be marked as completed when the invoice is finalized
  const handleProceedToCheckout = useCallback(() => {
    if (!appointmentId) return;

    // Open checkout panel - appointment completion happens when invoice is finalized
    openCheckout(appointmentId);
  }, [appointmentId, openCheckout]);

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
  const formattedTime = `${appointment.scheduledTime} - ${appointment.scheduledEndTime || '--:--'}`;
  const canEditServices = (
    ['booked', 'confirmed', 'checked_in', 'in_progress'] as AppointmentStatus[]
  ).includes(appointment.status);
  const canReschedule = (['booked', 'confirmed', 'checked_in'] as AppointmentStatus[]).includes(
    appointment.status
  );

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

          {/* Station (if assigned) */}
          {appointment.station && (
            <div className="flex items-center gap-3">
              <Armchair className="h-5 w-5 text-muted-foreground" />
              <div className="flex items-center gap-2">
                <span>{appointment.station.name}</span>
                {appointment.station.stationType && (
                  <span
                    className="text-xs px-1.5 py-0.5 rounded-full border"
                    style={{
                      borderColor: appointment.station.stationType.color || undefined,
                      color: appointment.station.stationType.color || undefined,
                    }}
                  >
                    {appointment.station.stationType.name}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Services - Redesigned as compact cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium flex items-center gap-2">
              <Scissors className="h-4 w-4" />
              Services
            </h4>
            {/* Edit Services button - only show for editable statuses */}
            {canEditServices && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setEditServicesDialogOpen(true)}
                className="h-8 px-2"
              >
                <Pencil className="h-3.5 w-3.5 mr-1" />
                Edit
              </Button>
            )}
          </div>
          <div className="space-y-2">
            {appointment.services && appointment.services.length > 0 ? (
              appointment.services.map((service, index) => (
                <ServiceCard
                  key={service.id || index}
                  serviceName={service.serviceName}
                  price={service.unitPrice}
                  duration={service.durationMinutes}
                  quantity={service.quantity}
                />
              ))
            ) : (
              <p className="text-muted-foreground text-sm">No services added</p>
            )}
          </div>
          {appointment.totalAmount != null && appointment.totalAmount > 0 && (
            <div className="mt-8 pt-3 border-t space-y-2">
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{appointment.subtotal?.toLocaleString('en-IN') || 0}</span>
              </div>
              {appointment.taxAmount > 0 && (
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>
                    Tax (GST{' '}
                    {appointment.services && appointment.services.length > 0
                      ? `${appointment.services[0].taxRate}%`
                      : '18%'}
                    )
                  </span>
                  <span>₹{appointment.taxAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              {appointment.discountAmount > 0 && (
                <div className="flex justify-between items-center text-sm text-green-600">
                  <span>Discount</span>
                  <span>-₹{appointment.discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">Total</span>
                <span className="text-lg font-bold text-primary">
                  ₹{appointment.totalAmount.toLocaleString('en-IN')}
                </span>
              </div>
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

        {/* Status Notices */}
        {/* Payment Completed - Show for completed appointments */}
        {appointment.status === 'completed' && (
          <>
            <Separator />
            <Notice
              severity="success"
              title="Payment Completed"
              description={`This appointment has been completed and paid.${appointment.totalAmount > 0 ? ` Amount: ₹${appointment.totalAmount.toLocaleString('en-IN')}` : ''}`}
              action={
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100"
                  onClick={() => {
                    closePanel();
                    router.push('/billing');
                  }}
                >
                  <Receipt className="h-4 w-4 mr-1" />
                  View Invoice
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              }
            />
          </>
        )}

        {/* Cancelled - Show cancellation reason */}
        {appointment.status === 'cancelled' && (
          <>
            <Separator />
            <Notice
              severity="error"
              title="Appointment Cancelled"
              description={
                appointment.cancellationReason
                  ? `Reason: ${appointment.cancellationReason}`
                  : 'This appointment has been cancelled.'
              }
            >
              {appointment.cancelledAt && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  Cancelled on{' '}
                  {format(parseISO(appointment.cancelledAt), "MMM d, yyyy 'at' h:mm a")}
                  {appointment.isSalonCancelled && ' (by salon)'}
                </p>
              )}
            </Notice>
          </>
        )}

        {/* No Show */}
        {appointment.status === 'no_show' && (
          <>
            <Separator />
            <Notice
              severity="warning"
              title="Customer No-Show"
              description="The customer did not show up for this appointment."
            />
          </>
        )}
      </div>

      {/* Action Buttons */}
      <div className="border-t p-4 space-y-3">
        {/* Checkout Mode - Show Confirm & Proceed button */}
        {isCheckoutMode && (
          <Button className="w-full" size="lg" onClick={handleProceedToCheckout}>
            Confirm & Proceed to Checkout
          </Button>
        )}

        {/* Normal Mode - Show status actions and checkout */}
        {!isCheckoutMode && (
          <>
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
                    >
                      <Icon className="h-4 w-4 mr-1" />
                      {action.label}
                    </Button>
                  );
                })}

                {/* Reschedule button for non-completed appointments */}
                {canReschedule && (
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
          </>
        )}
      </div>

      {/* Dialogs - Conditionally rendered only when open to ensure fresh calculations */}
      {statusDialogOpen && (
        <AppointmentStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          appointmentId={appointmentId}
          targetStatus={statusDialogTarget}
          customerName={appointment.customerName || undefined}
          scheduledTime={appointment.scheduledTime}
        />
      )}

      {cancelDialogOpen && (
        <CancelAppointmentDialog
          open={cancelDialogOpen}
          onOpenChange={setCancelDialogOpen}
          appointmentId={appointmentId}
          customerName={appointment.customerName || undefined}
        />
      )}

      {rescheduleDialogOpen && (
        <RescheduleAppointmentDialog
          open={rescheduleDialogOpen}
          onOpenChange={setRescheduleDialogOpen}
          appointment={appointment}
        />
      )}

      {editServicesDialogOpen && (
        <EditServicesDialog
          open={editServicesDialogOpen}
          onOpenChange={setEditServicesDialogOpen}
          appointment={appointment}
          canEdit={canEditServices}
        />
      )}

      {startServiceDialogOpen && (
        <StartServiceDialog
          open={startServiceDialogOpen}
          onOpenChange={setStartServiceDialogOpen}
          appointmentId={appointmentId}
          customerName={appointment.customerName || undefined}
          serviceName={appointment.services?.[0]?.serviceName}
          scheduledTime={appointment.scheduledTime}
        />
      )}
    </div>
  );
}

// ============================================
// Service Card Component
// ============================================

interface ServiceCardProps {
  serviceName: string;
  price?: number;
  duration?: number;
  stylistName?: string;
  quantity?: number;
}

function ServiceCard({
  serviceName,
  price,
  duration,
  stylistName,
  quantity = 1,
}: ServiceCardProps) {
  return (
    <div
      className={cn(
        'p-3 rounded-lg border bg-gradient-to-r from-muted/30 to-transparent',
        'hover:from-muted/50 transition-colors'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">
            {serviceName}
            {quantity > 1 && <span className="text-muted-foreground ml-1">×{quantity}</span>}
          </p>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            {duration && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {duration} min
              </span>
            )}
            {stylistName && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {stylistName}
                </span>
              </>
            )}
          </div>
        </div>
        {price != null && (
          <span className="font-semibold text-sm whitespace-nowrap">
            ₹{(price * quantity).toLocaleString('en-IN')}
          </span>
        )}
      </div>
    </div>
  );
}
