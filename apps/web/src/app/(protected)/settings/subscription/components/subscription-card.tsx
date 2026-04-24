'use client';

/**
 * SubscriptionCard - Display individual branch subscription
 * Enhanced with grace period info, status-specific messaging, and better CTAs
 */

import { format, differenceInDays } from 'date-fns';
import {
  Building2,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Mail,
  AlertTriangle,
  Timer,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { BranchSubscription } from '@/hooks/queries/use-subscriptions';

interface SubscriptionCardProps {
  subscription: BranchSubscription;
  onCancel?: () => void;
  onReactivate?: () => void;
  onChangePlan?: () => void;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  trial: {
    label: 'Trial',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    bgColor: 'bg-blue-50 border-blue-200',
    icon: Clock,
  },
  active: {
    label: 'Active',
    color: 'bg-green-100 text-green-700 border-green-200',
    bgColor: 'bg-green-50 border-green-200',
    icon: CheckCircle,
  },
  past_due: {
    label: 'Past Due',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    bgColor: 'bg-yellow-50 border-yellow-200',
    icon: AlertCircle,
  },
  expired: {
    label: 'Expired',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    bgColor: 'bg-amber-50 border-amber-200',
    icon: Timer,
  },
  suspended: {
    label: 'Suspended',
    color: 'bg-red-100 text-red-700 border-red-200',
    bgColor: 'bg-red-50 border-red-200',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-slate-100 text-slate-600 border-slate-200',
    bgColor: 'bg-slate-50 border-slate-200',
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

  // Calculate grace period info
  const gracePeriodEndDate = subscription.gracePeriodEndDate
    ? new Date(subscription.gracePeriodEndDate)
    : null;
  const gracePeriodDaysRemaining = gracePeriodEndDate
    ? Math.max(0, differenceInDays(gracePeriodEndDate, new Date()))
    : null;

  // Calculate trial days remaining
  const trialEndDate = subscription.trialEndDate ? new Date(subscription.trialEndDate) : null;
  const trialDaysRemaining = trialEndDate
    ? Math.max(0, differenceInDays(trialEndDate, new Date()))
    : null;

  // Calculate trial progress
  const trialProgress =
    subscription.status === 'trial' && subscription.trialDaysGranted > 0 && trialDaysRemaining
      ? ((subscription.trialDaysGranted - trialDaysRemaining) / subscription.trialDaysGranted) * 100
      : null;

  const handleContactSupport = () => {
    // Open email client with pre-filled subject
    const subject = encodeURIComponent(`Subscription Inquiry - ${subscription.branchName}`);
    const body = encodeURIComponent(
      `Hi,\n\nI would like to inquire about my subscription for ${subscription.branchName}.\n\nCurrent Plan: ${subscription.plan.name}\nStatus: ${subscription.status}\nBilling Cycle: ${subscription.billingCycle}\n\nPlease let me know the available options.\n\nThank you.`
    );
    window.location.href = `mailto:support@trimio.in?subject=${subject}&body=${body}`;
  };

  const getStatusMessage = () => {
    switch (subscription.status) {
      case 'trial':
        if (trialDaysRemaining !== null && trialDaysRemaining <= 3) {
          return {
            type: 'warning',
            message: `Your trial ends in ${trialDaysRemaining} day${trialDaysRemaining !== 1 ? 's' : ''}. Contact support to upgrade.`,
          };
        }
        return null;

      case 'expired':
        if (gracePeriodDaysRemaining !== null && gracePeriodDaysRemaining > 0) {
          return {
            type: 'warning',
            message: `Grace period: ${gracePeriodDaysRemaining} day${gracePeriodDaysRemaining !== 1 ? 's' : ''} remaining. Contact support to reactivate.`,
          };
        }
        return {
          type: 'error',
          message: 'Your subscription has expired. Contact support to reactivate.',
        };

      case 'past_due':
        if (gracePeriodDaysRemaining !== null && gracePeriodDaysRemaining > 0) {
          return {
            type: 'warning',
            message: `Payment overdue. ${gracePeriodDaysRemaining} day${gracePeriodDaysRemaining !== 1 ? 's' : ''} until suspension.`,
          };
        }
        return {
          type: 'error',
          message: 'Payment is overdue. Contact support immediately to avoid suspension.',
        };

      case 'suspended':
        return {
          type: 'error',
          message: 'Your subscription is suspended. Contact support to restore access.',
        };

      case 'cancelled':
        return {
          type: 'info',
          message: 'Your subscription has been cancelled. Contact support to reactivate.',
        };

      default:
        return null;
    }
  };

  const statusMessage = getStatusMessage();

  return (
    <div className={`border rounded-lg p-4 bg-card ${config.bgColor}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/80 rounded-lg">
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

      {/* Trial Progress Bar */}
      {subscription.status === 'trial' && trialProgress !== null && (
        <div className="mb-4">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Trial Progress</span>
            <span>
              {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} remaining
            </span>
          </div>
          <Progress value={trialProgress} className="h-2" />
        </div>
      )}

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
              {subscription.status === 'expired' || subscription.status === 'past_due'
                ? 'Period Ended'
                : 'Current Period'}
            </p>
            <p className="font-medium">
              {format(new Date(subscription.currentPeriodStart), 'MMM d')} -{' '}
              {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
            </p>
          </div>
        )}

        {/* Grace Period Info */}
        {gracePeriodEndDate &&
          (subscription.status === 'expired' || subscription.status === 'past_due') && (
            <div className="col-span-2">
              <p className="text-muted-foreground flex items-center gap-1">
                <Timer className="h-3 w-3" />
                Grace Period Ends
              </p>
              <p className="font-medium text-amber-700">
                {format(gracePeriodEndDate, 'MMMM d, yyyy')}
                {gracePeriodDaysRemaining !== null && gracePeriodDaysRemaining > 0 && (
                  <span className="text-xs ml-1">
                    ({gracePeriodDaysRemaining} day{gracePeriodDaysRemaining !== 1 ? 's' : ''} left)
                  </span>
                )}
              </p>
            </div>
          )}
      </div>

      {/* Status-specific Warnings */}
      {subscription.cancelAtPeriodEnd && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
          <AlertCircle className="h-4 w-4 inline mr-2" />
          Subscription will cancel at the end of the current period
        </div>
      )}

      {statusMessage && (
        <div
          className={`mb-4 p-3 rounded-lg text-sm ${
            statusMessage.type === 'error'
              ? 'bg-red-50 border border-red-200 text-red-800'
              : statusMessage.type === 'warning'
                ? 'bg-amber-50 border border-amber-200 text-amber-800'
                : 'bg-slate-50 border border-slate-200 text-slate-700'
          }`}
        >
          {statusMessage.type === 'error' ? (
            <XCircle className="h-4 w-4 inline mr-2" />
          ) : statusMessage.type === 'warning' ? (
            <AlertTriangle className="h-4 w-4 inline mr-2" />
          ) : (
            <AlertCircle className="h-4 w-4 inline mr-2" />
          )}
          {statusMessage.message}
        </div>
      )}

      {/* Contact Support */}
      <div className="pt-2 border-t border-slate-200/50">
        <p className="text-xs text-muted-foreground mb-2">
          {subscription.status === 'suspended' || subscription.status === 'expired'
            ? 'Need to reactivate your subscription?'
            : subscription.status === 'past_due'
              ? 'Need help with payment?'
              : 'Need to change your plan or have questions?'}
        </p>
        <Button
          variant={
            subscription.status === 'suspended' ||
            subscription.status === 'expired' ||
            subscription.status === 'past_due'
              ? 'default'
              : 'outline'
          }
          size="sm"
          onClick={handleContactSupport}
        >
          <Mail className="h-4 w-4 mr-1" />
          Contact Support
        </Button>
      </div>
    </div>
  );
}
