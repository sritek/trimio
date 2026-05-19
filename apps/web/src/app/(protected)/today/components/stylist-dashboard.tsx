'use client';

/**
 * Stylist Dashboard Component
 * Shows attendance buttons (with confirmation) + leave application
 * + today's read-only appointments (card/list view)
 * + walk-in queue section (for receptionist role)
 * Mobile-first design
 */

import { useState, useMemo, useCallback } from 'react';
import { format } from 'date-fns';
import {
  CheckCircle2,
  XCircle,
  CalendarOff,
  LayoutGrid,
  List,
  Clock,
  User,
  Scissors,
} from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge, ConfirmDialog } from '@/components/common';
import { useOpenPanel } from '@/components/ux/slide-over';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores';
import { useBranchContext } from '@/hooks/use-branch-context';
import { useErrorHandler } from '@/hooks/use-error-handler';
import { useAppointments } from '@/hooks/queries/use-appointments';
import { useStaffCheckIn, useAttendanceList, useManualAttendance } from '@/hooks/queries/use-staff';
import { WalkInQueueSection } from './walk-in-queue-section';
import type { Appointment, WalkInQueueEntry } from '@/types/appointments';
import type { AttendanceStatus } from '@/types/staff';

// ============================================
// Attendance Section
// ============================================

