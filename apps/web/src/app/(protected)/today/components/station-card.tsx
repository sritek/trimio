'use client';

/**
 * Station Card Component
 * Displays a single station with status, appointment info, and actions
 */

import { Plus, Clock, User, Scissors, AlertTriangle, Wrench, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { isPendingAppointment } from '@/lib/appointment-helpers';
import type { StationCard as StationCardType, FloorViewStatus } from '@/types/stations';

interface StationCardProps {
  station: StationCardType;
  onAssign: (stationId: string) => void;
  onCheckout?: (
    appointmentId: string,
    isPending: boolean,
    scheduledDate?: string,
    scheduledTime?: string
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
  out_of_service: {
    bg: 'bg-gray-50 dark:bg-gray-950/20',
    border: 'border-gray-200 dark:border-gray-800',
    text: 'text-gray-500 dark:text-gray-400',
    label: 'Out of Service',
  },
};

export function StationCard({ station, onAssign, onCheckout }: StationCardProps) {
  const config = statusConfig[station.status];
  const appointment = station.appointment;

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
                </div>
              </div>
            )}

            {/* Customer & Stylist Info */}
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
                    {appointment.assistantNames.length > 0 &&
                      ` +${appointment.assistantNames.length}`}
                  </span>
                </div>
              )}
            </div>

            {/* Services */}
            <div className="text-xs text-muted-foreground">
              {appointment.services.slice(0, 2).join(', ')}
              {appointment.services.length > 2 && ` +${appointment.services.length - 2} more`}
            </div>

            {/* Delay Badge */}
            {appointment.delayMinutes > 0 && (
              <div className="bg-orange-50 border border-orange-200 rounded px-2 py-1">
                <p className="text-xs text-orange-700 font-medium">
                  Started {appointment.delayMinutes} min late
                </p>
              </div>
            )}

            {/* Progress */}
            {appointment.progressPercent !== null && (
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
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-1">
              {onCheckout && (
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1"
                  onClick={() =>
                    onCheckout(
                      appointment.id,
                      isPendingAppointment(appointment),
                      appointment.scheduledDate,
                      appointment.scheduledTime
                    )
                  }
                >
                  Checkout
                </Button>
              )}
            </div>
          </>
        )}

        {/* Out of Service */}
        {station.status === 'out_of_service' && (
          <div className="flex flex-col items-center justify-center py-4 text-muted-foreground">
            <Wrench className="h-8 w-8 mb-2" />
            <p className="text-sm">Under maintenance</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
