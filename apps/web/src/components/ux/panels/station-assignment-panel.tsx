'use client';

/**
 * Station Assignment Panel
 * Panel for assigning an appointment to a station
 */

import { useState, useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { Armchair, User, Clock, Search, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusBadge } from '@/components/common';
import { useClosePanel } from '@/components/ux/slide-over';
import { useAppointments } from '@/hooks/queries/use-appointments';
import { useAssignStation, useStations } from '@/hooks/queries/use-stations';
import { useBranchContext } from '@/hooks/use-branch-context';
import { cn } from '@/lib/utils';

interface StationAssignmentPanelProps {
  stationId: string;
}

export function StationAssignmentPanel({ stationId }: StationAssignmentPanelProps) {
  const closePanel = useClosePanel();
  const { branchId } = useBranchContext();
  const [search, setSearch] = useState('');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string | null>(null);

  // Fetch station details
  const { data: stationsData } = useStations(branchId || '', { limit: 100 });
  const station = useMemo(
    () => stationsData?.data?.find((s) => s.id === stationId),
    [stationsData, stationId]
  );

  // Fetch appointments that can be assigned (checked_in status, no station assigned)
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data: appointmentsData, isLoading: appointmentsLoading } = useAppointments({
    branchId: branchId || '',
    dateFrom: today,
    dateTo: today,
    status: 'checked_in',
    limit: 50,
  });

  const assignMutation = useAssignStation(branchId ?? undefined);

  // Filter appointments without station assignment
  const availableAppointments = useMemo(() => {
    if (!appointmentsData?.data) return [];
    return appointmentsData.data.filter((apt) => {
      // Filter by search
      if (search) {
        const searchLower = search.toLowerCase();
        const matchesName = apt.customerName?.toLowerCase().includes(searchLower);
        const matchesPhone = apt.customerPhone?.includes(search);
        if (!matchesName && !matchesPhone) return false;
      }
      // Only show appointments without station or with this station
      return !apt.stationId || apt.stationId === stationId;
    });
  }, [appointmentsData, search, stationId]);

  const handleAssign = useCallback(async () => {
    if (!selectedAppointmentId) return;

    try {
      await assignMutation.mutateAsync({
        appointmentId: selectedAppointmentId,
        stationId,
      });
      toast.success('Appointment assigned to station');
      closePanel();
    } catch (error: any) {
      toast.error(error.message || 'Failed to assign appointment');
    }
  }, [selectedAppointmentId, stationId, assignMutation, closePanel]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b">
        <div className="flex items-center gap-3 mb-2">
          <div
            className="h-4 w-4 rounded"
            style={{ backgroundColor: station?.stationType?.color || '#6B7280' }}
          />
          <h3 className="text-lg font-semibold">{station?.name || 'Station'}</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Select a checked-in appointment to assign to this station
        </p>
      </div>

      {/* Search */}
      <div className="p-4 border-b">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by customer name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Appointments List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {appointmentsLoading ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : availableAppointments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Armchair className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No checked-in appointments available</p>
            <p className="text-sm">Check in an appointment first</p>
          </div>
        ) : (
          availableAppointments.map((apt) => (
            <Card
              key={apt.id}
              className={cn(
                'cursor-pointer transition-all',
                selectedAppointmentId === apt.id ? 'ring-2 ring-primary' : 'hover:bg-muted/50'
              )}
              onClick={() => setSelectedAppointmentId(apt.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{apt.customerName || 'Walk-in'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{apt.scheduledTime}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {apt.services?.map((s) => s.serviceName).join(', ') || 'No services'}
                    </div>
                  </div>
                  <StatusBadge status={apt.status} size="sm" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Actions */}
      <div className="border-t p-4 flex gap-2">
        <Button variant="outline" className="flex-1" onClick={() => closePanel()}>
          Cancel
        </Button>
        <Button
          className="flex-1"
          onClick={handleAssign}
          disabled={!selectedAppointmentId || assignMutation.isPending}
        >
          {assignMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Assign
        </Button>
      </div>
    </div>
  );
}
