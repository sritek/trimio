'use client';

/**
 * Station Card Component
 * Displays a single station with status, appointment info, and actions
 */

import {
  Play,
  Eye,
  Plus,
  CheckCircle,
  Clock,
  User,
  Scissors,
  AlertTriangle,
  Wrench,
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { StationCard as StationCardType, FloorViewStatus } from '@/types/stations';

interface StationCardProps {
  station: StationCardType;
  onAssign: (stationId: string) => void;
  onViewDetails: (appointmentId: string) => void;
  onAddService: (appointmentId: string) => void;
  onComplete: (appointmentId: string) => void;
  onStartNow: (appointmentId: string) => void;
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
    bg: 'bg-yellow-50 dark:bg-yellow-950/20',
    border: 'border-yellow-200 dark:border-yellow-800',
    text: 'text-yellow-700 dark:text-yellow-400',
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
  onViewDetails,
  onAddService,
  onComplete,
  onStartNow,
}: StationCardProps) {
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
            <div className="flex gap-1 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onViewDetails(appointment.id)}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onAddService(appointment.id)}
              >
                <Plus className="h-3 w-3 mr-1" />
                Add
              </Button>
              <Button size="sm" className="flex-1" onClick={() => onComplete(appointment.id)}>
                <CheckCircle className="h-3 w-3 mr-1" />
                Done
              </Button>
            </div>
          </>
        )}

        {/* Reserved Station */}
        {station.status === 'reserved' && appointment && (
          <>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium truncate">{appointment.customerName}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Scheduled: {appointment.scheduledTime}
                </span>
              </div>
            </div>

            <div className="text-xs text-muted-foreground">
              {appointment.services.slice(0, 2).join(', ')}
              {appointment.services.length > 2 && ` +${appointment.services.length - 2} more`}
            </div>

            <div className="flex gap-1 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => onViewDetails(appointment.id)}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
              <Button size="sm" className="flex-1" onClick={() => onStartNow(appointment.id)}>
                <Play className="h-3 w-3 mr-1" />
                Start
              </Button>
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
