'use client';

/**
 * Service Progress Timeline Component
 *
 * Displays all services in a multi-service appointment with their status,
 * assigned vs actual stylist, station assignment, and scheduled vs actual times.
 */

import { useMemo } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  SkipForward,
  Scissors,
  Armchair,
  AlertCircle,
  Play,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

// ============================================
// Types
// ============================================

export interface ServiceTimelineItem {
  id: string;
  serviceName: string;
  sequence: number;
  status: 'waiting' | 'in_progress' | 'completed' | 'skipped';
  durationMinutes: number;
  scheduledStartTime?: string | null;
  scheduledEndTime?: string | null;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  assignedStylist?: { id: string; name: string } | null;
  actualStylist?: { id: string; name: string } | null;
  station?: { id: string; name: string } | null;
  runParallel?: boolean;
}

interface ServiceProgressTimelineProps {
  services: ServiceTimelineItem[];
  /** Whether to show action buttons */
  showActions?: boolean;
  /** Callback when start service is clicked */
  onStartService?: (serviceId: string) => void;
  /** Callback when complete service is clicked */
  onCompleteService?: (serviceId: string) => void;
  /** Callback when skip service is clicked */
  onSkipService?: (serviceId: string) => void;
  /** Whether actions are loading */
  isLoading?: boolean;
  /** Currently loading service ID */
  loadingServiceId?: string | null;
}

// ============================================
// Status Configuration
// ============================================

const statusConfig = {
  waiting: {
    icon: Circle,
    color: 'text-gray-400',
    bgColor: 'bg-gray-100 dark:bg-gray-800',
    borderColor: 'border-gray-300 dark:border-gray-600',
    label: 'Waiting',
    badgeVariant: 'secondary' as const,
  },
  in_progress: {
    icon: Loader2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    borderColor: 'border-blue-400 dark:border-blue-600',
    label: 'In Progress',
    badgeVariant: 'default' as const,
  },
  completed: {
    icon: CheckCircle2,
    color: 'text-green-500',
    bgColor: 'bg-green-50 dark:bg-green-950/30',
    borderColor: 'border-green-400 dark:border-green-600',
    label: 'Completed',
    badgeVariant: 'outline' as const,
  },
  skipped: {
    icon: SkipForward,
    color: 'text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-900/30',
    borderColor: 'border-gray-300 dark:border-gray-700',
    label: 'Skipped',
    badgeVariant: 'secondary' as const,
  },
};

// ============================================
// Helper Functions
// ============================================

function formatTime(dateString: string | null | undefined): string {
  if (!dateString) return '--:--';
  try {
    return format(new Date(dateString), 'HH:mm');
  } catch {
    return '--:--';
  }
}

function canStartService(service: ServiceTimelineItem, services: ServiceTimelineItem[]): boolean {
  if (service.status !== 'waiting') return false;

  // Check if previous sequential services are completed
  const previousServices = services.filter((s) => s.sequence < service.sequence && !s.runParallel);

  return previousServices.every((s) => s.status === 'completed' || s.status === 'skipped');
}

// ============================================
// Component
// ============================================

