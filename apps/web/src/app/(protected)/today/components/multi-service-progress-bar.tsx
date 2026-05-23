'use client';

/**
 * Multi-Service Progress Bar Component
 * Shows a segmented progress bar for multi-service appointments
 * Each segment represents a service with its own progress
 */

import { Clock, Pause, AlertTriangle, CheckCircle, Scissors } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ServiceProgressInfo } from '@/types/stations';

interface MultiServiceProgressBarProps {
  services: ServiceProgressInfo[];
  isPaused: boolean;
  totalElapsedMinutes: number | null;
  totalRemainingMinutes: number | null;
  isOvertime: boolean;
}

// Status colors for segments - improved for better visibility
const STATUS_COLORS = {
  completed: {
    bg: 'bg-emerald-500',
    border: 'border-emerald-600',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
  in_progress: {
    bg: 'bg-blue-500',
    border: 'border-blue-600',
    text: 'text-blue-700 dark:text-blue-400',
  },
  waiting: {
    bg: 'bg-slate-300 dark:bg-slate-600',
    border: 'border-slate-400 dark:border-slate-500',
    text: 'text-slate-600 dark:text-slate-400',
  },
  skipped: {
    bg: 'bg-slate-400',
    border: 'border-slate-500',
    text: 'text-slate-500 dark:text-slate-400',
  },
};

// Format time string for display
function formatTime(isoString: string | null): string {
  if (!isoString) return '--:--';
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export function MultiServiceProgressBar({
  services,
  isPaused,
  totalElapsedMinutes,
  totalRemainingMinutes,
  isOvertime,
}: MultiServiceProgressBarProps) {
  // Calculate total duration for proportional widths
  const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);

  return (
    <div className="space-y-2">
      {/* Timer Header */}
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-slate-700 dark:text-slate-300">
          {isPaused ? (
            <>
              <Pause className="h-3 w-3 text-amber-600" />
              <span className="text-amber-600 font-medium">Paused</span>
            </>
          ) : (
            <>
              <Clock className="h-3 w-3" />
              <span>{totalElapsedMinutes ?? 0}m elapsed</span>
            </>
          )}
        </span>
        {isOvertime ? (
          <span className="flex items-center gap-1 text-red-600 font-medium">
            <AlertTriangle className="h-3 w-3" />
            Overtime
          </span>
        ) : isPaused ? (
          <span className="text-amber-600">Waiting for next service</span>
        ) : (
          <span className="text-slate-700 dark:text-slate-300">
            {totalRemainingMinutes ?? 0}m left
          </span>
        )}
      </div>

      {/* Segmented Progress Bar */}
      <TooltipProvider>
        <div className="relative h-4 w-full flex rounded-md overflow-hidden border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800">
          {services.map((service, index) => {
            const widthPercent = (service.durationMinutes / totalDuration) * 100;
            const colors = STATUS_COLORS[service.status] || STATUS_COLORS.waiting;
            const stylistName = service.actualStylistName || service.assignedStylistName;

            return (
              <Tooltip key={service.id}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      'relative h-full transition-all overflow-hidden cursor-help',
                      // Add right border for all segments except the last one
                      index < services.length - 1 && 'border-r-2 border-white dark:border-slate-800'
                    )}
                    style={{ width: `${widthPercent}%` }}
                  >
                    {/* Background (empty part) */}
                    <div
                      className={cn(
                        'absolute inset-0',
                        service.status === 'waiting'
                          ? 'bg-slate-200 dark:bg-slate-700'
                          : service.status === 'skipped'
                            ? 'bg-slate-300 dark:bg-slate-600'
                            : 'bg-slate-200 dark:bg-slate-700'
                      )}
                    />

                    {/* Filled part (progress) */}
                    {service.status !== 'waiting' && (
                      <div
                        className={cn(
                          'absolute inset-y-0 left-0 transition-all',
                          colors.bg,
                          service.isOvertime && service.status === 'in_progress' && 'bg-red-500',
                          // Pulse animation for in-progress
                          service.status === 'in_progress' && !isPaused && 'animate-pulse'
                        )}
                        style={{
                          width: `${service.progressPercent}%`,
                        }}
                      />
                    )}

                    {/* Skipped pattern overlay */}
                    {service.status === 'skipped' && (
                      <div
                        className="absolute inset-0 opacity-50"
                        style={{
                          backgroundImage:
                            'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.1) 2px, rgba(0,0,0,0.1) 4px)',
                        }}
                      />
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <div className="space-y-1.5 text-xs">
                    {/* Service Name with Status Icon */}
                    <div className="font-semibold flex items-center gap-1.5 text-sm">
                      {service.status === 'completed' && (
                        <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      )}
                      {service.status === 'in_progress' && (
                        <Clock className="h-3.5 w-3.5 text-blue-500" />
                      )}
                      {service.serviceName}
                    </div>

                    {/* Stylist */}
                    {stylistName && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Scissors className="h-3 w-3" />
                        <span>{stylistName}</span>
                      </div>
                    )}

                    {/* Time Details */}
                    <div className="border-t border-slate-200 dark:border-slate-700 pt-1.5 space-y-0.5">
                      {service.status === 'completed' && (
                        <>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Started:</span>
                            <span className="font-medium">
                              {formatTime(service.actualStartTime)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Ended:</span>
                            <span className="font-medium">{formatTime(service.actualEndTime)}</span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Duration:</span>
                            <span
                              className={cn('font-medium', service.isOvertime && 'text-amber-600')}
                            >
                              {service.elapsedMinutes}m / {service.durationMinutes}m
                              {service.isOvertime && ' (overtime)'}
                            </span>
                          </div>
                        </>
                      )}
                      {service.status === 'in_progress' && (
                        <>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Started:</span>
                            <span className="font-medium">
                              {formatTime(service.actualStartTime)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-4">
                            <span className="text-muted-foreground">Progress:</span>
                            <span
                              className={cn('font-medium', service.isOvertime && 'text-red-600')}
                            >
                              {service.elapsedMinutes}m / {service.durationMinutes}m
                              {service.isOvertime && ' (overtime!)'}
                            </span>
                          </div>
                        </>
                      )}
                      {service.status === 'waiting' && (
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">Expected:</span>
                          <span className="font-medium">{service.durationMinutes}m</span>
                        </div>
                      )}
                      {service.status === 'skipped' && (
                        <div className="text-slate-500 italic">Service was skipped</div>
                      )}
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </TooltipProvider>

      {/* Service Legend (compact) - improved colors */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px]">
        {services.map((service, index) => {
          const colors = STATUS_COLORS[service.status] || STATUS_COLORS.waiting;
          return (
            <span
              key={service.id}
              className={cn(
                'flex items-center gap-1',
                colors.text,
                service.status === 'in_progress' && 'font-semibold',
                service.status === 'skipped' && 'line-through opacity-60'
              )}
            >
              <span
                className={cn(
                  'w-2 h-2 rounded-full',
                  service.status === 'completed' && 'bg-emerald-500',
                  service.status === 'in_progress' && 'bg-blue-500',
                  service.status === 'waiting' && 'bg-slate-400 dark:bg-slate-500',
                  service.status === 'skipped' && 'bg-slate-400'
                )}
              />
              {index + 1}. {service.serviceName}
            </span>
          );
        })}
      </div>
    </div>
  );
}
