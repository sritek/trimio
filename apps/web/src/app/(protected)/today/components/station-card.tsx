'use client';

/**
 * Station Card Component
 * Displays a single station with status, appointment info, and actions
 * Enhanced for multi-service appointments with "Up Next" section
 */

import {
  Plus,
  Clock,
  User,
  Scissors,
  AlertTriangle,
  Wrench,
  AlertCircle,
  Link2,
  ChevronRight,
  Play,
  CheckCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isPendingAppointment } from '@/lib/appointment-helpers';
import { MultiServiceProgressBar } from './multi-service-progress-bar';
import type { StationCard as StationCardType, FloorViewStatus } from '@/types/stations';

interface StationCardProps {
  station: StationCardType;
  onAssign: (stationId: string) => void;
  onCheckout?: (
    appointmentId: string,
    isPending: boolean,
    scheduledDate?: string,
    scheduledTime?: string,
    hasIncompleteServices?: boolean
  ) => void;
  onStartNextService?: (
    appointmentId: string,
    currentStationId: string,
    currentStationName: string,
    nextService: StationCardType['upNext'],
    allNextServices?: StationCardType['upNextServices']
  ) => void;
  onCompleteService?: (
    appointmentId: string,
    serviceId: string,
    serviceName: string,
    appointmentDate?: string,
    appointmentTime?: string
  ) => void;
  onCompleteAndCheckout?: (
    appointmentId: string,
    serviceIds: string[],
    serviceName: string,
    appointmentDate?: string,
    appointmentTime?: string
  ) => void;
}

const statusConfig: Record<
  FloorViewStatus,
  { bg: string; border: string; text: string; label: string }
> = {
  available: {
    bg: 'bg-green-50 dark:bg-green-950/20',
    border: 'border-green-200 dark:border-green-800',
    text: 'text-green-700 dark:text-green-400',
    label: 'Available',
  },
  occupied: {
    bg: 'bg-blue-50 dark:bg-blue-950/20',
    border: 'border-blue-200 dark:border-blue-800',
    text: 'text-blue-700 dark:text-blue-400',
    label: 'Occupied',
  },
  reserved: {
    bg: 'bg-amber-50 dark:bg-amber-950/20',
    border: 'border-amber-200 dark:border-amber-800',
    text: 'text-amber-700 dark:text-amber-400',
    label: 'Reserved',
  },
  out_of_service: {
    bg: 'bg-gray-50 dark:bg-gray-950/20',
    border: 'border-gray-200 dark:border-gray-800',
    text: 'text-gray-500 dark:text-gray-400',
    label: 'Out of Service',
  },
};

