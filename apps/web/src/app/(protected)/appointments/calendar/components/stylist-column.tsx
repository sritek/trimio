/**
 * Stylist Column Header Component
 * Individual stylist header in the resource calendar
 */

'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import type { CalendarStylist } from '@/hooks/queries/use-resource-calendar';

interface StylistColumnHeaderProps {
  stylist: CalendarStylist;
  isSelected?: boolean;
  onClick?: () => void;
  className?: string;
}

export function StylistColumnHeader({
  stylist,
  isSelected = false,
  onClick,
  className,
}: StylistColumnHeaderProps) {
  const initials = stylist.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      onClick={onClick}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5 p-2 border-b border-r',
        'min-w-[120px]',
        onClick && 'cursor-pointer hover:bg-muted/80',
        isSelected && 'bg-primary/10 border-primary',
        className
      )}
    >
      <div className="relative">
        <Avatar className="size-9 ring-2 ring-background shadow-sm">
          <AvatarImage src={stylist.avatar || undefined} alt={stylist.name} />
          <AvatarFallback
            style={{ backgroundColor: stylist.color }}
            className="text-white text-sm font-medium"
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        {/* Availability indicator */}
        <span
          className={cn(
            'absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background',
            stylist.isAvailable ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
      </div>
      <div className="text-center">
        <span className="text-sm font-medium truncate block max-w-[110px]">{stylist.name}</span>
        {!stylist.isAvailable && (
          <span className="text-[10px] text-muted-foreground">Unavailable</span>
        )}
      </div>
    </div>
  );
}
