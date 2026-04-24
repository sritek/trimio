/**
 * ApplyDiscountDialog - Admin dialog to apply or update discount
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { BranchSubscription } from '../types';

interface ApplyDiscountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: BranchSubscription | null;
  onSubmit: (data: { discountPercentage: number; discountReason?: string }) => Promise<void>;
  isLoading: boolean;
}

export function ApplyDiscountDialog({
  open,
  onOpenChange,
  subscription,
  onSubmit,
  isLoading,
}: ApplyDiscountDialogProps) {
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState('');
  const [error, setError] = useState('');

  // Initialize with current discount when dialog opens
  useEffect(() => {
    if (open && subscription) {
      setDiscountPercentage(subscription.discountPercentage || 0);
      setDiscountReason(subscription.discountReason || '');
    }
  }, [open, subscription]);

  const handleSubmit = async () => {
    if (discountPercentage < 0 || discountPercentage > 100) {
      setError('Discount must be between 0 and 100%');
      return;
    }
    setError('');
    await onSubmit({
      discountPercentage,
      discountReason: discountReason.trim() || undefined,
    });
    setDiscountPercentage(0);
    setDiscountReason('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setDiscountPercentage(0);
      setDiscountReason('');
      setError('');
    }
    onOpenChange(open);
  };

  // Calculate new price preview
  const basePrice = subscription?.plan
    ? subscription.billingCycle === 'monthly'
      ? subscription.plan.monthlyPrice
      : subscription.plan.annualPrice
    : 0;
  const newPrice = Math.round(basePrice * (1 - discountPercentage / 100));

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply Discount</DialogTitle>
          <DialogDescription>
            Apply or update discount for {subscription?.branchName || 'this branch'}.
            {subscription?.discountPercentage ? (
              <>
                <br />
                <span className="text-green-600">
                  Current discount: <strong>{subscription.discountPercentage}%</strong>
                </span>
              </>
            ) : null}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="discount">Discount Percentage</Label>
            <div className="flex items-center gap-2">
              <Input
                id="discount"
                type="number"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(parseFloat(e.target.value) || 0)}
                min={0}
                max={100}
                step={1}
                className="w-24"
              />
              <span className="text-muted-foreground">%</span>
            </div>
            <p className="text-xs text-muted-foreground">Enter 0 to remove discount.</p>
          </div>

          {/* Price Preview */}
          {subscription && (
            <div className="p-3 bg-slate-50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Price Preview</p>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold">₹{newPrice.toLocaleString('en-IN')}</span>
                <span className="text-sm text-muted-foreground">
                  /{subscription.billingCycle === 'monthly' ? 'month' : 'year'}
                </span>
                {discountPercentage > 0 && (
                  <span className="text-sm text-green-600">
                    (was ₹{basePrice.toLocaleString('en-IN')})
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={discountReason}
              onChange={(e) => setDiscountReason(e.target.value)}
              placeholder="e.g., Early adopter discount, Loyalty reward..."
              rows={2}
            />
            <p className="text-xs text-muted-foreground">
              This will be shown on the subscription card.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Applying...' : 'Apply Discount'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
