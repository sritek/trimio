'use client';

/**
 * CurrentPlanCard - Display current subscription with feature access
 * Uses billing overview data to show the first active/trial subscription
 */

import { Check, X, Crown, Zap, Shield, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBillingOverview } from '@/hooks/queries/use-subscriptions';
import { FEATURE_DISPLAY_NAMES, type FeatureKey } from '@/hooks/use-feature-access';

const tierIcons: Record<string, React.ElementType> = {
  basic: Shield,
  professional: Zap,
  enterprise: Crown,
};

const tierColors: Record<string, string> = {
  basic: 'bg-slate-100 text-slate-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

const statusColors: Record<string, string> = {
  trial: 'bg-blue-100 text-blue-700',
  active: 'bg-green-100 text-green-700',
  past_due: 'bg-yellow-100 text-yellow-700',
  suspended: 'bg-red-100 text-red-700',
  cancelled: 'bg-slate-100 text-slate-600',
  expired: 'bg-slate-100 text-slate-600',
};

// Features to display in the card
const displayFeatures: FeatureKey[] = [
  'inventory',
  'memberships',
  'multiStaff',
  'onlineBooking',
  'smsReminders',
  'emailReminders',
  'api',
  'prioritySupport',
  'customBranding',
];

export function CurrentPlanCard() {
  const { data: billingOverview, isLoading, isError } = useBillingOverview();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Show error state if query failed
  if (isError) {
    return (
      <Card className="border-red-200 bg-red-50/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            Unable to Load Subscription
          </CardTitle>
          <CardDescription>
            There was an error loading your subscription details. Please refresh the page.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Find the first active or trial subscription
  const subscriptions = billingOverview?.subscriptions || [];
  const activeSubscription = subscriptions.find((sub) => ['trial', 'active'].includes(sub.status));

  // No active subscription found
  if (!activeSubscription) {
    // Check if there are any subscriptions at all (might be cancelled/expired)
    const anySubscription = subscriptions[0];
    if (anySubscription) {
      return (
        <Card className="border-amber-200 bg-amber-50/50">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500" />
              Subscription {anySubscription.status === 'cancelled' ? 'Cancelled' : 'Inactive'}
            </CardTitle>
            <CardDescription>
              Your subscription is currently {anySubscription.status}. Contact support to
              reactivate.
            </CardDescription>
          </CardHeader>
        </Card>
      );
    }

    return (
      <Card className="border-amber-200 bg-amber-50/50">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-500" />
            No Subscription Found
          </CardTitle>
          <CardDescription>
            No subscriptions found for your branches. Contact support to get started.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const plan = activeSubscription.plan;
  const TierIcon = tierIcons[plan.tier] || Shield;
  const statusLabel =
    activeSubscription.status === 'trial'
      ? 'Trial'
      : activeSubscription.status === 'active'
        ? 'Active'
        : activeSubscription.status;

  // Parse features from plan
  const planFeatures = (plan.features || {}) as Record<string, unknown>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <TierIcon className="h-5 w-5" />
              Your Current Plan
            </CardTitle>
            <CardDescription>
              Features available on your subscription
              {activeSubscription.branchName && (
                <span className="ml-1">({activeSubscription.branchName})</span>
              )}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={tierColors[plan.tier] || 'bg-slate-100'}>
              {plan.name}
            </Badge>
            <Badge
              variant="outline"
              className={statusColors[activeSubscription.status] || 'bg-slate-100'}
            >
              {statusLabel}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Limits */}
        <div className="mb-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Usage Limits
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <LimitItem label="Users" value={plan.maxUsers} />
            <LimitItem label="Appointments/day" value={plan.maxAppointmentsPerDay} />
            <LimitItem label="Services" value={plan.maxServices} />
            <LimitItem label="Products" value={plan.maxProducts} />
          </div>
        </div>

        {/* Features */}
        <div>
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            Features
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {displayFeatures.map((feature) => {
              const featureValue = planFeatures[feature];
              const isEnabled = typeof featureValue === 'boolean' ? featureValue : !!featureValue;

              return (
                <FeatureItem
                  key={feature}
                  label={FEATURE_DISPLAY_NAMES[feature]}
                  enabled={isEnabled}
                  value={
                    feature === 'reports' && typeof featureValue === 'string'
                      ? featureValue
                      : undefined
                  }
                />
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function LimitItem({ label, value }: { label: string; value: number | undefined | null }) {
  // Handle undefined/null values
  if (value === undefined || value === null) {
    return (
      <div className="text-center p-3 bg-muted/50 rounded-lg">
        <p className="text-2xl font-semibold">-</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    );
  }

  const displayValue = value === -1 ? 'Unlimited' : value.toString();

  return (
    <div className="text-center p-3 bg-muted/50 rounded-lg">
      <p className="text-2xl font-semibold">{displayValue}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function FeatureItem({
  label,
  enabled,
  value,
}: {
  label: string;
  enabled: boolean;
  value?: string;
}) {
  return (
    <div
      className={`flex items-center gap-2 p-2 rounded-lg ${enabled ? 'bg-green-50' : 'bg-slate-50'}`}
    >
      {enabled ? (
        <Check className="h-4 w-4 text-green-600 shrink-0" />
      ) : (
        <X className="h-4 w-4 text-slate-400 shrink-0" />
      )}
      <span className={`text-sm ${enabled ? 'text-slate-900' : 'text-slate-500'}`}>
        {label}
        {value && <span className="text-xs text-muted-foreground ml-1">({value})</span>}
      </span>
    </div>
  );
}
