'use client';

/**
 * Start Service Dialog
 *
 * Dialog for starting an appointment service with station assignment.
 * Shows available stations in a compact grid layout with status badges.
 */

import { useState, useCallback, useMemo } from 'react';
import { PlayCircle, Armchair, AlertCircle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useFloorView, useAssignStation } from '@/hooks/queries/use-stations';
import { useUpdateAppointmentStatus } from '@/hooks/queries/use-appointments';
import { useBranchContext } from '@/hooks/use-branch-context';
import { cn } from '@/lib/utils';
import { isPendingAppointment } from '@/lib/appointment-helpers';
import { toast } from 'sonner';

interface StartServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  customerName?: string;
  serviceName?: string;
  scheduledTime?: string; // HH:mm format
  onSuccess?: () => void;
}

const statusConfig: Record<string, { bg: string; text?: string; label: string; color: string }> = {
  available: {
    bg: 'bg-green-400',
    label: 'Available',
    color: '#22c55e',
  },
  occupied: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Occupied',
    color: '#3b82f6',
  },
  out_of_service: {
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-400',
    label: 'Out of Service',
    color: '#6b7280',
  },
};

export function StartServiceDialog({
  open,
  onOpenChange,
  appointmentId,
  customerName,
  serviceName,
  scheduledTime,
  onSuccess,
}: StartServiceDialogProps) {
  const { branchId } = useBranchContext();
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);
  const [showPendingWarning, setShowPendingWarning] = useState(false);
  const [pendingStationData, setPendingStationData] = useState<{
    stationId: string;
    stationName: string;
    appointment: any;
  } | null>(null);

  const { data: floorViewData, isLoading: stationsLoading } = useFloorView(branchId || '');

  const assignStationMutation = useAssignStation(branchId || undefined);
  const updateStatusMutation = useUpdateAppointmentStatus();

  const isLoading = assignStationMutation.isPending || updateStatusMutation.isPending;

  // Calculate time variance (positive = late, negative = early)
  // Only calculate when dialog is actually open to ensure fresh calculation
  const timeVariance = useMemo(() => {
    if (!open || !scheduledTime) {
      return null;
    }

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const [schedHours, schedMins] = scheduledTime.split(':').map(Number);
    const [currentHours, currentMins] = currentTime.split(':').map(Number);

    const schedTotalMins = schedHours * 60 + schedMins;
    const currentTotalMins = currentHours * 60 + currentMins;

    const varianceMins = currentTotalMins - schedTotalMins;

    // Only show warning if variance exceeds 2-minute tolerance
    const TOLERANCE_MINUTES = 2;
    if (Math.abs(varianceMins) > TOLERANCE_MINUTES) {
      return varianceMins;
    }

    return null;
  }, [open, scheduledTime]);

  const handleStationSelect = useCallback(
    (stationId: string) => {
      const station = floorViewData?.stations.find((s) => s.id === stationId);
      if (!station) return;

      // Check if station has a pending appointment
      if (station.appointment && isPendingAppointment(station.appointment)) {
        setPendingStationData({
          stationId,
          stationName: station.name,
          appointment: station.appointment,
        });
        setShowPendingWarning(true);
        return;
      }

      // If no pending appointment, select the station
      setSelectedStationId(stationId);
    },
    [floorViewData?.stations]
  );

  const handleStart = useCallback(() => {
    // If station is selected, assign it
    if (selectedStationId) {
      assignStationMutation.mutate(
        {
          appointmentId,
          stationId: selectedStationId,
        },
        {
          onSuccess: () => {
            toast.success('Service started');
            onOpenChange(false);
            setSelectedStationId(null);
            onSuccess?.();
          },
          onError: (error: any) => {
            toast.error(error?.message || 'Failed to start service');
          },
        }
      );
    } else {
      // If no station selected, just update status to in_progress
      updateStatusMutation.mutate(
        {
          id: appointmentId,
          status: 'in_progress',
        },
        {
          onSuccess: () => {
            toast.success('Service started');
            onOpenChange(false);
            setSelectedStationId(null);
            onSuccess?.();
          },
          onError: (error: any) => {
            toast.error(error?.message || 'Failed to start service');
          },
        }
      );
    }
  }, [
    appointmentId,
    selectedStationId,
    assignStationMutation,
    updateStatusMutation,
    onOpenChange,
    onSuccess,
  ]);

  const handleClose = useCallback(() => {
    setSelectedStationId(null);
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              Start Service
            </DialogTitle>
            <DialogDescription>
              {customerName ? (
                <>
                  Start the service for <span className="font-medium">{customerName}</span>
                  {serviceName && (
                    <>
                      {' '}
                      - <span className="font-medium">{serviceName}</span>
                    </>
                  )}
                </>
              ) : (
                'Start this appointment service'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <div className="flex items-center gap-2 mb-4">
              <Armchair className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium text-sm">Assign Station (Optional)</span>
            </div>

            {/* Time Variance Warning */}
            {timeVariance !== null && (
              <div
                className={cn(
                  'mb-4 p-3 border rounded-lg flex gap-3',
                  timeVariance > 0 ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'
                )}
              >
                <AlertCircle
                  className={cn(
                    'h-5 w-5 flex-shrink-0 mt-0.5',
                    timeVariance > 0 ? 'text-orange-600' : 'text-blue-600'
                  )}
                />
                <div>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      timeVariance > 0 ? 'text-orange-900' : 'text-blue-900'
                    )}
                  >
                    {timeVariance > 0
                      ? `Appointment starting ${Math.abs(timeVariance)} minute${Math.abs(timeVariance) !== 1 ? 's' : ''} late`
                      : `Appointment starting ${Math.abs(timeVariance)} minute${Math.abs(timeVariance) !== 1 ? 's' : ''} early`}
                  </p>
                  <p
                    className={cn(
                      'text-xs mt-1',
                      timeVariance > 0 ? 'text-orange-700' : 'text-blue-700'
                    )}
                  >
                    Scheduled: {scheduledTime} • Current:{' '}
                    {new Date().toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    })}
                  </p>
                </div>
              </div>
            )}

            {stationsLoading ? (
              <div className="grid grid-cols-3 gap-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : !floorViewData?.stations || floorViewData.stations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No stations available</p>
                <p className="text-xs mt-1">You can still start the service without a station</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 max-h-64 overflow-y-auto px-2 py-1">
                {floorViewData.stations.map((station) => {
                  const config = statusConfig[station.status];

                  return (
                    <button
                      key={station.id}
                      onClick={() => handleStationSelect(station.id)}
                      disabled={isLoading}
                      className={cn(
                        'relative p-3 rounded-lg border-2 transition-all text-left',
                        'disabled:opacity-50 disabled:cursor-not-allowed',
                        selectedStationId === station.id
                          ? 'border-primary bg-primary/5 ring-2 ring-primary'
                          : 'border-border hover:border-primary/50 hover:bg-accent/50'
                      )}
                    >
                      {/* Station Name */}
                      <p className="font-medium text-sm truncate">{station.name}</p>

                      <div className="flex justify-between">
                        {/* Station Type */}
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {station.stationType?.name}
                        </p>
                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn('text-[10px] px-2 py-0.5', config.bg, config.text)}
                            variant="outline"
                          >
                            {config.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Selection Indicator */}
                      {selectedStationId === station.id && (
                        <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Skip station option */}
            {floorViewData?.stations && floorViewData.stations.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-4 w-full text-muted-foreground"
                onClick={() => setSelectedStationId(null)}
                disabled={!selectedStationId}
              >
                Skip station assignment
              </Button>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleStart} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Start Service
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pending Appointment Warning Dialog */}
      {showPendingWarning && pendingStationData && (
        <Dialog open={showPendingWarning} onOpenChange={setShowPendingWarning}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Pending Appointment
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-red-900">
                  Station &ldquo;{pendingStationData.stationName}&rdquo; has an incomplete appointment
                </p>
                <div className="text-sm text-red-700 space-y-1">
                  <p>
                    <span className="font-medium">Customer:</span>{' '}
                    {pendingStationData.appointment.customerName}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span>{' '}
                    {pendingStationData.appointment.scheduledDate}
                  </p>
                  <p>
                    <span className="font-medium">Time:</span>{' '}
                    {pendingStationData.appointment.scheduledTime}
                  </p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground">
                Please complete or deassign the previous appointment before assigning a new one to
                this station.
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowPendingWarning(false)}>
                Cancel
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
