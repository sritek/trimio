'use client';

/**
 * TrialBanner - Shows trial status and days remaining
 * Full-width banner at the top of the page
 */

import Link from 'next/link';
import { X, Sparkles, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface TrialBannerProps {
  daysRemaining: number;
  planName: string | null;
  className?: string;
}

const DISMISS_KEY = 'trial-banner-dismissed';
const DISMISS_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function TrialBanner({ daysRemaining, planName, className }: TrialBannerProps) {
  const [isDismissed, setIsDismissed] = useState(true); // Start hidden to avoid flash

  useEffect(() => {
    // Check if banner was dismissed recently
    const dismissedAt = localStorage.getItem(DISMISS_KEY);
    if (dismissedAt) {
      const dismissedTime = parseInt(dismissedAt, 10);
      const now = Date.now();
      // If urgent (3 days or less), always show. Otherwise respect dismiss.
      if (daysRemaining > 3 && now - dismissedTime < DISMISS_DURATION) {
        setIsDismissed(true);
        return;
      }
    }
    setIsDismissed(false);
  }, [daysRemaining]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, Date.now().toString());
    setIsDismissed(true);
  };

  if (isDismissed) return null;

  // Determine urgency level
  const isUrgent = daysRemaining <= 3;
  const isWarning = daysRemaining <= 7 && !isUrgent;

  const getMessage = () => {
    if (daysRemaining === 0) return 'Your trial ends today!';
    if (daysRemaining === 1) return 'Your trial ends tomorrow!';
    return `${daysRemaining} days left in your trial`;
  };

  return (
    <div
      className={cn(
        'relative flex items-center justify-center gap-3 px-4 py-2 text-sm font-medium',
        isUrgent
          ? 'bg-gradient-to-r from-red-600 to-red-500 text-white'
          : isWarning
            ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white'
            : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white',
        className
      )}
    >
      <Sparkles className="h-4 w-4 shrink-0" />

      <span>
        {getMessage()}
        {planName && <span className="opacity-90"> • {planName} Plan</span>}
      </span>

      <Button
        variant="secondary"
        size="sm"
        className={cn(
          'h-7 px-3 text-xs font-semibold',
          isUrgent
            ? 'bg-white text-red-600 hover:bg-red-50'
            : isWarning
              ? 'bg-white text-amber-600 hover:bg-amber-50'
              : 'bg-white text-indigo-600 hover:bg-indigo-50'
        )}
        asChild
      >
        <Link href="/settings/subscription">
          Upgrade Now
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