function AttendanceSection() {
  const { user } = useAuthStore();
  const { branchId } = useBranchContext();
  const { handleError } = useErrorHandler();
  const today = format(new Date(), 'yyyy-MM-dd');

  // Confirm dialog state
  const [confirmAction, setConfirmAction] = useState<'present' | 'absent' | 'on_leave' | null>(
    null
  );

  const checkInMutation = useStaffCheckIn();
  const manualAttendanceMutation = useManualAttendance();

  // Fetch today's attendance
  const { data: attendanceData, isLoading: attendanceLoading } = useAttendanceList({
    branchId: branchId || '',
    userId: user?.id,
    startDate: today,
    endDate: today,
  });

  const todayAttendance = attendanceData?.data?.[0];
  const hasMarked = !!todayAttendance;
  const currentStatus = todayAttendance?.status;

  const handleConfirmPresent = useCallback(() => {
    if (!branchId) return;
    checkInMutation.mutate(
      { branchId },
      {
        onSuccess: () => {
          toast.success('Marked as present');
          setConfirmAction(null);
        },
        onError: (error: unknown) => {
          handleError(error);
          setConfirmAction(null);
        },
      }
    );
  }, [branchId, checkInMutation, handleError]);

  const handleConfirmAbsent = useCallback(() => {
    if (!branchId || !user?.id) return;
    manualAttendanceMutation.mutate(
      {
        userId: user.id,
        branchId,
        attendanceDate: today,
        status: 'absent' as AttendanceStatus,
      },
      {
        onSuccess: () => {
          toast.success('Marked as absent');
          setConfirmAction(null);
        },
        onError: (error: unknown) => {
          handleError(error);
          setConfirmAction(null);
        },
      }
    );
  }, [branchId, user?.id, today, manualAttendanceMutation, handleError]);

  const handleConfirmLeave = useCallback(() => {
    if (!branchId || !user?.id) return;
    manualAttendanceMutation.mutate(
      {
        userId: user.id,
        branchId,
        attendanceDate: today,
        status: 'on_leave' as AttendanceStatus,
      },
      {
        onSuccess: () => {
          toast.success('Marked as on leave');
          setConfirmAction(null);
        },
        onError: (error: unknown) => {
          handleError(error);
          setConfirmAction(null);
        },
      }
    );
  }, [branchId, user?.id, today, manualAttendanceMutation, handleError]);

  const isLoading = checkInMutation.isPending || manualAttendanceMutation.isPending;

  if (attendanceLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-3 gap-3">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    );
  }

  const statusLabel: Record<string, string> = {
    present: 'Present',
    absent: 'Absent',
    on_leave: 'On Leave',
    half_day: 'Half Day',
    holiday: 'Holiday',
    week_off: 'Week Off',
  };

  const statusVariant = (s: string) => {
    if (s === 'present') return 'default';
    if (s === 'absent') return 'destructive';
    if (s === 'on_leave') return 'warning';
    return 'secondary';
  };

  return (
    <div className="space-y-4">
      {/* Already marked state */}
      {hasMarked && (
        <div className="rounded-lg border bg-muted/50 p-4 text-center">
          <p className="text-sm text-muted-foreground mb-1">Today&apos;s attendance</p>
          <Badge variant={statusVariant(currentStatus || '')} className="text-sm">
            {statusLabel[currentStatus || ''] || currentStatus}
          </Badge>
        </div>
      )}

      {/* Attendance buttons */}
      {!hasMarked && (
        <div className="grid grid-cols-3 gap-3">
          <Button
            variant="outline"
            className="flex flex-col items-center gap-1 h-auto py-4 border-primary/30 hover:bg-primary/5 hover:border-primary"
            onClick={() => setConfirmAction('present')}
            disabled={isLoading}
          >
            <CheckCircle2 className="h-6 w-6 text-primary" />
            <span className="text-xs font-medium">Present</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center gap-1 h-auto py-4 border-destructive/30 hover:bg-destructive/5 hover:border-destructive"
            onClick={() => setConfirmAction('absent')}
            disabled={isLoading}
          >
            <XCircle className="h-6 w-6 text-destructive" />
            <span className="text-xs font-medium">Absent</span>
          </Button>
          <Button
            variant="outline"
            className="flex flex-col items-center gap-1 h-auto py-4 border-warning/30 hover:bg-warning/5 hover:border-warning"
            onClick={() => setConfirmAction('on_leave')}
            disabled={isLoading}
          >
            <CalendarOff className="h-6 w-6 text-warning" />
            <span className="text-xs font-medium">Leave</span>
          </Button>
        </div>
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={confirmAction === 'present'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Mark as Present"
        description="Are you sure you want to mark yourself as present for today?"
        confirmText="Yes, I'm Present"
        variant="default"
        onConfirm={handleConfirmPresent}
        isLoading={checkInMutation.isPending}
      />
      <ConfirmDialog
        open={confirmAction === 'absent'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Mark as Absent"
        description="Are you sure you want to mark yourself as absent for today?"
        confirmText="Yes, Mark Absent"
        variant="destructive"
        onConfirm={handleConfirmAbsent}
        isLoading={manualAttendanceMutation.isPending}
      />
      <ConfirmDialog
        open={confirmAction === 'on_leave'}
        onOpenChange={(open) => !open && setConfirmAction(null)}
        title="Mark as On Leave"
        description="Are you sure you want to mark yourself as on leave for today?"
        confirmText="Yes, Mark Leave"
        variant="default"
        onConfirm={handleConfirmLeave}
        isLoading={manualAttendanceMutation.isPending}
      />
    </div>
  );
}

// ============================================
// Appointment Card View
// ============================================

/**
 * Calculate the time window for a stylist's services within a multi-service appointment.
 * Uses scheduledStartTime/scheduledEndTime if available, otherwise estimates from sequence.
 */
function getStylistTimeWindow(
  appointmentStartTime: string,
  allServices: Appointment['services'],
  myServices: Appointment['services']
): { startTime: string; endTime: string; totalMinutes: number } | null {
  if (!myServices || myServices.length === 0) return null;

  const totalMinutes = myServices.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);

  // Try to use scheduledStartTime/scheduledEndTime from the services
  const startTimes = myServices
    .map((s) => s.scheduledStartTime)
    .filter(Boolean) as string[];
  const endTimes = myServices
    .map((s) => s.scheduledEndTime)
    .filter(Boolean) as string[];

  if (startTimes.length > 0 && endTimes.length > 0) {
    const earliest = startTimes.sort()[0];
    const latest = endTimes.sort().reverse()[0];
    // Format as HH:mm
    const startTime = new Date(earliest).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    const endTime = new Date(latest).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
    return { startTime, endTime, totalMinutes };
  }

  // Fallback: estimate from sequence position
  // Calculate offset from appointment start based on services before this stylist's services
  if (allServices && allServices.length > 0 && myServices[0].sequence) {
    const sortedAll = [...allServices].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    let offsetMinutes = 0;
    for (const s of sortedAll) {
      if (s.sequence && myServices[0].sequence && s.sequence < myServices[0].sequence && !s.runParallel) {
        offsetMinutes += s.durationMinutes || 0;
      }
    }

    // Parse appointment start time and add offset
    const [hours, minutes] = appointmentStartTime.split(':').map(Number);
    const startDate = new Date(2000, 0, 1, hours, minutes + offsetMinutes);
    const endDate = new Date(2000, 0, 1, hours, minutes + offsetMinutes + totalMinutes);
    const startTime = `${startDate.getHours().toString().padStart(2, '0')}:${startDate.getMinutes().toString().padStart(2, '0')}`;
    const endTime = `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
    return { startTime, endTime, totalMinutes };
  }

  return { startTime: appointmentStartTime, endTime: '', totalMinutes };
}

function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const { user } = useAuthStore();
  const services = appointment.services || [];
  const isMultiService = services.length > 1;

  // For multi-service, show only this stylist's services
  const myServices = isMultiService
    ? services.filter(
        (s) => s.actualStylistId === user?.id || s.assignedStylistId === user?.id
      )
    : services;
  const serviceNames = myServices.map((s) => s.serviceName).join(', ');

  // Calculate this stylist's time window
  const timeWindow = isMultiService
    ? getStylistTimeWindow(appointment.scheduledTime, services, myServices)
    : null;

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">
            {isMultiService && timeWindow
              ? `${timeWindow.startTime} - ${timeWindow.endTime}`
              : `${appointment.scheduledTime} - ${appointment.scheduledEndTime}`}
          </span>
          <StatusBadge status={appointment.status} size="sm" />
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <User className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{appointment.customerName || 'Walk-in'}</span>
        </div>
        {serviceNames && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Scissors className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{serviceNames}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-3.5 w-3.5 shrink-0" />
          <span>
            {isMultiService && timeWindow
              ? `${timeWindow.totalMinutes} min · ${myServices.length} of ${services.length} services`
              : `${appointment.totalDuration} min`}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Appointment List Row
// ============================================

function AppointmentRow({ appointment }: { appointment: Appointment }) {
  const { user } = useAuthStore();
  const services = appointment.services || [];
  const isMultiService = services.length > 1;

  // For multi-service, show only this stylist's services
  const myServices = isMultiService
    ? services.filter(
        (s) => s.actualStylistId === user?.id || s.assignedStylistId === user?.id
      )
    : services;
  const serviceNames = myServices.map((s) => s.serviceName).join(', ');

  // Calculate this stylist's time window
  const timeWindow = isMultiService
    ? getStylistTimeWindow(appointment.scheduledTime, services, myServices)
    : null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border">
      <div className="min-w-[70px] text-center shrink-0">
        <p className="text-sm font-medium">
          {isMultiService && timeWindow ? timeWindow.startTime : appointment.scheduledTime}
        </p>
        <p className="text-xs text-muted-foreground">
          {isMultiService && timeWindow ? `${timeWindow.totalMinutes}m` : `${appointment.totalDuration}m`}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{appointment.customerName || 'Walk-in'}</p>
        <p className="text-xs text-muted-foreground truncate">
          {serviceNames || '—'}
          {isMultiService && ` (${myServices.length}/${services.length})`}
        </p>
      </div>
      <StatusBadge status={appointment.status} size="sm" />
    </div>
  );
}

// ============================================
// Appointments Section
// ============================================

type ViewMode = 'card' | 'list';

function AppointmentsSection() {
  const { user } = useAuthStore();
  const { branchId } = useBranchContext();
  const today = format(new Date(), 'yyyy-MM-dd');
  const [viewMode, setViewMode] = useState<ViewMode>('card');

  const { data, isLoading } = useAppointments(
    {
      branchId: branchId || '',
      stylistId: user?.id || '',
      dateFrom: today,
      dateTo: today,
      limit: 50,
      sortBy: 'scheduledTime',
      sortOrder: 'asc',
    },
    { enabled: !!branchId && !!user?.id }
  );

  const appointments = useMemo(() => data?.data || [], [data]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-20" />
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Today&apos;s Appointments
          {appointments.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground ml-2">
              ({appointments.length})
            </span>
          )}
        </h2>
        <div className="flex items-center border rounded-md">
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 rounded-r-none', viewMode === 'card' && 'bg-muted')}
            onClick={() => setViewMode('card')}
            aria-label="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn('h-8 w-8 rounded-l-none', viewMode === 'list' && 'bg-muted')}
            onClick={() => setViewMode('list')}
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {appointments.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <Scissors className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">No appointments scheduled for today.</p>
        </div>
      )}

      {viewMode === 'card' && appointments.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2">
          {appointments.map((apt) => (
            <AppointmentCard key={apt.id} appointment={apt} />
          ))}
        </div>
      )}

      {viewMode === 'list' && appointments.length > 0 && (
        <div className="space-y-2">
          {appointments.map((apt) => (
            <AppointmentRow key={apt.id} appointment={apt} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Stylist Dashboard
// ============================================

export function StylistDashboard() {
  const { openNewAppointment } = useOpenPanel();

  // Handle serve from walk-in queue - opens new appointment panel with pre-filled data
  const handleServeWalkIn = useCallback(
    (entry: WalkInQueueEntry) => {
      // Get current time in HH:mm format for walk-ins
      const now = new Date();
      const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

      // Open new appointment panel with customer, services, time, stylist preference, and booking type pre-filled
      openNewAppointment({
        customerId: entry.customerId || undefined,
        serviceIds: entry.serviceIds,
        walkInQueueId: entry.id,
        bookingType: 'walk_in',
        time: currentTime,
        stylistId: entry.stylistPreferenceId || undefined,
      });
    },
    [openNewAppointment]
  );

  return (
    <div className="space-y-6">
      <WalkInQueueSection onServe={handleServeWalkIn} />
      <AttendanceSection />
      <AppointmentsSection />
    </div>
  );
}
