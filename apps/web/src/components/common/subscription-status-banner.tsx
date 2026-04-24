'use client';

/**
 * SubscriptionStatusBanner - Shows subscription status warnings
 * Handles: trial, expired, past_due states with graduated urgency
 */

import Link from 'next/link';
import { X, Sparkles, AlertTriangle, Clock, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

type BannerType = 'trial' | 'expired' | 'past_due';

interface SubscriptionStatusBannerProps {
  type: BannerType;
  daysRemaining: number | null;
  planName: string | null;
  gracePeriodDaysRemaining?: number | null;
  className?: string;
}

const DISMISS_KEY_PREFIX = 'subscription-banner-dismissed-';
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function SubscriptionStatusBanner({
  type,
  daysRemaining,
  planName,
  gracePeriodDaysRemaining,
  className,
}: SubscriptionStatusBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to avoid flash

  // Determine if this is urgent (non-dismissible)
  const isUrgent =
    type === 'expired' ||
    type === 'past_due' ||
    (type === 'trial' && daysRemaining !== null && daysRemaining <= 3);

  useEffect(() => {
    // Urgent banners are never dismissible
    if (isUrgent) {
      setIsDismissed(false);
      return;
    }

    // Check if banner was dismissed recently
    const dismissKey = `${DISMISS_KEY_PREFIX}${type}`;
    const dismissedAt = localStorage.getItem(dismissKey);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const now = Date.now();
      if (now - dismissedTime < DISMISS_DURATION) {
        setIsDismissed(true);
        return;
      }
    }
    setIsDismissed(false);
  }, [type, isUrgent]);

  const handleDismiss = () => {
    const dismissKey = `${DISMISS_KEY_PREFIX}${type}`;
    localStorage.setItem(dismissKey, Date.now().toString());
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  // Get banner configuration based on type
  const config = getBannerConfig(type, daysRemaining, gracePeriodDaysRemaining ?? null);

  return (
    <div
      className={cn(
        'relative flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium',
        config.bgClass,
        className
      )}
    >
      <config.Icon className="h-4 w-4 shrink-0" />

      <span className="text-center">
        {config.message}
        {planName && type === 'trial' && <span className="opacity-90"> • {planName} Plan</span>}
      </span>

      <Button
        variant="secondary"
        size="sm"
        className={cn('h-7 px-3 text-xs font-semibold', config.buttonClass)}
        asChild
      >
        <Link href="/settings/subscription">
          {config.buttonText}
          <ArrowRight className="ml-1 h-3 w-3" />
        </Link>
      </Button>

      {/* Only allow dismiss if not urgent */}
      {!isUrgent && (
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-white/20 transition-colors"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

function getBannerConfig(
  type: BannerType,
  daysRemaining: number | null,
  gracePeriodDaysRemaining: number | null
) {
  switch (type) {
    case 'trial': {
      const isUrgent = daysRemaining !== null && daysRemaining <= 3;
      const isWarning = daysRemaining !== null && daysRemaining <= 7 && !isUrgent;

      let message: string;
      if (daysRemaining === 0) {
        message = 'Your trial ends today!';
      } else if (daysRemaining === 1) {
        message = 'Your trial ends tomorrow!';
      } else {
        message = `${daysRemaining} days left in your trial`;
      }

      return {
        Icon: Sparkles,
        message,
        buttonText: 'Upgrade Now',
        bgClass: isUrgent
          ? 'bg-gradient-to-r from-red-600 to-red-500 text-white'
          : isWarning
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
            : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white',
        buttonClass: isUrgent
          ? 'bg-white text-red-600 hover:bg-red-50'
          : isWarning
            ? 'bg-white text-amber-600 hover:bg-amber-50'
            : 'bg-white text-indigo-600 hover:bg-indigo-50',
      };
    }

    case 'expired': {
      const graceMessage =
        gracePeriodDaysRemaining !== null && gracePeriodDaysRemaining > 0
          ? ` You have ${gracePeriodDaysRemaining} day${gracePeriodDaysRemaining === 1 ? '' : 's'} to upgrade before access is restricted.`
          : ' Please upgrade to continue using all features.';

      return {
        Icon: AlertTriangle,
        message: `Your trial has ended.${graceMessage}`,
        buttonText: 'Upgrade Now',
        bgClass: 'bg-gradient-to-r from-red-600 to-red-500 text-white',
        buttonClass: 'bg-white text-red-600 hover:bg-red-50',
      };
    }

    case 'past_due': {
      const graceMessage =
        gracePeriodDaysRemaining !== null && gracePeriodDaysRemaining > 0
          ? ` Please update within ${gracePeriodDaysRemaining} day${gracePeriodDaysRemaining === 1 ? '' : 's'} to avoid service interruption.`
          : ' Please contact support to restore your subscription.';

      return {
        Icon: Clock,
        message: `Payment overdue.${graceMessage}`,
        buttonText: 'Contact Support',
        bgClass: 'bg-gradient-to-r from-amber-600 to-orange-500 text-white',
        buttonClass: 'bg-white text-amber-600 hover:bg-amber-50',
      };
    }
  }
}
