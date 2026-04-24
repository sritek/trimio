/**
 * ChangeStatusDialog - Admin dialog to manually change subscription status
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { BranchSubscription } from '../types';

interface ChangeStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: BranchSubscription | null;
  onSubmit: (data: { status: string; reason?: string }) => Promise<void>;
  isLoading: boolean;
}

const STATUS_OPTIONS = [
  { value: 'trial', label: 'Trial', description: 'Subscription is in trial period' },
  { value: 'active', label: 'Active', description: 'Subscription is active and paid' },
  { value: 'past_due', label: 'Past Due', description: 'Payment is overdue' },
  { value: 'expired', label: 'Expired', description: 'Trial or subscription has expired' },
  { value: 'suspended', label: 'Suspended', description: 'Access is blocked' },
  { value: 'cancelled', label: 'Cancelled', description: 'Subscription is cancelled' },
];

export function ChangeStatusDialog({
  open,
  onOpenChange,
  subscription,
  onSubmit,
  isLoading,
}: ChangeStatusDialogProps) {
  const [status, setStatus] = useState<string>('');
  const [reason, setReason] = useState('');

  const handleSubmit = async () => {
    if (!status) return;
    await onSubmit({ status, reason: reason.trim() || undefined });
    setStatus('');
    setReason('');
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setStatus('');
      setReason('');
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Change Subscription Status</DialogTitle>
          <DialogDescription>
            Manually change the status for {subscription?.branchName || 'this branch'}.
            <br />
            <span className="text-amber-600">
              Current status: <strong>{subscription?.status}</strong>
            </span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="status">New Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Select new status" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.filter((opt) => opt.value !== subscription?.status).map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    <div>
                      <span className="font-medium">{opt.label}</span>
                      <span className="text-xs text-muted-foreground ml-2">{opt.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason (optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Enter reason for status change..."
              rows={3}
            />
            <p className="text-xs text-muted-foreground">
              This will be recorded in the subscription history.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!status || isLoading}>
            {isLoading ? 'Updating...' : 'Update Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
