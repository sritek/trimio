'use client';

/**
 * SubscriptionCard - Display individual branch subscription
 */

import { format } from 'date-fns';
import { Building2, Calendar, AlertCircle, CheckCircle, Clock, XCircle, Mail } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BranchSubscription } from '@/hooks/queries/use-subscriptions';

interface SubscriptionCardProps {
  subscription: BranchSubscription;
  onCancel?: () => void;
  onReactivate?: () => void;
  onChangePlan?: () => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  trial: {
    label: 'Trial',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: Clock,
  },
  active: {
    label: 'Active',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: CheckCircle,
  },
  past_due: {
    label: 'Past Due',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    icon: AlertCircle,
  },
  suspended: {
    label: 'Suspended',
    color: 'bg-red-100 text-red-700 border-red-200',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: XCircle,
  },
  expired: {
    label: 'Expired',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    icon: XCircle,
  },
};

const tierColors: Record<string, string> = {
  basic: 'bg-slate-100 text-slate-700',
  professional: 'bg-blue-100 text-blue-700',
  enterprise: 'bg-purple-100 text-purple-700',
};

export function SubscriptionCard({ subscription }: SubscriptionCardProps) {
  const config = statusConfig[subscription.status] || statusConfig.active;
  const StatusIcon = config.icon;

  const handleContactSupport = () => {
    // Open email client with pre-filled subject
    const subject = encodeURIComponent(`Subscription Inquiry - ${subscription.branchName}`);
    const body = encodeURIComponent(
      `Hi,\n\nI would like to inquire about my subscription for ${subscription.branchName}.\n\nCurrent Plan: ${subscription.plan.name}\nBilling Cycle: ${subscription.billingCycle}\n\nPlease let me know the available options.\n\nThank you.`
    );
    window.location.href = `mailto:${process.env.TRIMIO_SUPPORT_EMAIL}?subject=${subject}&body=${body}`;
  };

  return (
    <div className="border rounded-lg p-4 bg-card">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-muted rounded-lg">
            <Building2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium">{subscription.branchName}</h3>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="outline" className={tierColors[subscription.plan.tier]}>
                {subscription.plan.name}
              </Badge>
              <Badge variant="outline" className={config.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {config.label}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Details */}
      <div className="grid grid-cols-2 gap-4 text-sm mb-4">
        <div>
          <p className="text-muted-foreground">Billing Cycle</p>
          <p className="font-medium capitalize">{subscription.billingCycle}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Price</p>
          <p className="font-medium">
            ₹{subscription.pricePerPeriod.toLocaleString('en-IN')}
            <span className="text-muted-foreground font-normal">
              /{subscription.billingCycle === 'monthly' ? 'mo' : 'yr'}
            </span>
            {subscription.discountPercentage > 0 && (
              <span className="text-green-600 text-xs ml-1">
                ({subscription.discountPercentage}% off)
              </span>
            )}
          </p>
        </div>
        {subscription.status === 'trial' && subscription.trialEndDate && (
          <div className="col-span-2">
            <p className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Trial Ends
            </p>
            <p className="font-medium">
              {format(new Date(subscription.trialEndDate), 'MMMM d, yyyy')}
            </p>
          </div>
        )}
        {subscription.status !== 'trial' && (
          <div className="col-span-2">
            <p className="text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Current Period
            </p>
            <p className="font-medium">
              {format(new Date(subscription.currentPeriodStart), 'MMM d')} -{' '}
              {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
            </p>
          </div>
        )}
      </div>

      {/* Warnings */}
      {subscription.cancelAtPeriodEnd && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <AlertCircle className="h-4 w-4 inline mr-2" />
          Subscription will cancel at the end of the current period
        </div>
      )}

      {subscription.status === 'past_due' && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">
          <AlertCircle className="h-4 w-4 inline mr-2" />
          Payment is overdue. Please contact support to avoid service interruption.
        </div>
      )}

      {/* Contact Support */}
      <div className="pt-2 border-t">
        <p className="text-xs text-muted-foreground mb-2">
          Need to change your plan or have questions?
        </p>
        <Button variant="outline" size="sm" onClick={handleContactSupport}>
          <Mail className="h-4 w-4 mr-1" />
          Contact Support
        </Button>
      </div>
    </div>
  );
}
