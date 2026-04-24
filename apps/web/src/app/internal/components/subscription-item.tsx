/**
 * SubscriptionItem - Display single branch subscription details
 * Enhanced with admin operations: status change, extend trial, apply discount
 */

'use client';

import { format, differenceInDays } from 'date-fns';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Timer,
  MoreVertical,
  History,
  Percent,
  CalendarPlus,
  RefreshCw,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { BranchSubscription } from '../types';

interface SubscriptionItemProps {
  subscription: BranchSubscription;
  onCancel: (branchId: string) => void;
  onReactivate: (branchId: string) => void;
  onChangeStatus?: (branchId: string) => void;
  onExtendTrial?: (branchId: string) => void;
  onApplyDiscount?: (branchId: string) => void;
  onViewHistory?: (branchId: string) => void;
}

const statusConfig: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  trial: {
    label: 'Trial',
    color: 'border-blue-300 text-blue-700 bg-blue-50',
    bgColor: 'bg-blue-50/50 border-blue-100',
    icon: Clock,
  },
  active: {
    label: 'Active',
    color: 'border-green-300 text-green-700 bg-green-50',
    bgColor: 'bg-green-50/50 border-green-100',
    icon: CheckCircle,
  },
  past_due: {
    label: 'Past Due',
    color: 'border-yellow-300 text-yellow-700 bg-yellow-50',
    bgColor: 'bg-yellow-50/50 border-yellow-100',
    icon: AlertCircle,
  },
  expired: {
    label: 'Expired',
    color: 'border-amber-300 text-amber-700 bg-amber-50',
    bgColor: 'bg-amber-50/50 border-amber-100',
    icon: Timer,
  },
  suspended: {
    label: 'Suspended',
    color: 'border-red-300 text-red-700 bg-red-50',
    bgColor: 'bg-red-50/50 border-red-100',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'border-slate-300 text-slate-500 bg-slate-50',
    bgColor: 'bg-slate-50/50 border-slate-100',
    icon: XCircle,
  },
};

export function SubscriptionItem({
  subscription,
  onCancel,
  onReactivate,
  onChangeStatus,
  onExtendTrial,
  onApplyDiscount,
  onViewHistory,
}: SubscriptionItemProps) {
  const config = statusConfig[subscription.status] || statusConfig.active;
  const StatusIcon = config.icon;

  const canCancel = ['trial', 'active', 'past_due'].includes(subscription.status);
  const canReactivate = ['suspended', 'cancelled', 'expired'].includes(subscription.status);
  const canExtendTrial = ['trial', 'expired'].includes(subscription.status);

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

  return (
    <div className={`p-4 rounded-lg border ${config.bgColor}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-slate-900 font-medium">{subscription.branchName}</p>
          <p className="text-sm text-slate-500">{subscription.plan.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={config.color}>
            <StatusIcon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
          {/* Admin Actions Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onViewHistory && (
                <DropdownMenuItem onClick={() => onViewHistory(subscription.branchId)}>
                  <History className="h-4 w-4 mr-2" />
                  View History
                </DropdownMenuItem>
              )}
              {onChangeStatus && (
                <DropdownMenuItem onClick={() => onChangeStatus(subscription.branchId)}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Change Status
                </DropdownMenuItem>
              )}
              {canExtendTrial && onExtendTrial && (
                <DropdownMenuItem onClick={() => onExtendTrial(subscription.branchId)}>
                  <CalendarPlus className="h-4 w-4 mr-2" />
                  Extend Trial
                </DropdownMenuItem>
              )}
              {onApplyDiscount && (
                <DropdownMenuItem onClick={() => onApplyDiscount(subscription.branchId)}>
                  <Percent className="h-4 w-4 mr-2" />
                  Apply Discount
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              {canCancel && (
                <DropdownMenuItem
                  onClick={() => onCancel(subscription.branchId)}
                  className="text-red-600"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Cancel Subscription
                </DropdownMenuItem>
              )}
              {canReactivate && (
                <DropdownMenuItem
                  onClick={() => onReactivate(subscription.branchId)}
                  className="text-green-600"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Reactivate
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 text-sm mb-3">
        <div>
          <p className="text-slate-500">Billing</p>
          <p className="text-slate-900 capitalize">{subscription.billingCycle}</p>
        </div>
        <div>
          <p className="text-slate-500">Price</p>
          <p className="text-slate-900">
            ₹{subscription.pricePerPeriod.toLocaleString('en-IN')}
            {subscription.discountPercentage > 0 && (
              <span className="text-green-600 text-xs ml-1">
                (-{subscription.discountPercentage}%)
              </span>
            )}
          </p>
        </div>
        {subscription.status === 'trial' && subscription.trialEndDate && (
          <>
            <div>
              <p className="text-slate-500">Trial Period</p>
              <p className="text-slate-900">{subscription.trialDaysGranted} days</p>
            </div>
            <div>
              <p className="text-slate-500">Trial Ends</p>
              <p className="text-slate-900">
                {format(new Date(subscription.trialEndDate), 'MMM d, yyyy')}
                {trialDaysRemaining !== null && (
                  <span className="text-xs text-blue-600 ml-1">
                    ({trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left)
                  </span>
                )}
              </p>
            </div>
          </>
        )}
        {subscription.status !== 'trial' && (
          <div className="col-span-2">
            <p className="text-slate-500">
              {subscription.status === 'expired' || subscription.status === 'past_due'
                ? 'Period Ended'
                : 'Current Period'}
            </p>
            <p className="text-slate-900">
              {format(new Date(subscription.currentPeriodStart), 'MMM d')} -{' '}
              {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
            </p>
          </div>
        )}
        <div>
          <p className="text-slate-500">Grace Period</p>
          <p className="text-slate-900">{subscription.gracePeriodDaysGranted} days</p>
        </div>

        {/* Grace Period End Date */}
        {gracePeriodEndDate &&
          (subscription.status === 'expired' || subscription.status === 'past_due') && (
            <div>
              <p className="text-slate-500">Grace Ends</p>
              <p className="text-amber-700 font-medium">
                {format(gracePeriodEndDate, 'MMM d, yyyy')}
                {gracePeriodDaysRemaining !== null && gracePeriodDaysRemaining > 0 && (
                  <span className="text-xs ml-1">
                    ({gracePeriodDaysRemaining} day{gracePeriodDaysRemaining !== 1 ? 's' : ''})
                  </span>
                )}
              </p>
            </div>
          )}
      </div>

      {subscription.cancelAtPeriodEnd && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          Cancels at period end
        </div>
      )}

      {subscription.discountReason && (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-800">
          <Percent className="h-3 w-3 inline mr-1" />
          Discount: {subscription.discountReason}
        </div>
      )}

      <div className="flex gap-2">
        {canCancel && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => onCancel(subscription.branchId)}
            className="text-red-600 border-red-200 hover:bg-red-50"
          >
            Cancel
          </Button>
        )}
        {canReactivate && (
          <Button
            size="sm"
            onClick={() => onReactivate(subscription.branchId)}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            Reactivate
          </Button>
        )}
      </div>
    </div>
  );
}
