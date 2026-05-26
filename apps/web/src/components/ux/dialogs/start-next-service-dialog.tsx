'use client';

/**
 * Start Next Service Dialog
 *
 * Dialog for starting the next service(s) in a multi-service appointment.
 * Supports parallel services with per-service stylist override.
 * Allows station selection and optional stylist override for each service.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  PlayCircle,
  Armchair,
  AlertCircle,
  Loader2,
  Scissors,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';

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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFloorView } from '@/hooks/queries/use-stations';
import { useStartService, useStylistAvailability } from '@/hooks/queries/use-appointments';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useBranchContext } from '@/hooks/use-branch-context';
import { cn } from '@/lib/utils';
import { isPendingAppointment } from '@/lib/appointment-helpers';
import { format } from 'date-fns';
import { toast } from 'sonner';
import type { UpNextService, FloorViewStatus } from '@/types/stations';

interface StartNextServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  /** Primary service (backward compat) */
  service: UpNextService;
  /** All parallel services to start together */
  allServices?: UpNextService[];
  currentStationId?: string;
  onSuccess?: () => void;
}

// Per-service stylist override state
interface ServiceStylistOverride {
  serviceId: string;
  override: boolean;
  selectedStylistId: string | null;
}

// Availability indicator for overridden stylist
function StylistAvailabilityIndicator({
  stylistId,
  duration,
}: {
  stylistId: string;
  duration: number;
}) {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const currentTime = format(now, 'HH:mm');

  const { data: availability, isLoading } = useStylistAvailability(
    stylistId,
    todayStr,
    currentTime,
    duration,
    { enabled: !!stylistId && duration > 0 }
  );

  if (isLoading) {
    return (
      <p className="text-xs text-muted-foreground mt-1.5 ml-6">
        Checking availability...
      </p>
    );
  }

  if (!availability) return null;

  if (availability.available) {
    return (
      <div className="flex items-center gap-1.5 mt-1.5 ml-6">
        <CheckCircle className="h-3.5 w-3.5 text-green-600 flex-shrink-0" />
        <p className="text-xs text-green-700 dark:text-green-400 font-medium">
          Available now
        </p>
      </div>
    );
  }

  // Not available — show detailed reason
  const reason = availability.conflictReason || 'Not available';
  const conflicting = availability.conflictingAppointment;

  return (
    <div className="mt-1.5 ml-6 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded px-2.5 py-2 space-y-0.5">
      <div className="flex items-start gap-1.5">
        <AlertTriangle className="h-3.5 w-3.5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-xs font-medium text-red-800 dark:text-red-300">
            Not available right now
          </p>
          <p className="text-xs text-red-700 dark:text-red-400">
            {reason}
            {conflicting && (
              <span> ({conflicting.scheduledTime})</span>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

// Station status configuration
const statusConfig: Record<FloorViewStatus, { bg: string; text?: string; label: string }> = {
  available: {
    bg: 'bg-green-400',
    label: 'Available',
  },
  occupied: {
    bg: 'bg-blue-100 dark:bg-blue-900/30',
    label: 'Occupied',
  },
  reserved: {
    bg: 'bg-amber-100 dark:bg-amber-900/30',
    label: 'Reserved',
  },
  out_of_service: {
    bg: 'bg-gray-100 dark:bg-gray-900/30',
    text: 'text-gray-400',
    label: 'Out of Service',
  },
};

export function StartNextServiceDialog({
  open,
  onOpenChange,
  appointmentId,
  service,
  allServices,
  currentStationId,
  onSuccess,
}: StartNextServiceDialogProps) {
  const { branchId } = useBranchContext();

  // Determine the services to start (parallel services or single)
  const servicesToStart = useMemo(
    () => (allServices && allServices.length > 0 ? allServices : [service]),
    [allServices, service]
  );
  const isParallel = servicesToStart.length > 1;

  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    currentStationId || null
  );
  const [showPendingWarning, setShowPendingWarning] = useState(false);
  const [pendingStationData, setPendingStationData] = useState<{
    stationId: string;
    stationName: string;
    appointment: any;
  } | null>(null);

  // Per-service stylist overrides
  const [stylistOverrides, setStylistOverrides] = useState<ServiceStylistOverride[]>(() =>
    servicesToStart.map((s) => ({
      serviceId: s.id,
      override: false,
      selectedStylistId: s.assignedStylistId,
    }))
  );

  const { data: floorViewData, isLoading: stationsLoading } = useFloorView(branchId || '');
  const { data: staffData, isLoading: stylistsLoading } = useStaffList({
    branchId: branchId || undefined,
    role: 'stylist',
    isActive: true,
  });
  const startServiceMutation = useStartService();

  const isLoading = startServiceMutation.isPending;

  // Handle station selection with pending appointment check
  const handleStationSelect = useCallback(
    (stationId: string) => {
      const station = floorViewData?.stations.find((s) => s.id === stationId);
      if (!station) return;

      if (station.appointment && isPendingAppointment(station.appointment)) {
        setPendingStationData({
          stationId,
          stationName: station.name,
          appointment: station.appointment,
        });
        setShowPendingWarning(true);
        return;
      }

      setSelectedStationId(stationId);
    },
    [floorViewData?.stations]
  );

  // Update stylist override for a specific service
  const handleOverrideChange = useCallback((serviceId: string, override: boolean) => {
    setStylistOverrides((prev) =>
      prev.map((s) => (s.serviceId === serviceId ? { ...s, override } : s))
    );
  }, []);

  const handleStylistChange = useCallback((serviceId: string, stylistId: string) => {
    setStylistOverrides((prev) =>
      prev.map((s) => (s.serviceId === serviceId ? { ...s, selectedStylistId: stylistId } : s))
    );
  }, []);

  // Start all services sequentially
  const handleStart = useCallback(async () => {
    if (!selectedStationId) {
      toast.error('Please select a station');
      return;
    }

    try {
      // Start each service sequentially
      for (const svc of servicesToStart) {
        const overrideData = stylistOverrides.find((o) => o.serviceId === svc.id);
        const actualStylistId =
          overrideData?.override && overrideData.selectedStylistId
            ? overrideData.selectedStylistId
            : undefined;

        await startServiceMutation.mutateAsync({
          appointmentId,
          serviceId: svc.id,
          stationId: selectedStationId,
          actualStylistId,
        });
      }

      const message =
        servicesToStart.length > 1
          ? `Started ${servicesToStart.length} parallel services`
          : `Started ${servicesToStart[0].serviceName}`;
      toast.success(message);
      onOpenChange(false);
      setSelectedStationId(null);
      setStylistOverrides(
        servicesToStart.map((s) => ({
          serviceId: s.id,
          override: false,
          selectedStylistId: s.assignedStylistId,
        }))
      );
      onSuccess?.();
    } catch (error: any) {
      const message =
        error?.response?.data?.error?.message || error?.message || 'Failed to start service';
      toast.error(message);
    }
  }, [
    appointmentId,
    servicesToStart,
    selectedStationId,
    stylistOverrides,
    startServiceMutation,
    onOpenChange,
    onSuccess,
  ]);

  const handleClose = useCallback(() => {
    if (isLoading) return;
    setSelectedStationId(currentStationId || null);
    setStylistOverrides(
      servicesToStart.map((s) => ({
        serviceId: s.id,
        override: false,
        selectedStylistId: s.assignedStylistId,
      }))
    );
    setShowPendingWarning(false);
    setPendingStationData(null);
    onOpenChange(false);
  }, [onOpenChange, currentStationId, servicesToStart, isLoading]);

  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (!newOpen && isLoading) return;
      if (newOpen) {
        setSelectedStationId(currentStationId || null);
        setStylistOverrides(
          servicesToStart.map((s) => ({
            serviceId: s.id,
            override: false,
            selectedStylistId: s.assignedStylistId,
          }))
        );
        setShowPendingWarning(false);
        setPendingStationData(null);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, currentStationId, servicesToStart, isLoading]
  );

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"
          onPointerDownOutside={(e) => {
            if (isLoading) e.preventDefault();
          }}
          onEscapeKeyDown={(e) => {
            if (isLoading) e.preventDefault();
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-primary" />
              {isParallel
                ? `Start ${servicesToStart.length} Parallel Services`
                : 'Start Next Service'}
            </DialogTitle>
            <DialogDescription>
              {isParallel
                ? 'Start multiple services simultaneously on the same station'
                : 'Start the next service in this multi-service appointment'}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-6">
            {/* Station Selection */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Armchair className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Select Station</span>
                <span className="text-xs text-red-500">*</span>
              </div>

              {stationsLoading ? (
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-20 rounded-lg" />
                  ))}
                </div>
              ) : !floorViewData?.stations || floorViewData.stations.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground border rounded-lg">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No stations available</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3 px-2 py-1">
                  {floorViewData.stations.map((station) => {
                    const config = statusConfig[station.status];
                    const isCurrent = station.id === currentStationId;

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
                        <p className="font-medium text-sm truncate">{station.name}</p>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-muted-foreground truncate">
                            {station.stationType?.name}
                          </p>
                          <div className="flex items-center gap-1">
                            {isCurrent && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                                Current
                              </Badge>
                            )}
                            <Badge
                              className={cn('text-[10px] px-2 py-0.5', config.bg, config.text)}
                              variant="outline"
                            >
                              {config.label}
                            </Badge>
                          </div>
                        </div>
                        {selectedStationId === station.id && (
                          <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Per-Service Stylist Override */}
            <div className="border-t pt-4 space-y-4">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium text-sm">Stylist Override</span>
                <span className="text-xs text-muted-foreground">(optional)</span>
              </div>

              {servicesToStart.map((svc) => {
                const overrideData = stylistOverrides.find((o) => o.serviceId === svc.id);
                if (!overrideData) return null;

                return (
                  <div
                    key={svc.id}
                    className={cn(
                      'rounded-lg p-3 space-y-2',
                      overrideData.override
                        ? 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800'
                        : 'bg-muted/30'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={`override-${svc.id}`}
                          checked={overrideData.override}
                          onCheckedChange={(checked) =>
                            handleOverrideChange(svc.id, checked === true)
                          }
                          disabled={isLoading}
                        />
                        <Label
                          htmlFor={`override-${svc.id}`}
                          className="text-sm leading-none cursor-pointer"
                        >
                          {svc.serviceName}
                          <span className="text-xs text-muted-foreground ml-1.5">
                            ({svc.durationMinutes} min)
                          </span>
                        </Label>
                      </div>
                      {svc.assignedStylistName && !overrideData.override && (
                        <span className="text-xs text-muted-foreground">
                          {svc.assignedStylistName}
                        </span>
                      )}
                    </div>

                    {overrideData.override && (
                      <div className="ml-6">
                        <Select
                          value={overrideData.selectedStylistId || ''}
                          onValueChange={(value) => handleStylistChange(svc.id, value)}
                          disabled={isLoading || stylistsLoading}
                        >
                          <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="Select stylist" />
                          </SelectTrigger>
                          <SelectContent>
                            {staffData?.data?.map((stylist) => (
                              <SelectItem key={stylist.id} value={stylist.userId}>
                                {stylist.user?.name || 'Unknown'}
                                {stylist.userId === svc.assignedStylistId &&
                                  ' (Originally Assigned)'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}

                    {/* Availability check for overridden stylist */}
                    {overrideData.override && overrideData.selectedStylistId && (
                      <StylistAvailabilityIndicator
                        stylistId={overrideData.selectedStylistId}
                        duration={svc.durationMinutes}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="button" onClick={handleStart} disabled={isLoading || !selectedStationId}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  {isParallel
                    ? `Start ${servicesToStart.length} Services`
                    : 'Start Service'}
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
                  Station &ldquo;{pendingStationData.stationName}&rdquo; has an incomplete
                  appointment
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
