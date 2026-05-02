'use client';

/**
 * Walk-In Queue Section
 *
 * Displays the walk-in queue on the Today dashboard using compact vertical cards.
 * Cards are narrow but tall enough to show full information without truncation.
 */

import { useState, useCallback, useRef } from 'react';
import { Users, Clock, Play, X, Plus, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useWalkInQueue, useMarkLeft } from '@/hooks/queries/use-appointments';
import { useServices } from '@/hooks/queries/use-services';
import { useStaffList } from '@/hooks/queries/use-staff';
import { useBranchContext } from '@/hooks/use-branch-context';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { AddWalkInDialog } from '@/components/ux/dialogs/add-walk-in-dialog';
import type { WalkInQueueEntry } from '@/types/appointments';

interface WalkInQueueSectionProps {
  onServe?: (entry: WalkInQueueEntry) => void;
  className?: string;
}

// Compact vertical card
function QueueCard({
  entry,
  serviceNames,
  stylistName,
  onServe,
  onMarkLeft,
  isMarkLeftLoading,
}: {
  entry: WalkInQueueEntry;
  serviceNames: string[];
  stylistName?: string;
  onServe: () => void;
  onMarkLeft: () => void;
  isMarkLeftLoading: boolean;
}) {
  const waitingMinutes = Math.floor((Date.now() - new Date(entry.createdAt).getTime()) / 60000);
  const isLongWait = waitingMinutes >= 15;
  const hasMultipleServices = serviceNames.length > 1;

  // Format gender preference for display
  const genderPrefLabel =
    entry.genderPreference === 'male'
      ? 'Male'
      : entry.genderPreference === 'female'
        ? 'Female'
        : null;

  return (
    <div
      className={cn(
        'flex-shrink-0 w-[150px] rounded-xl border bg-card p-3 transition-all hover:shadow-md',
        isLongWait && 'border-orange-300 dark:border-orange-600'
      )}
    >
      {/* Token Badge - Centered at top */}
      <div className="flex justify-center mb-3">
        <div
          className={cn(
            'h-12 w-12 rounded-full flex items-center justify-center font-bold text-lg',
            isLongWait
              ? 'bg-orange-500 text-white'
              : 'bg-primary/10 text-primary border-2 border-primary/20'
          )}
        >
          {entry.tokenNumber}
        </div>
      </div>

      {/* Customer Name */}
      <p className="font-medium text-sm text-center leading-tight mb-1">{entry.customerName}</p>

      {/* Service Name(s) - with tooltip for multiple services */}
      {hasMultipleServices ? (
        <TooltipProvider delayDuration={200}>
          <Tooltip>
            <TooltipTrigger asChild>
              <p className="text-xs text-muted-foreground text-center leading-tight mb-1 cursor-help hover:text-foreground transition-colors">
                {serviceNames[0]}{' '}
                <span className="text-primary font-medium">+{serviceNames.length - 1}</span>
              </p>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[200px]">
              <p className="font-medium text-xs mb-1.5">Services ({serviceNames.length}):</p>
              <ul className="text-xs space-y-1">
                {serviceNames.map((name, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-primary mt-0.5">•</span>
                    <span>{name}</span>
                  </li>
                ))}
              </ul>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <p className="text-xs text-muted-foreground text-center leading-tight mb-1">
          {serviceNames[0] || 'No service'}
        </p>
      )}

      {/* Stylist Preference - show if specified */}
      {(stylistName || genderPrefLabel) && (
        <p className="text-xs text-center leading-tight mb-2 text-blue-600 dark:text-blue-400">
          {stylistName ? (
            <span className="font-medium">{stylistName}</span>
          ) : (
            <span>Prefers {genderPrefLabel}</span>
          )}
        </p>
      )}

      {/* Wait Time */}
      <div
        className={cn(
          'flex items-center justify-center gap-1 text-xs mb-3',
          isLongWait ? 'text-orange-600 font-medium' : 'text-muted-foreground'
        )}
      >
        <Clock className="h-3 w-3" />
        <span>{waitingMinutes} min</span>
      </div>

      {/* Actions - Full width serve button with X on the side */}
      <div className="flex items-center gap-2">
        <Button variant="default" size="sm" onClick={onServe} className="flex-1 h-8">
          <Play className="h-3.5 w-3.5 mr-1.5" />
          Serve
        </Button>
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={onMarkLeft}
                disabled={isMarkLeftLoading}
                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              >
                {isMarkLeftLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <X className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Mark as left</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}

export function WalkInQueueSection({ onServe, className }: WalkInQueueSectionProps) {
  const { branchId } = useBranchContext();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [loadingEntryId, setLoadingEntryId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Fetch queue data
  const { data: queueData, isLoading } = useWalkInQueue({
    branchId: branchId || '',
  });

  // Fetch services for name lookup - fetch all
  const { data: servicesData } = useServices({ isActive: true, limit: -1 });

  // Fetch stylists for preference name lookup
  const { data: staffData } = useStaffList({
    branchId: branchId || '',
    role: 'stylist',
  });

  // Mutations
  const markLeftMutation = useMarkLeft();

  // Get all service names for an entry
  const getServiceNames = useCallback(
    (serviceIds: string[]): string[] => {
      if (!servicesData?.data || serviceIds.length === 0) return [];
      return serviceIds
        .map((id) => servicesData.data.find((s) => s.id === id)?.name)
        .filter((name): name is string => !!name);
    },
    [servicesData?.data]
  );

  // Get stylist name by ID
  const getStylistName = useCallback(
    (stylistId: string | null | undefined): string | undefined => {
      if (!stylistId || !staffData?.data) return undefined;
      const stylist = staffData.data.find((s) => s.userId === stylistId);
      return stylist?.user?.name;
    },
    [staffData?.data]
  );

  // Scroll handlers
  const scroll = useCallback((direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = 170;
      scrollContainerRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  }, []);

  // Handle serve - delegates to parent to open appointment panel
  const handleServe = useCallback(
    (entry: WalkInQueueEntry) => {
      if (onServe) {
        onServe(entry);
      }
    },
    [onServe]
  );

  // Handle mark as left
  const handleMarkLeft = useCallback(
    async (entry: WalkInQueueEntry) => {
      setLoadingEntryId(entry.id);
      try {
        await markLeftMutation.mutateAsync(entry.id);
        toast.success(`${entry.customerName} marked as left`);
      } catch {
        toast.error('Failed to update status');
      } finally {
        setLoadingEntryId(null);
      }
    },
    [markLeftMutation]
  );

  // Handle successful add to queue
  const handleAddSuccess = useCallback((_tokenNumber: number, _estimatedWait: number) => {
    // Toast is already shown in the dialog
  }, []);

  const queue = queueData?.queue || [];
  const stats = queueData?.stats;
  // Filter to only waiting entries and sort by token number
  const activeEntries = queue
    .filter((e) => e.status === 'waiting')
    .sort((a, b) => a.tokenNumber - b.tokenNumber);

  const showScrollButtons = activeEntries.length > 5;

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-8 w-24" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Skeleton className="h-[200px] w-[150px] rounded-xl" />
            <Skeleton className="h-[200px] w-[150px] rounded-xl" />
            <Skeleton className="h-[200px] w-[150px] rounded-xl" />
            <Skeleton className="h-[200px] w-[150px] rounded-xl" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className={className}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Walk-In Queue
              </CardTitle>
              {stats && stats.waiting > 0 && (
                <span className="text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                  {stats.waiting} waiting
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAddDialogOpen(true)}
              className="gap-1.5 h-8"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Walk-In
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 opacity-30 mb-2" />
              <p className="text-sm font-medium">No walk-ins waiting</p>
              <p className="text-xs mt-1">Click &quot;Add Walk-In&quot; to add a customer</p>
            </div>
          ) : (
            <div className="relative">
              {/* Scroll Left Button */}
              {showScrollButtons && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full shadow-md bg-background"
                  onClick={() => scroll('left')}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              )}

              {/* Horizontal Scroll Container */}
              <div
                ref={scrollContainerRef}
                className="flex gap-3 overflow-x-auto scrollbar-hide py-1 -my-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              >
                {activeEntries.map((entry) => (
                  <QueueCard
                    key={entry.id}
                    entry={entry}
                    serviceNames={getServiceNames(entry.serviceIds)}
                    stylistName={getStylistName(entry.stylistPreferenceId)}
                    onServe={() => handleServe(entry)}
                    onMarkLeft={() => handleMarkLeft(entry)}
                    isMarkLeftLoading={loadingEntryId === entry.id && markLeftMutation.isPending}
                  />
                ))}
              </div>

              {/* Scroll Right Button */}
              {showScrollButtons && (
                <Button
                  variant="outline"
                  size="icon"
                  className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 h-8 w-8 rounded-full shadow-md bg-background"
                  onClick={() => scroll('right')}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Walk-In Dialog */}
      <AddWalkInDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={handleAddSuccess}
      />
    </>
  );
}
