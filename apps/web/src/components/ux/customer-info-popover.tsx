'use client';

/**
 * Customer Info Popover
 *
 * Quick peek at customer info without navigating away.
 * Use this instead of opening a slide-over for quick reference.
 */

import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Phone, Mail, Star, Wallet, Calendar, AlertTriangle, Tag } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCustomer } from '@/hooks/queries/use-customers';
import { useAuthStore } from '@/stores/auth-store';
import { maskPhoneNumber, shouldMaskPhoneForRole } from '@/lib/phone-masking';
import { cn } from '@/lib/utils';

interface CustomerInfoPopoverProps {
  customerId: string;
  children: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
}

export function CustomerInfoPopover({
  customerId,
  children,
  align = 'start',
  side = 'bottom',
}: CustomerInfoPopoverProps) {
  const [open, setOpen] = useState(false);
  const { user } = useAuthStore();
  const shouldMask = user?.role ? shouldMaskPhoneForRole(user.role) : false;

  // Only fetch when popover is open
  const { data: customer, isLoading } = useCustomer(open ? customerId : '');

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-72 p-0" align={align} side={side}>
        {isLoading ? (
          <div className="p-4 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
            <div className="flex gap-4">
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-10 w-16" />
            </div>
          </div>
        ) : customer ? (
          <div className="divide-y">
            {/* Header */}
            <div className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h4 className="font-semibold truncate">{customer.name}</h4>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                    <Phone className="h-3 w-3" />
                    <span>{shouldMask ? maskPhoneNumber(customer.phone) : customer.phone}</span>
                  </div>
                  {customer.email && (
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      <span className="truncate">{customer.email}</span>
                    </div>
                  )}
                </div>
                {customer.bookingStatus === 'vip' && (
                  <Badge variant="secondary" className="shrink-0">
                    <Star className="h-3 w-3 mr-1" />
                    VIP
                  </Badge>
                )}
                {customer.bookingStatus === 'blocked' && (
                  <Badge variant="destructive" className="shrink-0">
                    Blocked
                  </Badge>
                )}
              </div>

              {/* Tags */}
              {customer.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {customer.tags.slice(0, 3).map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {customer.tags.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{customer.tags.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 divide-x">
              <div className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-amber-600">
                  <Star className="h-3.5 w-3.5" />
                  <span className="font-semibold">{customer.loyaltyPoints}</span>
                </div>
                <p className="text-xs text-muted-foreground">Points</p>
              </div>
              <div className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-green-600">
                  <Wallet className="h-3.5 w-3.5" />
                  <span className="font-semibold">₹{customer.walletBalance}</span>
                </div>
                <p className="text-xs text-muted-foreground">Wallet</p>
              </div>
              <div className="p-3 text-center">
                <div className="flex items-center justify-center gap-1 text-blue-600">
                  <Calendar className="h-3.5 w-3.5" />
                  <span className="font-semibold">{customer.visitCount || 0}</span>
                </div>
                <p className="text-xs text-muted-foreground">Visits</p>
              </div>
            </div>

            {/* Warnings */}
            {(customer.noShowCount > 0 || customer.allergies.length > 0) && (
              <div className="p-3 space-y-2">
                {customer.noShowCount > 0 && (
                  <div className="flex items-center gap-2 text-sm text-amber-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span>
                      {customer.noShowCount} no-show{customer.noShowCount > 1 ? 's' : ''}
                    </span>
                  </div>
                )}
                {customer.allergies.length > 0 && (
                  <div className="flex items-start gap-2 text-sm text-red-600">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>Allergies: {customer.allergies.join(', ')}</span>
                  </div>
                )}
              </div>
            )}

            {/* Last Visit */}
            {customer.lastVisitDate && (
              <div className="px-4 py-2 text-xs text-muted-foreground bg-muted/30">
                Last visit: {format(parseISO(customer.lastVisitDate), 'MMM d, yyyy')}
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">Customer not found</div>
        )}
      </PopoverContent>
    </Popover>
  );
}
