/**
 * PlanBadge - Subscription plan badge with consistent styling
 */

'use client';

import { Badge } from '@/components/ui/badge';
import { PLAN_BADGE_COLORS } from '../constants';
import type { SubscriptionPlan } from '../types';

interface PlanBadgeProps {
  plan: SubscriptionPlan | string;
  className?: string;
}

export function PlanBadge({ plan, className }: PlanBadgeProps) {
  const colorClass =
    PLAN_BADGE_COLORS[plan as SubscriptionPlan] || 'bg-slate-100 text-slate-700 border-slate-200';

  return <Badge className={`${colorClass} ${className || ''}`}>{plan}</Badge>;
}
