'use client';

/**
 * Station Card Component
 * Displays individual station status in the command center
 * Requirements: 4.1, 4.2, 4.12
 */

import { memo } from 'react';
import { User, Clock, Wrench } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import type { Station } from '@/types/dashboard';

interface StationCardProps {
  station: Station;
  onClick?: (station: Station) => void;
  onQuickAction?: (station: Station, action: 'book' | 'start') => void;
}

const STATUS_STYLES: Record<
  Station['status'],
  { border: string; bg: string; indicator: string; label: string }
> = {
  available: {
    border: 'border-green-200 dark:border-green-800',
    bg: 'bg-green-50 dark:bg-green-950/30',
    indicator: 'bg-green-500',
    label: 'Available',
  },
  occupied: {
    border: 'border-blue-200 dark:border-blue-800',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    indicator: 'bg-blue-500',
    label: 'Occupied',
  },
  reserved: {
    border: 'border-amber-200 dark:border-amber-800',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    indicator: 'bg-amber-500',
    label: 'Reserved',
  },
  out_of_service: {
    border: 'border-gray-200 dark:border-gray-700',
    bg: 'bg-gray-50 dark:bg-gray-900/30',
    indicator: 'bg-gray-400',
    label: 'Out of Service',
  },
};

function StationCardComponent({ station, onClick, onQuickAction }: StationCardProps) {
  const styles = STATUS_STYLES[station.status];
  const appointment = station.appointment;
  const stylistInitials = appointment?.stylistName
    ?.split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const handleClick = () => {
    if (onClick) {
      onClick(station);
    }
  };

  const handleQuickAction = (e: React.MouseEvent, action: 'book' | 'start') => {
    e.stopPropagation();
    if (onQuickAction) {
      onQuickAction(station, action);
    }
  };

  return (
    <div
      className={cn(
        'relative rounded-lg border-2 p-4 transition-all cursor-pointer hover:shadow-md',
        styles.border,
        styles.bg
      )}
      onClick={handleClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick();
        }
      }}
    >
      {/* Status indicator */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        <span className={cn('h-2 w-2 rounded-full', styles.indicator)} />
        <span className="text-xs text-muted-foreground">{styles.label}</span>
      </div>

      {/* Station info */}
      <div className="flex items-center gap-3 mb-3">
        <Avatar className="h-10 w-10">
          <AvatarFallback className="text-sm">
            {stylistInitials || <User className="h-4 w-4" />}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium truncate">{appointment?.stylistName || 'Unassigned'}</p>
          <p className="text-xs text-muted-foreground">{station.name}</p>
        </div>
      </div>

      {/* Current appointment or status */}
      {station.status === 'occupied' && appointment ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium truncate">{appointment.customerName}</span>
            {appointment.remainingMinutes != null && (
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {appointment.remainingMinutes}m
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {appointment.services.join(', ')}
          </p>
          {appointment.progressPercent != null && (
            <Progress value={appointment.progressPercent} className="h-1.5" />
          )}
          <p className="text-xs text-muted-foreground text-right">
            {appointment.scheduledTime}
            {appointment.estimatedEndTime ? ` - ${appointment.estimatedEndTime}` : ''}
          </p>
        </div>
      ) : station.status === 'reserved' && appointment ? (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium truncate">{appointment.customerName}</span>
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {appointment.scheduledTime}
            </span>
          </div>
          <p className="text-xs text-muted-foreground truncate">
            {appointment.services.join(', ')}
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">Upcoming appointment</p>
        </div>
      ) : station.status === 'out_of_service' ? (
        <div className="flex items-center justify-center py-4 text-muted-foreground">
          <Wrench className="h-5 w-5 mr-2" />
          <span className="text-sm">Out of Service</span>
        </div>
      ) : station.status === 'available' ? (
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={(e) => handleQuickAction(e, 'book')}
          >
            Book Now
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export const StationCard = memo(StationCardComponent);
