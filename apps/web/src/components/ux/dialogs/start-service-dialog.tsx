'use client';

/**
 * Start Service Dialog
 *
 * Dialog for starting an appointment service with station assignment.
 * Shows available stations and allows selection before starting.
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useStations, useAssignStation } from '@/hooks/queries/use-stations';
import { useUpdateAppointmentStatus } from '@/hooks/queries/use-appointments';
import { useBranchContext } from '@/hooks/use-branch-context';
import { cn } from '@/lib/utils';

interface StartServiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  appointmentId: string;
  customerName?: string;
  serviceName?: string;
  onSuccess?: () => void;
}

export function StartServiceDialog({
  open,
  onOpenChange,
  appointmentId,
  customerName,
  serviceName,
  onSuccess,
}: StartServiceDialogProps) {
  const { branchId } = useBranchContext();
  const [selectedStationId, setSelectedStationId] = useState<string | null>(null);

  const { data: stationsData, isLoading: stationsLoading } = useStations(branchId || '', {
    status: 'active',
    limit: 50,
  });

  const assignStationMutation = useAssignStation(branchId || undefined);
  const updateStatusMutation = useUpdateAppointmentStatus();

  const isLoading = assignStationMutation.isPending || updateStatusMutation.isPending;

  // Group stations by type
  const stationsByType = useMemo(() => {
    if (!stationsData?.data) return {};

    const grouped: Record<string, typeof stationsData.data> = {};
    stationsData.data.forEach((station) => {
      const typeName = station.stationType?.name || 'Other';
      if (!grouped[typeName]) {
        grouped[typeName] = [];
      }
      grouped[typeName].push(station);
    });
    return grouped;
  }, [stationsData?.data]);

  const handleStart = useCallback(async () => {
    try {
      // First assign station if selected
      if (selectedStationId) {
        await assignStationMutation.mutateAsync({
          appointmentId,
          stationId: selectedStationId,
        });
      }

      // Then update status to in_progress
      await updateStatusMutation.mutateAsync({
        id: appointmentId,
        status: 'in_progress',
      });

      onOpenChange(false);
      setSelectedStationId(null);
      onSuccess?.();
    } catch (error) {
      console.error('Failed to start service:', error);
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
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
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

          {stationsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : Object.keys(stationsByType).length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No stations available</p>
              <p className="text-xs mt-1">You can still start the service without a station</p>
            </div>
          ) : (
            <RadioGroup
              value={selectedStationId || ''}
              onValueChange={setSelectedStationId}
              className="space-y-4"
            >
              {Object.entries(stationsByType).map(([typeName, stations]) => (
                <div key={typeName}>
                  <p className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                    {typeName}
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {stations.map((station) => (
                      <Label
                        key={station.id}
                        htmlFor={station.id}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                          'hover:border-primary/50 hover:bg-accent/50',
                          selectedStationId === station.id &&
                            'border-primary bg-primary/5 ring-1 ring-primary'
                        )}
                      >
                        <RadioGroupItem value={station.id} id={station.id} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{station.name}</p>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0 mt-1"
                            style={{
                              borderColor: station.stationType?.color,
                              color: station.stationType?.color,
                            }}
                          >
                            Active
                          </Badge>
                        </div>
                      </Label>
                    ))}
                  </div>
                </div>
              ))}
            </RadioGroup>
          )}

          {/* Skip station option */}
          {Object.keys(stationsByType).length > 0 && (
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
  );
}