export function ServiceProgressTimeline({
  services,
  showActions = false,
  onStartService,
  onCompleteService,
  onSkipService,
  isLoading = false,
  loadingServiceId = null,
}: ServiceProgressTimelineProps) {
  // Sort services by sequence
  const sortedServices = useMemo(
    () => [...services].sort((a, b) => a.sequence - b.sequence),
    [services]
  );

  // Find current service (first in_progress or first waiting)
  const currentServiceIndex = useMemo(() => {
    const inProgressIndex = sortedServices.findIndex((s) => s.status === 'in_progress');
    if (inProgressIndex >= 0) return inProgressIndex;
    return sortedServices.findIndex((s) => s.status === 'waiting');
  }, [sortedServices]);

  if (services.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No services in this appointment</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {sortedServices.map((service, index) => {
        const config = statusConfig[service.status];
        const StatusIcon = config.icon;
        const isCurrentService = index === currentServiceIndex;
        const hasStylistOverride =
          service.actualStylist &&
          service.assignedStylist &&
          service.actualStylist.id !== service.assignedStylist.id;
        const canStart = canStartService(service, sortedServices);
        const isServiceLoading = isLoading && loadingServiceId === service.id;

        return (
          <div key={service.id} className="relative">
            {/* Connector line */}
            {index < sortedServices.length - 1 && (
              <div
                className={cn(
                  'absolute left-4 top-10 w-0.5 h-[calc(100%-2rem)]',
                  service.status === 'completed' || service.status === 'skipped'
                    ? 'bg-gray-300 dark:bg-gray-600'
                    : 'bg-gray-200 dark:bg-gray-700'
                )}
              />
            )}

            <div
              className={cn(
                'relative flex gap-4 p-3 rounded-lg border transition-all',
                config.bgColor,
                config.borderColor,
                isCurrentService && 'ring-2 ring-primary/50'
              )}
            >
              {/* Status Icon */}
              <div
                className={cn(
                  'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center',
                  service.status === 'in_progress'
                    ? 'bg-blue-100 dark:bg-blue-900'
                    : 'bg-white dark:bg-gray-800',
                  'border-2',
                  config.borderColor
                )}
              >
                <StatusIcon
                  className={cn(
                    'h-4 w-4',
                    config.color,
                    service.status === 'in_progress' && 'animate-spin'
                  )}
                />
              </div>

              {/* Service Details */}
              <div className="flex-1 min-w-0 space-y-2">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{service.serviceName}</span>
                      {service.runParallel && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                          Parallel
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                      <Clock className="h-3 w-3" />
                      <span>{service.durationMinutes} min</span>
                    </div>
                  </div>
                  <Badge variant={config.badgeVariant} className="text-xs">
                    {config.label}
                  </Badge>
                </div>

                {/* Stylist Info */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {service.assignedStylist && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Scissors className="h-3.5 w-3.5" />
                      <span>
                        {hasStylistOverride ? (
                          <>
                            <span className="line-through opacity-60">
                              {service.assignedStylist.name}
                            </span>
                            <span className="text-amber-600 ml-1">
                              → {service.actualStylist?.name}
                            </span>
                          </>
                        ) : (
                          service.actualStylist?.name || service.assignedStylist.name
                        )}
                      </span>
                    </div>
                  )}
                  {service.station && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Armchair className="h-3.5 w-3.5" />
                      <span>{service.station.name}</span>
                    </div>
                  )}
                </div>

                {/* Time Info */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <span>Scheduled:</span>
                    <span className="font-medium">
                      {formatTime(service.scheduledStartTime)} -{' '}
                      {formatTime(service.scheduledEndTime)}
                    </span>
                  </div>
                  {(service.actualStartTime || service.actualEndTime) && (
                    <div className="flex items-center gap-1">
                      <span>Actual:</span>
                      <span className="font-medium">
                        {formatTime(service.actualStartTime)}
                        {service.actualEndTime && ` - ${formatTime(service.actualEndTime)}`}
                      </span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {showActions && (
                  <div className="flex items-center gap-2 pt-1">
                    {service.status === 'waiting' && canStart && onStartService && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onStartService(service.id)}
                        disabled={isServiceLoading}
                      >
                        {isServiceLoading ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <Play className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Start
                      </Button>
                    )}
                    {service.status === 'in_progress' && onCompleteService && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => onCompleteService(service.id)}
                        disabled={isServiceLoading}
                      >
                        {isServiceLoading ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                        )}
                        Complete
                      </Button>
                    )}
                    {(service.status === 'waiting' || service.status === 'in_progress') &&
                      onSkipService && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onSkipService(service.id)}
                          disabled={isServiceLoading}
                        >
                          {isServiceLoading ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <SkipForward className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          Skip
                        </Button>
                      )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
