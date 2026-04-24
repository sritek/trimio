'use client';

/**
 * ChangePlanDialog - Upgrade or downgrade subscription plan
 */

import { useState, useEffect } from 'react';
import { ArrowUpRight, Loader2, TrendingUp, TrendingDown } from 'lucide-react';

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
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import type {
  BranchSubscription,
  SubscriptionPlan,
  ChangePlanInput,
} from '@/hooks/queries/use-subscriptions';

interface ChangePlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: BranchSubscription | null;
  plans: SubscriptionPlan[];
  onConfirm: (data: ChangePlanInput) => Promise<void>;
  isLoading: boolean;
}

const tierOrder: Record<string, number> = {
  basic: 1,
  professional: 2,
  enterprise: 3,
};

export function ChangePlanDialog({
  open,
  onOpenChange,
  subscription,
  plans,
  onConfirm,
  isLoading,
}: ChangePlanDialogProps) {
  const [newPlanId, setNewPlanId] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [effectiveImmediately, setEffectiveImmediately] = useState(false);

  useEffect(() => {
    if (open && subscription) {
      setNewPlanId('');
      setBillingCycle(subscription.billingCycle);
      setEffectiveImmediately(false);
    }
  }, [open, subscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm({ newPlanId, billingCycle, effectiveImmediately });
  };

  if (!subscription) return null;

  const currentPlan = subscription.plan;
  const selectedPlan = plans.find((p) => p.id === newPlanId);
  const availablePlans = plans.filter(
    (p) => p.isActive && p.isPublic && p.id !== subscription.planId
  );

  const isUpgrade = selectedPlan
    ? tierOrder[selectedPlan.tier] > tierOrder[currentPlan.tier]
    : false;
  const isDowngrade = selectedPlan
    ? tierOrder[selectedPlan.tier] < tierOrder[currentPlan.tier]
    : false;

  const newPrice = selectedPlan
    ? billingCycle === 'monthly'
      ? selectedPlan.monthlyPrice
      : selectedPlan.annualPrice
    : 0;

  const currentPrice =
    subscription.billingCycle === 'monthly' ? currentPlan.monthlyPrice : currentPlan.annualPrice;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5" />
            Change Plan
          </DialogTitle>
          <DialogDescription>
            Change the subscription plan for{' '}
            <span className="font-medium">{subscription.branchName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Plan */}
          <div className="p-3 bg-muted rounded-lg">
            <p className="text-sm text-muted-foreground">Current Plan</p>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{currentPlan.name}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {subscription.billingCycle} billing
                </p>
              </div>
              <p className="font-medium">
                ₹{currentPrice.toLocaleString('en-IN')}
                <span className="text-muted-foreground font-normal">
                  /{subscription.billingCycle === 'monthly' ? 'mo' : 'yr'}
                </span>
              </p>
            </div>
          </div>

          {/* New Plan Selection */}
          <div className="space-y-2">
            <Label>New Plan</Label>
            <Select value={newPlanId} onValueChange={setNewPlanId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a new plan" />
              </SelectTrigger>
              <SelectContent>
                {availablePlans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    <div className="flex items-center gap-2">
                      {plan.name}
                      {tierOrder[plan.tier] > tierOrder[currentPlan.tier] && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 text-xs">
                          Upgrade
                        </Badge>
                      )}
                      {tierOrder[plan.tier] < tierOrder[currentPlan.tier] && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 text-xs">
                          Downgrade
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Billing Cycle */}
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

          {/* Effective Immediately Toggle */}
          {selectedPlan && (
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted">
              <div>
                <Label>Apply Immediately</Label>
                <p className="text-xs text-muted-foreground">
                  Start new plan now instead of at next billing cycle
                </p>
              </div>
              <Switch checked={effectiveImmediately} onCheckedChange={setEffectiveImmediately} />
            </div>
          )}

          {/* Price Comparison */}
          {selectedPlan && (
            <div
              className={`p-3 rounded-lg border ${
                isUpgrade
                  ? 'bg-green-50 border-green-200'
                  : isDowngrade
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-muted'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {isUpgrade ? (
                  <>
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Upgrade</span>
                  </>
                ) : isDowngrade ? (
                  <>
                    <TrendingDown className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-700">Downgrade</span>
                  </>
                ) : (
                  <span className="text-sm font-medium">Plan Change</span>
                )}
              </div>
              <div className="flex justify-between text-sm">
                <span>New Price</span>
                <span className="font-medium">
                  ₹{newPrice.toLocaleString('en-IN')}/{billingCycle === 'monthly' ? 'mo' : 'yr'}
                </span>
              </div>
            </div>
          )}

          {effectiveImmediately && selectedPlan && (
            <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
              Your new plan will start immediately. A prorated charge or credit may apply.
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !newPlanId}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Changing...
                </>
              ) : (
                'Change Plan'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
