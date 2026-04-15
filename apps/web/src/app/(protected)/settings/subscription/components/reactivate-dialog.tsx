'use client';

/**
 * ReactivateDialog - Reactivate a cancelled/suspended subscription
 */

import { useState, useEffect } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type {
  BranchSubscription,
  SubscriptionPlan,
  ReactivateSubscriptionInput,
} from '@/hooks/queries/use-subscriptions';

interface ReactivateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: BranchSubscription | null;
  plans: SubscriptionPlan[];
  onConfirm: (data: ReactivateSubscriptionInput) => Promise<void>;
  isLoading: boolean;
}

export function ReactivateDialog({
  open,
  onOpenChange,
  subscription,
  plans,
  onConfirm,
  isLoading,
}: ReactivateDialogProps) {
  const [planId, setPlanId] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [changePlan, setChangePlan] = useState(false);

  useEffect(() => {
    if (open && subscription) {
      setPlanId(subscription.planId);
      setBillingCycle(subscription.billingCycle);
      setChangePlan(false);
    }
  }, [open, subscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (changePlan) {
      await onConfirm({ planId, billingCycle });
    } else {
      await onConfirm({});
    }
  };

  const selectedPlan = plans.find((p) => p.id === planId);
  const price =
    billingCycle === 'monthly' ? selectedPlan?.monthlyPrice || 0 : selectedPlan?.annualPrice || 0;

  if (!subscription) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <RefreshCw className="h-5 w-5" />
            Reactivate Subscription
          </DialogTitle>
          <DialogDescription>
            Reactivate the subscription for{' '}
            <span className="font-medium">{subscription.branchName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Previous Plan</p>
            <p className="font-medium">{subscription.plan.name}</p>
            <p className="text-sm text-muted-foreground capitalize">
              {subscription.billingCycle} billing
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="changePlan"
              checked={changePlan}
              onChange={(e) => setChangePlan(e.target.checked)}
              className="rounded border-input"
            />
            <Label htmlFor="changePlan" className="cursor-pointer">
              Change plan on reactivation
            </Label>
          </div>

          {changePlan && (
            <>
              <div className="space-y-2">
                <Label>New Plan</Label>
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans
                      .filter((p) => p.isActive && p.isPublic)
                      .map((plan) => (
                        <SelectItem key={plan.id} value={plan.id}>
                          {plan.name} - ₹{plan.monthlyPrice.toLocaleString('en-IN')}/mo
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Billing Cycle</Label>
                <Select
                  value={billingCycle}
                  onValueChange={(value: 'monthly' | 'annual') => setBillingCycle(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="annual">Annual (Save ~17%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {selectedPlan && (
                <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-700">New Price</span>
                    <span className="font-medium text-green-800">
                      ₹{price.toLocaleString('en-IN')}/{billingCycle === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>
                </div>
              )}
            </>
          )}

          <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
            A new billing period will start immediately upon reactivation.
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reactivating...
                </>
              ) : (
                'Reactivate'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
