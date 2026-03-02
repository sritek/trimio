'use client';

/**
 * Unassigned Appointments Panel
 * Based on: .kiro/specs/waitlist-unassigned-appointments/design.md
 * Requirements: 5.2, 5.3, 5.4, 5.5
 *
 * SlideOver panel for viewing and assigning stylists to unassigned appointments.
 */

import { useState, useCallback } from 'react';
import { format } from 'date-fns';
import { Calendar, Clock, User, Scissors, UserPlus, AlertCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useClosePanel } from '@/components/ux/slide-over';
import {
  useUnassignedAppointments,
  useAssignStylist,
  useAvailableStylists,
} from '@/hooks/queries/use-appointments';
import { useBranchContext } from '@/hooks/use-branch-context';

import type { Appointment } from '@/types/appointments';

export function UnassignedAppointmentsPanel() {
  const closePanel = useClosePanel();
  const { branchId: activeBranchId } = useBranchContext();
  const today = format(new Date(), 'yyyy-MM-dd');

  const {
    data: appointments,
    isLoading,
    error,
  } = useUnassignedAppointments(activeBranchId || '', today);

  // Loading state
  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="border rounded-lg p-4 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-8 w-24" />
          </div>
        ))}
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="p-6 text-center">
        <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Failed to load appointments</h3>
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <Button variant="outline" onClick={() => closePanel()}>
          Close
        </Button>
      </div>
    );
  }

  // Empty state
  if (!appointments || appointments.length === 0) {
    return (
      <div className="p-6 text-center">
        <UserPlus className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">No unassigned appointments</h3>
        <p className="text-muted-foreground mb-4">
          All appointments for today have stylists assigned.
        </p>
        <Button variant="outline" onClick={() => closePanel()}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b">
        <p className="text-sm text-muted-foreground">
          {appointments.length} appointment{appointments.length !== 1 ? 's' : ''} need stylist
          assignment
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {appointments.map((appointment) => (
          <UnassignedAppointmentCard key={appointment.id} appointment={appointment} />
        ))}
      </div>
    </div>
  );
}

// ============================================
// Appointment Card Component
// ============================================

interface UnassignedAppointmentCardProps {
  appointment: Appointment;
}

function UnassignedAppointmentCard({ appointment }: UnassignedAppointmentCardProps) {
  const [isAssigning, setIsAssigning] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const { branchId: activeBranchId } = useBranchContext();

  const assignStylist = useAssignStylist();

  // Calculate duration from services
  const totalDuration =
    appointment.services?.reduce((sum, s) => sum + (s.durationMinutes || 30), 0) || 30;

  // Fetch available stylists when popover opens
  const { data: availableStylists, isLoading: loadingStylists } = useAvailableStylists({
    branchId: activeBranchId || '',
    date: appointment.scheduledDate,
    time: appointment.scheduledTime,
    duration: totalDuration,
  });

  const handleAssign = useCallback(
    async (stylistId: string) => {
      setIsAssigning(true);
      try {
        await assignStylist.mutateAsync({ id: appointment.id, stylistId });
        toast.success('Stylist assigned successfully');
        setPopoverOpen(false);
      } catch {
        toast.error('Failed to assign stylist');
      } finally {
        setIsAssigning(false);
      }
    },
    [appointment.id, assignStylist]
  );

  return (
    <div className="border rounded-lg p-4 space-y-3">
      {/* Customer Info */}
      <div className="flex items-start justify-between">
        <div>
          <h4 className="font-medium">{appointment.customerName || 'Walk-in Customer'}</h4>
          {appointment.customerPhone && (
            <p className="text-sm text-muted-foreground">{appointment.customerPhone}</p>
          )}
        </div>
      </div>

      {/* Time */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock className="h-4 w-4" />
          <span>
            {appointment.scheduledTime} - {appointment.endTime || '--:--'}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          <span>{format(new Date(appointment.scheduledDate), 'MMM d')}</span>
        </div>
      </div>

      {/* Services */}
      {appointment.services && appointment.services.length > 0 && (
        <div className="flex items-center gap-1 text-sm">
          <Scissors className="h-4 w-4 text-muted-foreground" />
          <span>{appointment.services.map((s) => s.serviceName).join(', ')}</span>
        </div>
      )}

      {/* Assign Button */}
      <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" className="w-full">
            <UserPlus className="h-4 w-4 mr-2" />
            Assign Stylist
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64 p-0" align="start">
          <div className="p-3 border-b">
            <h4 className="font-medium text-sm">Available Stylists</h4>
            <p className="text-xs text-muted-foreground">
              For {appointment.scheduledTime} ({totalDuration} min)
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {loadingStylists ? (
              <div className="p-4 text-center">
                <Loader2 className="h-5 w-5 animate-spin mx-auto" />
              </div>
            ) : availableStylists && availableStylists.length > 0 ? (
              <div className="divide-y">
                {availableStylists.map((stylist) => (
                  <button
                    key={stylist.id}
                    className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2 disabled:opacity-50"
                    onClick={() => handleAssign(stylist.id)}
                    disabled={isAssigning}
                  >
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{stylist.name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-4 text-center text-sm text-muted-foreground">
                No stylists available for this time slot
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
