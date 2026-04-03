'use client';

/**
 * Floor View Tab Component
 * Visual representation of workstations with status and appointments
 */

import { useCallback } from 'react';
import { RefreshCw, Armchair } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common';
import { useFloorView } from '@/hooks/queries/use-stations';
import { cn } from '@/lib/utils';
import { StationCard } from './station-card';
import { FloorViewSummary } from './floor-view-summary';
import type { StationCard as StationCardType } from '@/types/stations';

interface FloorViewTabProps {
  branchId: string;
  onAssign: (stationId: string) => void;
  onCheckout?: (
    appointmentId: string,
    isPending: boolean,
    scheduledDate?: string,
    scheduledTime?: string
  ) => void;
}

export function FloorViewTab({ branchId, onAssign, onCheckout }: FloorViewTabProps) {
  const { data, isLoading, refetch, isRefetching } = useFloorView(branchId, {
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  if (isLoading) {
    return <FloorViewSkeleton />;
  }

  if (!data || data.stations.length === 0) {
    return (
      <EmptyState
        icon={Armchair}
        title="No stations configured"
        description="Add workstations in Settings → Stations to use the floor view."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with summary and refresh */}
      <div className="flex items-center justify-between">
        <FloorViewSummary summary={data.summary} />
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefetching}>
          <RefreshCw className={cn('h-4 w-4 mr-2', isRefetching && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Station Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {data.stations.map((station: StationCardType) => (
          <StationCard
            key={station.id}
            station={station}
            onAssign={onAssign}
            onCheckout={onCheckout}
          />
        ))}
      </div>
    </div>
  );
}

function FloorViewSkeleton() {
  return (
    <div className="space-y-4">
      {/* Summary skeleton */}
      <div className="flex items-center gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-6 w-20 bg-muted animate-pulse rounded" />
        ))}
      </div>

      {/* Grid skeleton */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-48 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    </div>
  );
}
