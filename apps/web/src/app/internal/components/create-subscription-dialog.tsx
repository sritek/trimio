/**
 * CreateSubscriptionDialog - Dialog to create a subscription for a branch
 */

'use client';

import { useState, useEffect, useMemo } from 'react';

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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Loader2 } from 'lucide-react';

import type { Branch, SubscriptionPlan, CreateSubscriptionFormData } from '../types';

interface CreateSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branches: Branch[];
  plans: SubscriptionPlan[];
  onSubmit: (data: CreateSubscriptionFormData) => Promise<void>;
  isLoading: boolean;
}

export function CreateSubscriptionDialog({
  open,
  onOpenChange,
  branches,
  plans,
  onSubmit,
  isLoading,
}: CreateSubscriptionDialogProps) {
  const [formData, setFormData] = useState<CreateSubscriptionFormData>({
    branchId: '',
    planId: '',
    billingCycle: 'monthly',
    startTrial: true,
    discountPercentage: 0,
    discountReason: '',
  });

  // Filter branches that don't have subscriptions - memoize to prevent infinite loop
  const availableBranches = useMemo(
    () => branches.filter((b) => !b.subscriptionStatus || b.subscriptionStatus === 'none'),
    [branches]
  );

  // Reset form when dialog opens - only depend on `open`
  useEffect(() => {
    if (open) {
      setFormData({
        branchId:
          branches.find((b) => !b.subscriptionStatus || b.subscriptionStatus === 'none')?.id || '',
        planId: plans[0]?.id || '',
        billingCycle: 'monthly',
        startTrial: true,
        discountPercentage: 0,
        discountReason: '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedPlan = plans.find((p) => p.id === formData.planId);
  const basePrice =
    formData.billingCycle === 'monthly'
      ? selectedPlan?.monthlyPrice || 0
      : selectedPlan?.annualPrice || 0;
  // Round discount and final price to nearest rupee for clean billing
  const discountAmount = Math.round((basePrice * formData.discountPercentage) / 100);
  const finalPrice = basePrice - discountAmount;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create Subscription</DialogTitle>
          <DialogDescription>Assign a subscription plan to a branch</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Branch Selection */}
          <div className="space-y-2">
            <Label>Branch</Label>
            {availableBranches.length === 0 ? (
              <p className="text-sm text-slate-500">All branches already have subscriptions</p>
            ) : (
              <Select
                value={formData.branchId}
                onValueChange={(value) => setFormData({ ...formData, branchId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a branch" />
                </SelectTrigger>
                <SelectContent>
                  {availableBranches.map((branch) => (
                    <SelectItem key={branch.id} value={branch.id}>
                      {branch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Plan Selection */}
          <div className="space-y-2">
            <Label>Plan</Label>
            <Select
              value={formData.planId}
              onValueChange={(value) => setFormData({ ...formData, planId: value })}
            >
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
              value={formData.billingCycle}
              onValueChange={(value: 'monthly' | 'annual') =>
                setFormData({ ...formData, billingCycle: value })
              }
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

          {/* Start Trial Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50">
            <div>
              <Label>Start with Trial</Label>
              <p className="text-xs text-slate-500">
                {selectedPlan?.trialDays || 14} days free trial
              </p>
            </div>
            <Switch
              checked={formData.startTrial}
              onCheckedChange={(checked) => setFormData({ ...formData, startTrial: checked })}
            />
          </div>

          {/* Discount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Discount %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={formData.discountPercentage === 0 ? '' : formData.discountPercentage}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setFormData({ ...formData, discountPercentage: 0 });
                  } else {
                    const numValue = parseInt(value, 10);
                    if (!isNaN(numValue)) {
                      setFormData({
                        ...formData,
                        discountPercentage: Math.min(100, Math.max(0, numValue)),
                      });
                    }
                  }
                }}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label>Discount Reason</Label>
              <Input
                value={formData.discountReason}
                onChange={(e) => setFormData({ ...formData, discountReason: e.target.value })}
                placeholder="e.g., Early adopter"
              />
            </div>
          </div>

          {/* Price Summary */}
          {selectedPlan && (
            <div className="p-3 bg-slate-100 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Base Price</span>
                <span>₹{basePrice.toLocaleString('en-IN')}</span>
              </div>
              {formData.discountPercentage > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount ({formData.discountPercentage}%)</span>
                  <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-1 border-t border-slate-200">
                <span>Total per {formData.billingCycle === 'monthly' ? 'month' : 'year'}</span>
                <span>₹{finalPrice.toLocaleString('en-IN')}</span>
              </div>
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
            <Button
              type="submit"
              disabled={isLoading || !formData.branchId || !formData.planId}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Subscription'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
