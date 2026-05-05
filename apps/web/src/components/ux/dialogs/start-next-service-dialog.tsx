'use client';

/**
 * Start Next Service Dialog
 *
 * Dialog for starting the next service in a multi-service appointment.
 * Allows station selection and optional stylist override.
 */

import { useState, useCallback, useMemo } from 'react';
import { PlayCircle, Armchair, AlertCircle, Loader2, Scissors, Clock, User } from 'lucide-react';

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
import { useStartService } from '@/hooks/queries/use-appointments';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useBranchContext } from '@/hooks/use-branch-context';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { UpNextService } from '@/types/stations';

interface StartNextServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  service: UpNextService;
  currentStationId?: string;
  onSuccess?: () => void;
}

export function StartNextServiceDialog({
  open,
  onOpenChange,
  appointmentId,
  service,
  currentStationId,
  onSuccess,
}: StartNextServiceDialogProps) {
  const { branchId } = useBranchContext();
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    currentStationId || null
  );
  const [overrideStylist, setOverrideStylist] = useState(false);
  const [selectedStylistId, setSelectedStylistId] = useState<string | null>(
    service.assignedStylistId
  );

  const { data: floorViewData, isLoading: stationsLoading } = useFloorView(branchId || '');
  const { data: staffData, isLoading: stylistsLoading } = useStaffList({
    branchId: branchId || undefined,
    role: 'stylist',
    isActive: true,
  });
  const startServiceMutation = useStartService();

  const isLoading = startServiceMutation.isPending;

  // Filter available stations
  const availableStations = useMemo(() => {
    if (!floorViewData?.stations) return [];
    return floorViewData.stations.filter(
      (s) => s.status === 'available' || s.id === currentStationId
    );
  }, [floorViewData?.stations, currentStationId]);

  const handleStart = useCallback(() => {
    if (!selectedStationId) {
      toast.error('Please select a station');
      return;
    }

    startServiceMutation.mutate(
      {
        appointmentId,
        serviceId: service.id,
        stationId: selectedStationId,
        actualStylistId: overrideStylist ? selectedStylistId || undefined : undefined,
      },
      {
        onSuccess: () => {
          toast.success(`Started ${service.serviceName}`);
          onOpenChange(false);
          setSelectedStationId(null);
          setOverrideStylist(false);
          onSuccess?.();
        },
        onError: (error: Error & { response?: { data?: { error?: { message?: string } } } }) => {
          const message = error?.response?.data?.error?.message || 'Failed to start service';
          toast.error(message);
        },
      }
    );
  }, [
    appointmentId,
    service.id,
    service.serviceName,
    selectedStationId,
    overrideStylist,
    selectedStylistId,
    startServiceMutation,
    onOpenChange,
    onSuccess,
  ]);

  const handleClose = useCallback(() => {
    setSelectedStationId(currentStationId || null);
    setOverrideStylist(false);
    setSelectedStylistId(service.assignedStylistId);
    onOpenChange(false);
  }, [onOpenChange, currentStationId, service.assignedStylistId]);

  // Reset state when dialog opens
  const handleOpenChange = useCallback(
    (newOpen: boolean) => {
      if (newOpen) {
        setSelectedStationId(currentStationId || null);
        setOverrideStylist(false);
        setSelectedStylistId(service.assignedStylistId);
      }
      onOpenChange(newOpen);
    },
    [onOpenChange, currentStationId, service.assignedStylistId]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" />
            Start Next Service
          </DialogTitle>
          <DialogDescription>
            Start the next service in this multi-service appointment
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* Service Info */}
          <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{service.serviceName}</span>
              </div>
              <Badge variant="outline">{service.durationMinutes} min</Badge>
            </div>

            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5" />
                <span>{service.customerName}</span>
              </div>
              {service.assignedStylistName && (
                <div className="flex items-center gap-1.5">
                  <Scissors className="h-3.5 w-3.5" />
                  <span>Assigned: {service.assignedStylistName}</span>
                </div>
              )}
              {service.estimatedStartTime && (
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>
                    Est.{' '}
                    {new Date(service.estimatedStartTime).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

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
                  <Skeleton key={i} className="h-16 rounded-lg" />
                ))}
              </div>
            ) : availableStations.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground border rounded-lg">
                <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No stations available</p>
                <p className="text-xs mt-1">All stations are currently occupied</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto px-1 py-1">
                {availableStations.map((station) => {
                  const isCurrent = station.id === currentStationId;

                  return (
                    <button
                      key={station.id}
                      onClick={() => setSelectedStationId(station.id)}
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
                        {isCurrent && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            Current
                          </Badge>
                        )}
                      </div>

                      {selectedStationId === station.id && (
                        <div className="absolute top-2 right-2 h-3 w-3 rounded-full bg-primary" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Stylist Override */}
          <div className="border-t pt-4">
            <div className="flex items-center space-x-2 mb-3">
              <Checkbox
                id="override-stylist"
                checked={overrideStylist}
                onCheckedChange={(checked) => setOverrideStylist(checked === true)}
                disabled={isLoading}
              />
              <Label
                htmlFor="override-stylist"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Override assigned stylist
              </Label>
            </div>

            {overrideStylist && (
              <div className="ml-6">
                <Label
                  htmlFor="stylist-select"
                  className="text-xs text-muted-foreground mb-1.5 block"
                >
                  Select different stylist
                </Label>
                <Select
                  value={selectedStylistId || ''}
                  onValueChange={setSelectedStylistId}
                  disabled={isLoading || stylistsLoading}
                >
                  <SelectTrigger id="stylist-select" className="w-full">
                    <SelectValue placeholder="Select stylist" />
                  </SelectTrigger>
                  <SelectContent>
                    {staffData?.data?.map((stylist) => (
                      <SelectItem key={stylist.id} value={stylist.userId}>
                        {stylist.user?.name || 'Unknown'}
                        {stylist.userId === service.assignedStylistId && ' (Originally Assigned)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
                Start Service
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
