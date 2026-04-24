'use client';

/**
 * PlanComparisonCard - Display plan features comparison
 */

import { Check, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { SubscriptionPlan } from '@/hooks/queries/use-subscriptions';

interface PlanComparisonCardProps {
  plans: SubscriptionPlan[];
}

const tierOrder = ['basic', 'professional', 'enterprise'];

export function PlanComparisonCard({ plans }: PlanComparisonCardProps) {
  // Sort plans by tier
  const sortedPlans = [...plans]
    .filter((p) => p.isActive && p.isPublic)
    .sort((a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier));

  if (sortedPlans.length === 0) {
    return <p className="text-muted-foreground">No plans available</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {sortedPlans.map((plan) => {
        const features = (plan.features || {}) as Record<string, unknown>;

        return (
          <div
            key={plan.id}
            className={`border rounded-lg p-6 ${
              plan.tier === 'professional' ? 'border-primary ring-1 ring-primary' : ''
            }`}
          >
            {/* Header */}
            <div className="text-center mb-6">
              {plan.tier === 'professional' && (
                <Badge className="mb-2 bg-primary">Most Popular</Badge>
              )}
              <h3 className="text-xl font-semibold">{plan.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">{plan.description}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold">
                  ₹{plan.monthlyPrice.toLocaleString('en-IN')}
                </span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                or ₹{plan.annualPrice.toLocaleString('en-IN')}/year (save ~17%)
              </p>
            </div>

            {/* Limits */}
            <div className="space-y-3 mb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Limits
              </p>
              <FeatureRow
                label="Users"
                value={plan.maxUsers === -1 ? 'Unlimited' : `Up to ${plan.maxUsers}`}
                included
              />
              <FeatureRow
                label="Appointments/day"
                value={
                  plan.maxAppointmentsPerDay === -1
                    ? 'Unlimited'
                    : `Up to ${plan.maxAppointmentsPerDay}`
                }
                included
              />
              <FeatureRow
                label="Services"
                value={plan.maxServices === -1 ? 'Unlimited' : `Up to ${plan.maxServices}`}
                included
              />
              <FeatureRow
                label="Products"
                value={plan.maxProducts === -1 ? 'Unlimited' : `Up to ${plan.maxProducts}`}
                included
              />
              <FeatureRow label="Trial Period" value={`${plan.trialDays} days`} included />
            </div>

            {/* Core Features */}
            <div className="space-y-3 mb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Core Features
              </p>
              <FeatureRow label="Inventory Management" included={Boolean(features.inventory)} />
              <FeatureRow label="Memberships & Packages" included={Boolean(features.memberships)} />
              <FeatureRow
                label="Reports"
                value={
                  features.reports === 'advanced'
                    ? 'Advanced'
                    : features.reports === 'basic'
                      ? 'Basic'
                      : undefined
                }
                included={Boolean(features.reports)}
              />
              <FeatureRow label="Multi-Staff Support" included={Boolean(features.multiStaff)} />
            </div>

            {/* Communication Features */}
            <div className="space-y-3 mb-4">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Communication
              </p>
              <FeatureRow label="Online Booking" included={Boolean(features.onlineBooking)} />
              <FeatureRow label="SMS Reminders" included={Boolean(features.smsReminders)} />
              <FeatureRow label="Email Reminders" included={Boolean(features.emailReminders)} />
            </div>

            {/* Premium Features */}
            <div className="space-y-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Premium
              </p>
              <FeatureRow label="API Access" included={Boolean(features.api)} />
              <FeatureRow label="Priority Support" included={Boolean(features.prioritySupport)} />
              <FeatureRow label="Custom Branding" included={Boolean(features.customBranding)} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FeatureRow({
  label,
  value,
  included,
}: {
  label: string;
  value?: string;
  included?: boolean;
}) {
  const isIncluded = included !== false;

  return (
    <div className="flex items-center justify-between text-sm">
      <span className={isIncluded ? '' : 'text-muted-foreground'}>{label}</span>
      {value ? (
        <span className="font-medium">{value}</span>
      ) : isIncluded ? (
        <Check className="h-4 w-4 text-green-600" />
      ) : (
        <X className="h-4 w-4 text-muted-foreground" />
      )}
    </div>
  );
}
