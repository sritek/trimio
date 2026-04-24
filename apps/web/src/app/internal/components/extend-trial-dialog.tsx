/**
 * ExtendTrialDialog - Admin dialog to extend trial period
 */

'use client';

import { useState } from 'react';

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

interface ExtendTrialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: BranchSubscription | null;
  onSubmit: (data: { additionalDays: number; reason: string }) => Promise<void>;
  isLoading: boolean;
}

export function ExtendTrialDialog({
  open,
  onOpenChange,
  subscription,
  onSubmit,
  isLoading,
}: ExtendTrialDialogProps) {
  const [additionalDays, setAdditionalDays] = useState<string>('7');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  const daysValue = parseInt(additionalDays) || 0;

  const handleSubmit = async () => {
    if (!daysValue || daysValue < 1) {
      setError('Please enter at least 1 day');
      return;
    }
    if (!reason.trim() || reason.trim().length < 5) {
      setError('Please provide a reason (at least 5 characters)');
      return;
    }
    setError('');
    await onSubmit({ additionalDays: daysValue, reason: reason.trim() });
    setAdditionalDays('7');
    setReason('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setAdditionalDays('7');
      setReason('');
      setError('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Extend Trial Period</DialogTitle>
          <DialogDescription>
            Extend the trial period for {subscription?.branchName || 'this branch'}.
            {subscription?.trialEndDate && (
              <>
                <br />
                <span className="text-blue-600">
                  Current trial ends:{' '}
                  <strong>{new Date(subscription.trialEndDate).toLocaleDateString()}</strong>
                </span>
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="days">Additional Days</Label>
            <Input
              id="days"
              type="number"
              value={additionalDays}
              onChange={(e) => setAdditionalDays(e.target.value)}
              min={1}
              max={90}
              placeholder="7"
            />
            <p className="text-xs text-muted-foreground">
              Enter the number of days to add to the trial (1-90 days).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">
              Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Customer requested more time to evaluate..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This will be recorded in the subscription history.
            </p>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? 'Extending...' : `Extend by ${daysValue} Days`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
