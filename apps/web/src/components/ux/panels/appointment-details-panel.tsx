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
  Receipt,
  ExternalLink,
  Loader2,
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
  ready_for_checkout: [], // No status actions - only checkout available
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

  // Track if any action is in progress (dialog open or data refetching after mutation)
  // Note: We use isFetching from the query to detect background refetches after mutations

  // Queries - use isFetching to detect background refetches after mutations
  const { data: appointment, isLoading, error, isFetching } = useAppointment(appointmentId);

  // Determine if buttons should be disabled (any dialog open or data refetching)
  const isButtonsDisabled =
    isFetching ||
    statusDialogOpen ||
    cancelDialogOpen ||
    rescheduleDialogOpen ||
    startServiceDialogOpen;

  // Get available actions based on current status
  const availableActions = useMemo(() => {
    if (!appointment) return [];
    return STATUS_ACTIONS[appointment.status as keyof typeof STATUS_ACTIONS] || [];
  }, [appointment]);

  // Check if checkout button should be shown
  // Show for in_progress and ready_for_checkout appointments
  // completed means payment already captured
  const showCheckout = useMemo(() => {
    if (!appointment) return false;
    return appointment.status === 'in_progress' || appointment.status === 'ready_for_checkout';
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
    [
      'booked',
      'confirmed',
      'checked_in',
      'in_progress',
      'ready_for_checkout',
    ] as AppointmentStatus[]
  ).includes(appointment.status);
  const canReschedule = (['booked', 'confirmed'] as AppointmentStatus[]).includes(
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

          {/* Scheduled Time */}
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <div className="flex flex-col">
              <span>{formattedTime}</span>
              {appointment.actualStartTime && (
                <span className="text-xs text-muted-foreground">
                  Started at {format(parseISO(appointment.actualStartTime), 'h:mm a')}
                  {appointment.actualEndTime && (
                    <> · Ended at {format(parseISO(appointment.actualEndTime), 'h:mm a')}</>
                  )}
                </span>
              )}
            </div>
          </div>

          {/* Stylist */}
          {(() => {
            // Get unique stylists from services
            const serviceStylists = new Map<string, string>();
            appointment.services?.forEach((service) => {
              const stylistId = service.actualStylistId || service.assignedStylistId;
              const stylistName = service.actualStylist?.name || service.assignedStylist?.name;
              if (stylistId && stylistName) {
                serviceStylists.set(stylistId, stylistName);
              }
            });

            // Add primary stylist if not already in the map
            if (appointment.stylist?.id && appointment.stylist?.name) {
              serviceStylists.set(appointment.stylist.id, appointment.stylist.name);
            }

            const uniqueStylists = Array.from(serviceStylists.values());

            if (uniqueStylists.length === 0) {
              return null;
            }

            if (uniqueStylists.length === 1) {
              return (
                <div className="flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <span>{uniqueStylists[0]}</span>
                </div>
              );
            }

            // Multiple stylists
            return (
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="text-sm text-muted-foreground">Multiple Stylists</span>
                  <div className="flex flex-wrap gap-1">
                    {uniqueStylists.map((name, idx) => (
                      <span key={idx} className="text-xs px-2 py-0.5 rounded-full bg-muted">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

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
              (() => {
                // Sort services by sequence
                const sortedServices = [...appointment.services].sort(
                  (a, b) => (a.sequence ?? 1) - (b.sequence ?? 1)
                );

                // Group services into parallel groups
                // A service with runParallel: true runs with the previous service
                const groups: Array<typeof appointment.services> = [];
                let currentGroup: typeof appointment.services = [];

                sortedServices.forEach((service, index) => {
                  if (index === 0) {
                    // First service always starts a new group
                    currentGroup = [service];
                  } else if (service.runParallel) {
                    // This service runs in parallel with the previous one
                    currentGroup.push(service);
                  } else {
                    // This service is sequential - save current group and start new one
                    if (currentGroup.length > 0) {
                      groups.push(currentGroup);
                    }
                    currentGroup = [service];
                  }
                });

                // Don't forget the last group
                if (currentGroup.length > 0) {
                  groups.push(currentGroup);
                }

                // Render groups
                return groups.map((group, groupIndex) => {
                  const isParallel = group.length > 1;

                  if (isParallel) {
                    // Render parallel services in a grouped container
                    return (
                      <div key={`group-${groupIndex}`} className="space-y-2">
                        <div className="flex items-center gap-2 px-1">
                          <div className="h-px flex-1 bg-purple-200 dark:bg-purple-800" />
                          <span className="text-xs font-medium text-purple-600 dark:text-purple-400 flex items-center gap-1">
                            <svg
                              className="h-3 w-3"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                            >
                              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
                            </svg>
                            Parallel Services
                          </span>
                          <div className="h-px flex-1 bg-purple-200 dark:bg-purple-800" />
                        </div>
                        <div className="pl-3 border-l-2 border-purple-300 dark:border-purple-700 space-y-2">
                          {group.map((service, index) => (
                            <ServiceCard
                              key={service.id || `${groupIndex}-${index}`}
                              serviceName={service.serviceName}
                              price={service.unitPrice}
                              duration={service.durationMinutes}
                              quantity={service.quantity}
                              stylistName={
                                service.actualStylist?.name || service.assignedStylist?.name
                              }
                              stationName={service.station?.name}
                              stationTypeName={service.station?.stationType?.name}
                              status={service.status}
                              isParallel
                            />
                          ))}
                        </div>
                      </div>
                    );
                  }

                  // Single service in group
                  const service = group[0];
                  return (
                    <ServiceCard
                      key={service.id || `group-${groupIndex}`}
                      serviceName={service.serviceName}
                      price={service.unitPrice}
                      duration={service.durationMinutes}
                      quantity={service.quantity}
                      stylistName={service.actualStylist?.name || service.assignedStylist?.name}
                      stationName={service.station?.name}
                      stationTypeName={service.station?.stationType?.name}
                      status={service.status}
                    />
                  );
                });
              })()
            ) : (
              <p className="text-muted-foreground text-sm">No services added</p>
            )}
          </div>
          {appointment.services && appointment.services.some((s: { status: string; unitPrice: number }) => s.status !== 'skipped' && Number(s.unitPrice) > 0) && (
            <div className="mt-8 pt-3 border-t space-y-2">
              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <span>Subtotal</span>
                <span>₹{(appointment.services
                  ? appointment.services
                      .filter((s: { status: string }) => s.status !== 'skipped')
                      .reduce((sum: number, s: { unitPrice: number; quantity: number }) => sum + Number(s.unitPrice) * s.quantity, 0)
                  : appointment.subtotal || 0
                ).toLocaleString('en-IN')}</span>
              </div>
              {appointment.services &&
                appointment.services
                  .filter((s: { status: string }) => s.status !== 'skipped')
                  .reduce((sum: number, s: { taxAmount: number }) => sum + Number(s.taxAmount), 0) > 0 && (
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>
                    Tax (GST{' '}
                    {appointment.services && appointment.services.length > 0
                      ? `${appointment.services[0].taxRate}%`
                      : '18%'}
                    )
                  </span>
                  <span>₹{(appointment.services
                    ? appointment.services
                        .filter((s: { status: string }) => s.status !== 'skipped')
                        .reduce((sum: number, s: { taxAmount: number }) => sum + Number(s.taxAmount), 0)
                    : appointment.taxAmount
                  ).toLocaleString('en-IN')}</span>
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
                  ₹{(appointment.services
                    ? (() => {
                        const billable = appointment.services.filter((s: { status: string }) => s.status !== 'skipped');
                        const sub = billable.reduce((sum: number, s: { unitPrice: number; quantity: number }) => sum + Number(s.unitPrice) * s.quantity, 0);
                        const tax = billable.reduce((sum: number, s: { taxAmount: number }) => sum + Number(s.taxAmount), 0);
                        return sub + tax - (appointment.discountAmount || 0);
                      })()
                    : appointment.totalAmount
                  ).toLocaleString('en-IN')}
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
        {/* Ready for Checkout - Show when all services are done but payment not yet captured */}
        {appointment.status === 'ready_for_checkout' && (
          <>
            <Separator />
            <Notice
              severity="info"
              title="Ready for Checkout"
              description="All services have been completed. Please proceed to checkout to finalize the payment."
              action={
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100"
                  onClick={handleCheckout}
                >
                  <CreditCard className="h-4 w-4 mr-1" />
                  Proceed to Checkout
                  <ExternalLink className="h-3 w-3 ml-1" />
                </Button>
              }
            />
          </>
        )}

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
        {/* Loading indicator when data is being refetched */}
        {isFetching && !isLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground py-1">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Updating...</span>
          </div>
        )}

        {/* Checkout Mode - Show Confirm & Proceed button */}
        {isCheckoutMode && (
          <Button
            className="w-full"
            size="lg"
            onClick={handleProceedToCheckout}
            disabled={isButtonsDisabled}
          >
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
                      disabled={isButtonsDisabled}
                    >
                      <Icon className="h-4 w-4 mr-1" />
                      {action.label}
                    </Button>
                  );
                })}

                {/* Reschedule button for non-completed appointments */}
                {canReschedule && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleReschedule}
                    disabled={isButtonsDisabled}
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reschedule
                  </Button>
                )}
              </div>
            )}

            {/* Checkout Button */}
            {showCheckout && (
              <Button
                className="w-full"
                size="lg"
                onClick={handleCheckout}
                disabled={isButtonsDisabled}
              >
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
  stationName?: string;
  stationTypeName?: string;
  quantity?: number;
  status?: string;
  isParallel?: boolean;
}

// Valid status types that can be used with StatusBadge
const VALID_SERVICE_STATUSES = [
  'waiting',
  'in_progress',
  'completed',
  'pending',
  'cancelled',
  'skipped',
] as const;

function ServiceCard({
  serviceName,
  price,
  duration,
  stylistName,
  stationName,
  stationTypeName,
  quantity = 1,
  status,
  isParallel = false,
}: ServiceCardProps) {
  // Check if status is a valid StatusBadge type
  const isValidStatus =
    status && VALID_SERVICE_STATUSES.includes(status as (typeof VALID_SERVICE_STATUSES)[number]);

  // Skipped services show ₹0
  const isSkipped = status === 'skipped';
  const displayPrice = isSkipped ? 0 : (price ?? 0) * quantity;

  return (
    <div
      className={cn(
        'p-3 rounded-lg border bg-gradient-to-r from-muted/30 to-transparent',
        'hover:from-muted/50 transition-colors',
        isParallel && 'border-purple-200 dark:border-purple-800',
        isSkipped && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className={cn('font-medium text-sm truncate', isSkipped && 'line-through')}>
              {serviceName}
              {quantity > 1 && <span className="text-muted-foreground ml-1">×{quantity}</span>}
            </p>
            {isValidStatus && (
              <StatusBadge
                status={
                  status as
                    | 'waiting'
                    | 'in_progress'
                    | 'completed'
                    | 'pending'
                    | 'cancelled'
                    | 'skipped'
                }
                size="sm"
              />
            )}
          </div>
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
            {stationName && (status === 'in_progress' || status === 'completed') && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1">
                  {stationName}
                  {stationTypeName && (
                    <span className="text-[10px] text-muted-foreground/70">({stationTypeName})</span>
                  )}
                </span>
              </>
            )}
          </div>
        </div>
        {price != null && (
          <span
            className={cn(
              'font-semibold text-sm whitespace-nowrap',
              isSkipped && 'line-through text-muted-foreground'
            )}
          >
            ₹{displayPrice.toLocaleString('en-IN')}
          </span>
        )}
      </div>
    </div>
  );
}