export function StationCard({
  station,
  onAssign,
  onCheckout,
  onStartNextService,
  onCompleteService,
  onCompleteAndCheckout,
}: StationCardProps) {
  const config = statusConfig[station.status];
  const appointment = station.appointment;

  // Determine if this is the last/only service that needs completing before checkout
  // True when: single-service in progress, OR multi-service with last service in progress
  const isLastService = (() => {
    if (!appointment) return false;
    // Single-service appointment that is in progress
    if (!appointment.isMultiService) {
      return appointment.progressPercent !== null; // has started (in progress)
    }
    // Multi-service: check no upNext and no waiting services
    const hasUpNext = station.upNextServices && station.upNextServices.length > 0;
    if (hasUpNext) return false;
    const hasWaiting = appointment.currentServices?.some((s) => s.status === 'waiting');
    if (hasWaiting) return false;
    // Only in-progress or completed services remain
    const inProgressServices = appointment.currentServices?.filter(
      (s) => s.status === 'in_progress'
    );
    return (inProgressServices?.length ?? 0) >= 1;
  })();

  // Check if any service is currently in progress (used to disable "Start Next Service")
  const hasServiceInProgress = (() => {
    if (!appointment) return false;
    if (appointment.currentServices && appointment.currentServices.length > 0) {
      return appointment.currentServices.some((s) => s.status === 'in_progress');
    }
    return appointment.currentService?.status === 'in_progress';
  })();

  return (
    <Card className={cn('transition-all', config.bg, config.border)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full"
              style={{ backgroundColor: station.stationType.color }}
            />
            <span className="font-medium">{station.name}</span>
          </div>
          <span className={cn('text-xs font-medium', config.text)}>{config.label}</span>
        </div>
        <p className="text-xs text-muted-foreground">{station.stationType.name}</p>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Available Station */}
        {station.status === 'available' && (
          <div className="flex flex-col items-center justify-center py-4">
            <p className="text-sm text-muted-foreground mb-3">Ready for next customer</p>
            <Button size="sm" onClick={() => onAssign(station.id)}>
              <Plus className="h-4 w-4 mr-1" />
              Assign
            </Button>
          </div>
        )}

        {/* Occupied Station */}
        {station.status === 'occupied' && appointment && (
          <>
            {/* Pending Appointment Warning */}
            {isPendingAppointment(appointment) && (
              <div className="bg-red-50 border border-red-200 rounded px-2 py-2 flex gap-2">
                <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-red-900">Pending Appointment</p>
                  <p className="text-xs text-red-700">From {appointment.scheduledDate}</p>
                  <p className="text-xs text-red-600 mt-1">
                    Complete current service(s) and checkout
                  </p>
                </div>
              </div>
            )}

            {/* Multi-service indicator */}
            {appointment.isMultiService && (
              <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800 rounded px-2 py-1.5 flex items-center gap-2">
                <Link2 className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  Service {appointment.currentServiceIndex || 1} of {appointment.serviceCount}
                </span>
              </div>
            )}

            {/* Customer & Stylist Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-slate-500" />
                <span className="text-sm font-medium truncate">{appointment.customerName}</span>
              </div>
              {/* Show stylist only for single-service appointments - multi-service shows stylist per service */}
              {!appointment.isMultiService && appointment.stylistName && (
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-slate-500" />
                  <span className="text-xs text-slate-600 dark:text-slate-400 truncate">
                    {appointment.stylistName}
                    {appointment.assistantNames.length > 0 &&
                      ` +${appointment.assistantNames.length}`}
                  </span>
                </div>
              )}
            </div>

            {/* Current Services (for multi-service) - supports parallel services */}
            {appointment.isMultiService &&
            appointment.currentServices &&
            appointment.currentServices.length > 0 ? (
              <div className="space-y-2">
                {/* Show parallel services indicator if more than one in-progress */}
                {appointment.currentServices.filter((s) => s.status === 'in_progress').length >
                  1 && (
                  <div className="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 rounded px-2 py-1 flex items-center gap-2">
                    <span className="text-xs font-medium text-purple-700 dark:text-purple-300">
                      {appointment.currentServices.filter((s) => s.status === 'in_progress').length}{' '}
                      parallel services in progress
                    </span>
                  </div>
                )}
                {appointment.currentServices.map((service) =>
                  service.status === 'completed' ? (
                    /* Service completed - show completed state */
                    <div
                      key={service.id}
                      className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-2 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs">
                          <span className="font-medium text-green-900 dark:text-green-100">
                            {service.serviceName}
                          </span>
                          {service.actualStylistName &&
                            service.actualStylistName !== appointment.stylistName && (
                              <span className="text-green-600 ml-1">
                                (by {service.actualStylistName})
                              </span>
                            )}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 font-medium flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Completed
                        </span>
                      </div>
                    </div>
                  ) : service.status === 'in_progress' ? (
                    /* Service in progress - show with complete button */
                    <div
                      key={service.id}
                      className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-2 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs">
                          <span className="font-medium text-amber-900 dark:text-amber-100">
                            {service.serviceName}
                          </span>
                          {service.actualStylistName &&
                            service.actualStylistName !== appointment.stylistName && (
                              <span className="text-amber-600 ml-1">
                                (by {service.actualStylistName})
                              </span>
                            )}
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 font-medium">
                          In Progress
                        </span>
                      </div>
                      {!isLastService && onCompleteService && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-900"
                          onClick={() =>
                            onCompleteService(
                              appointment.id,
                              service.id,
                              service.serviceName,
                              appointment.scheduledDate,
                              appointment.scheduledTime
                            )
                          }
                        >
                          <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                          Complete Service
                        </Button>
                      )}
                    </div>
                  ) : (
                    /* Service waiting - show as pending */
                    <div
                      key={service.id}
                      className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-md p-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-xs">
                          <span className="font-medium text-slate-900 dark:text-slate-100">
                            {service.serviceName}
                          </span>
                        </div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                          Waiting
                        </span>
                      </div>
                    </div>
                  )
                )}
              </div>
            ) : appointment.isMultiService && appointment.currentService ? (
              /* Fallback to single currentService for backward compatibility */
              appointment.currentService.status === 'completed' ? (
                <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      <span className="font-medium text-green-900 dark:text-green-100">
                        {appointment.currentService.serviceName}
                      </span>
                      {appointment.currentService.actualStylistName &&
                        appointment.currentService.actualStylistName !==
                          appointment.stylistName && (
                          <span className="text-green-600 ml-1">
                            (by {appointment.currentService.actualStylistName})
                          </span>
                        )}
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-200 dark:bg-green-800 text-green-800 dark:text-green-200 font-medium flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      Completed
                    </span>
                  </div>
                </div>
              ) : appointment.currentService.status === 'in_progress' ? (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-md p-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      <span className="font-medium text-amber-900 dark:text-amber-100">
                        {appointment.currentService.serviceName}
                      </span>
                      {appointment.currentService.actualStylistName &&
                        appointment.currentService.actualStylistName !==
                          appointment.stylistName && (
                          <span className="text-amber-600 ml-1">
                            (by {appointment.currentService.actualStylistName})
                          </span>
                        )}
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-200 dark:bg-amber-800 text-amber-800 dark:text-amber-200 font-medium">
                      In Progress
                    </span>
                  </div>
                  {!isLastService && onCompleteService && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full bg-amber-100 hover:bg-amber-200 border-amber-300 text-amber-900"
                      onClick={() =>
                        onCompleteService(
                          appointment.id,
                          appointment.currentService!.id,
                          appointment.currentService!.serviceName,
                          appointment.scheduledDate,
                          appointment.scheduledTime
                        )
                      }
                    >
                      <CheckCircle className="h-3.5 w-3.5 mr-1.5" />
                      Complete Service
                    </Button>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-200 dark:border-slate-800 rounded-md p-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs">
                      <span className="font-medium text-slate-900 dark:text-slate-100">
                        {appointment.currentService.serviceName}
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-medium">
                      Waiting
                    </span>
                  </div>
                </div>
              )
            ) : (
              /* Services list for single-service appointments */
              <div className="text-xs text-muted-foreground">
                {appointment.services.slice(0, 2).join(', ')}
                {appointment.services.length > 2 && ` +${appointment.services.length - 2} more`}
              </div>
            )}

            {/* Delay Badge */}
            {appointment.delayMinutes > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded px-2 py-1">
                <p className="text-xs text-orange-700 font-medium">
                  Started {appointment.delayMinutes} min late
                </p>
              </div>
            )}

            {/* Progress */}
            {appointment.isMultiService &&
            appointment.serviceProgress &&
            appointment.serviceProgress.length > 0 ? (
              /* Multi-service progress bar */
              <MultiServiceProgressBar
                services={appointment.serviceProgress}
                isPaused={appointment.isPaused}
                totalElapsedMinutes={appointment.elapsedMinutes}
                totalRemainingMinutes={appointment.remainingMinutes}
                isOvertime={appointment.isOvertime}
              />
            ) : (
              /* Single-service progress bar (original) */
              appointment.progressPercent !== null && (
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {appointment.elapsedMinutes}m elapsed
                    </span>
                    {appointment.isOvertime ? (
                      <span className="flex items-center gap-1 text-red-600">
                        <AlertTriangle className="h-3 w-3" />
                        Overtime
                      </span>
                    ) : (
                      <span>{appointment.remainingMinutes}m left</span>
                    )}
                  </div>
                  <div className="relative h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        'h-full transition-all',
                        appointment.isOvertime
                          ? 'bg-red-500'
                          : appointment.progressPercent > 80
                            ? 'bg-yellow-500'
                            : 'bg-blue-500'
                      )}
                      style={{
                        width: `${Math.min(appointment.progressPercent, 100)}%`,
                      }}
                    />
                  </div>
                </div>
              )
            )}

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              {isLastService && onCompleteAndCheckout ? (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    // Collect all in-progress service IDs (for parallel services)
                    const inProgressServices = appointment.isMultiService
                      ? appointment.currentServices?.filter((s) => s.status === 'in_progress') || []
                      : [];

                    let serviceIds: string[];
                    let serviceName: string;

                    if (inProgressServices.length > 0) {
                      serviceIds = inProgressServices.map((s) => s.id);
                      serviceName =
                        inProgressServices.length > 1
                          ? `${inProgressServices.length} services`
                          : inProgressServices[0].serviceName;
                    } else {
                      // Single-service fallback
                      const id =
                        appointment.currentServices?.[0]?.id || appointment.currentService?.id;
                      serviceIds = id ? [id] : [];
                      serviceName = appointment.services[0] || 'Service';
                    }

                    if (serviceIds.length > 0) {
                      onCompleteAndCheckout(
                        appointment.id,
                        serviceIds,
                        serviceName,
                        appointment.scheduledDate,
                        appointment.scheduledTime
                      );
                    }
                  }}
                >
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Complete & Checkout
                </Button>
              ) : onCheckout ? (
                <>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1"
                    disabled={hasServiceInProgress}
                    onClick={() => {
                      // Check if there are incomplete services (upNextServices exists or services not completed)
                      const hasIncompleteServices =
                        appointment.isMultiService &&
                        ((station.upNextServices && station.upNextServices.length > 0) || // There are next services waiting
                          appointment.currentServices?.some(
                            (s) => s.status === 'waiting' || s.status === 'in_progress'
                          ) ||
                          appointment.currentService?.status === 'waiting' ||
                          appointment.currentService?.status === 'in_progress');
                      onCheckout(
                        appointment.id,
                        isPendingAppointment(appointment),
                        appointment.scheduledDate,
                        appointment.scheduledTime,
                        hasIncompleteServices
                      );
                    }}
                  >
                    Checkout
                  </Button>
                  {hasServiceInProgress && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
                      Complete the ongoing service first
                    </p>
                  )}
                </>
              ) : null}
            </div>
          </>
        )}

        {/* Up Next Section - for multi-service appointments (hidden for pending appointments) */}
        {station.status === 'occupied' &&
          appointment &&
          !isPendingAppointment(appointment) &&
          station.upNextServices &&
          station.upNextServices.length > 0 && (
            <div className="border-t border-dashed pt-3 mt-3">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
                <ChevronRight className="h-3.5 w-3.5" />
                Up Next
                {station.upNextServices.length > 1 && (
                  <span className="text-purple-600 dark:text-purple-400">
                    ({station.upNextServices.length} parallel)
                  </span>
                )}
              </div>
              <div
                className={cn(
                  'rounded-md p-2 space-y-2',
                  // Make it more prominent when current service is completed
                  appointment?.currentService?.status === 'completed'
                    ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                    : 'bg-slate-50 dark:bg-slate-900/50'
                )}
              >
                {/* Show all parallel services */}
                {station.upNextServices.map((service, index) => (
                  <div key={service.id} className={cn(index > 0 && 'pt-2 border-t border-dashed')}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate">{service.serviceName}</span>
                      <span className="text-xs text-muted-foreground">
                        {service.durationMinutes}m
                      </span>
                    </div>
                    {service.assignedStylistName && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Scissors className="h-3 w-3" />
                        <span>{service.assignedStylistName}</span>
                      </div>
                    )}
                  </div>
                ))}
                {/* Show estimated start time once (same for all parallel services) */}
                {station.upNextServices[0]?.estimatedStartTime && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      Est.{' '}
                      {new Date(station.upNextServices[0].estimatedStartTime).toLocaleTimeString(
                        [],
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )}
                    </span>
                  </div>
                )}
                {onStartNextService && appointment && (
                  <Button
                    variant={
                      appointment.currentService?.status === 'completed' ? 'default' : 'outline'
                    }
                    size="sm"
                    className="w-full mt-2"
                    disabled={hasServiceInProgress}
                    onClick={() =>
                      onStartNextService(
                        appointment.id,
                        station.id,
                        station.name,
                        station.upNextServices[0],
                        station.upNextServices
                      )
                    }
                  >
                    <Play className="h-3.5 w-3.5 mr-1.5" />
                    {hasServiceInProgress
                      ? 'Complete current service first'
                      : station.upNextServices.length > 1
                        ? `Start ${station.upNextServices.length} Parallel Services`
                        : 'Start Next Service'}
                  </Button>
                )}
              </div>
            </div>
          )}

        {/* Out of Service */}
        {station.status === 'out_of_service' && (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Wrench className="h-8 w-8 mb-2" />
            <p className="text-sm">Under maintenance</p>
          </div>
        )}

        {/* Reserved - upcoming appointment within threshold */}
        {station.status === 'reserved' && appointment && (
          <div className="space-y-3">
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded px-2 py-2 flex gap-2">
              <Clock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-medium text-amber-900 dark:text-amber-100">
                  Upcoming Appointment
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Scheduled at {appointment.scheduledTime}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate">{appointment.customerName}</span>
              </div>
              {appointment.stylistName && (
                <div className="flex items-center gap-2">
                  <Scissors className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground truncate">
                    {appointment.stylistName}
                  </span>
                </div>
              )}
            </div>

            {/* Services */}
            <div className="text-xs text-muted-foreground">
              {appointment.services.slice(0, 2).join(', ')}
              {appointment.services.length > 2 && ` +${appointment.services.length - 2} more`}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
