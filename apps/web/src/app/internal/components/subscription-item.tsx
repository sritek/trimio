/**
 * SubscriptionItem - Display single branch subscription details
 */

'use client';

import { format } from 'date-fns';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { BranchSubscription } from '../types';

interface SubscriptionItemProps {
  subscription: BranchSubscription;
  onCancel: (branchId: string) => void;
  onReactivate: (branchId: string) => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  trial: {
    label: 'Trial',
    color: 'border-blue-300 text-blue-700 bg-blue-50',
    icon: Clock,
  },
  active: {
    label: 'Active',
    color: 'border-green-300 text-green-700 bg-green-50',
    icon: CheckCircle,
  },
  past_due: {
    label: 'Past Due',
    color: 'border-yellow-300 text-yellow-700 bg-yellow-50',
    icon: AlertCircle,
  },
  suspended: {
    label: 'Suspended',
    color: 'border-red-300 text-red-700 bg-red-50',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'border-slate-300 text-slate-500 bg-slate-50',
    icon: XCircle,
  },
  expired: {
    label: 'Expired',
    color: 'border-slate-300 text-slate-500 bg-slate-50',
    icon: XCircle,
  },
};

export function SubscriptionItem({ subscription, onCancel, onReactivate }: SubscriptionItemProps) {
  const config = statusConfig[subscription.status] || statusConfig.active;
  const StatusIcon = config.icon;

  const canCancel = ['trial', 'active', 'past_due'].includes(subscription.status);
  const canReactivate = ['suspended', 'cancelled', 'expired'].includes(subscription.status);

  return (
    <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-slate-900 font-medium">{subscription.branchName}</p>
          <p className="text-sm text-slate-500">{subscription.plan.name}</p>
        </div>
        <Badge variant="outline" className={config.color}>
          <StatusIcon className="h-3 w-3 mr-1" />
          {config.label}
        </Badge>
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
          <div className="col-span-2">
            <p className="text-slate-500">Trial Ends</p>
            <p className="text-slate-900">
              {format(new Date(subscription.trialEndDate), 'MMM d, yyyy')}
            </p>
          </div>
        )}
        {subscription.status !== 'trial' && (
          <div className="col-span-2">
            <p className="text-slate-500">Current Period</p>
            <p className="text-slate-900">
              {format(new Date(subscription.currentPeriodStart), 'MMM d')} -{' '}
              {format(new Date(subscription.currentPeriodEnd), 'MMM d, yyyy')}
            </p>
          </div>
        )}
      </div>

      {subscription.cancelAtPeriodEnd && (
        <div className="mb-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          Cancels at period end
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
