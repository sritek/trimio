'use client';

/**
 * LimitBanner - Warning banner when subscription limits are near/reached
 */

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

export type LimitType = 'users' | 'services' | 'products';

interface LimitBannerProps {
  type: LimitType;
  current: number;
  limit: number;
  className?: string;
}

const limitLabels: Record<LimitType, { singular: string; plural: string }> = {
  users: { singular: 'user', plural: 'users' },
  services: { singular: 'service', plural: 'services' },
  products: { singular: 'product', plural: 'products' },
};

export function LimitBanner({ type, current, limit, className }: LimitBannerProps) {
  // Don't show if unlimited (-1) or well under limit
  if (limit === -1) return null;

  const percentage = (current / limit) * 100;
  const isAtLimit = current >= limit;
  const isNearLimit = percentage >= 90 && !isAtLimit;

  // Only show when near or at limit
  if (!isAtLimit && !isNearLimit) return null;

  const label = limitLabels[type];
  const limitText = limit === 1 ? label.singular : label.plural;

  return (
    <Alert variant={isAtLimit ? 'destructive' : 'default'} className={className}>
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between gap-4">
        <span>
          {isAtLimit ? (
            <>
              You&apos;ve reached your {label.singular} limit ({current}/{limit} {limitText}).
              Upgrade your plan to add more.
            </>
          ) : (
            <>
              You&apos;re approaching your {label.singular} limit ({current}/{limit} {limitText}).
            </>
          )}
        </span>
        <Button variant={isAtLimit ? 'outline' : 'ghost'} size="sm" asChild>
          <Link href="/settings/subscription">View Plans</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}

/**
 * Helper to check if add button should be disabled
 */
export function isLimitReached(current: number, limit: number): boolean {
  if (limit === -1) return false; // Unlimited
  return current >= limit;
}
