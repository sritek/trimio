/**
 * ReactivateSubscriptionDialog - Dialog to reactivate a cancelled/suspended subscription
 */

'use client';

import { useState, useEffect } from 'react';

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
import { Loader2, RefreshCw } from 'lucide-react';

import type { SubscriptionPlan, BranchSubscription } from '../types';

interface ReactivateSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: BranchSubscription | null;
  plans: SubscriptionPlan[];
  onSubmit: (data: { planId?: string; billingCycle?: 'monthly' | 'annual' }) => Promise<void>;
  isLoading: boolean;
}

export function ReactivateSubscriptionDialog({
  open,
  onOpenChange,
  subscription,
  plans,
  onSubmit,
  isLoading,
}: ReactivateSubscriptionDialogProps) {
  const [planId, setPlanId] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [changePlan, setChangePlan] = useState(false);

  // Reset form when dialog opens
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
      await onSubmit({ planId, billingCycle });
    } else {
      await onSubmit({});
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
            Reactivate the subscription for <strong>{subscription.branchName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Plan Info */}
          <div className="p-3 bg-slate-50 rounded-lg">
            <p className="text-sm text-slate-500">Previous Plan</p>
            <p className="font-medium">{subscription.plan.name}</p>
            <p className="text-sm text-slate-600 capitalize">{subscription.billingCycle} billing</p>
          </div>

          {/* Change Plan Option */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="changePlan"
              checked={changePlan}
              onChange={(e) => setChangePlan(e.target.checked)}
              className="rounded border-slate-300"
            />
            <Label htmlFor="changePlan" className="cursor-pointer">
              Change plan on reactivation
            </Label>
          </div>

          {changePlan && (
            <>
              {/* Plan Selection */}
              <div className="space-y-2">
                <Label>New Plan</Label>
                <Select value={planId} onValueChange={setPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - ₹{plan.monthlyPrice.toLocaleString('en-IN')}/mo
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
                    <SelectItem value="annual">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Price Preview */}
              {selectedPlan && (
                <div className="p-3 bg-green-50 border border-green-100 rounded-lg">
                  <div className="flex justify-between">
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
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
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
