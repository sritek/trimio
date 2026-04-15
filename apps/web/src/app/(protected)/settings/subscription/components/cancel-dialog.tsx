'use client';

/**
 * CancelDialog - Confirm subscription cancellation
 */

import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

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
import { Switch } from '@/components/ui/switch';
import type { CancelSubscriptionInput } from '@/hooks/queries/use-subscriptions';

interface CancelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchName: string;
  onConfirm: (data: CancelSubscriptionInput) => Promise<void>;
  isLoading: boolean;
}

export function CancelDialog({
  open,
  onOpenChange,
  branchName,
  onConfirm,
  isLoading,
}: CancelDialogProps) {
  const [reason, setReason] = useState('');
  const [cancelImmediately, setCancelImmediately] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onConfirm({ reason, cancelImmediately });
    setReason('');
    setCancelImmediately(false);
  };

  const isValid = reason.length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            Cancel the subscription for <span className="font-medium">{branchName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="reason">Reason for cancellation</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please tell us why you're cancelling (min 10 characters)"
              rows={3}
            />
            {reason.length > 0 && reason.length < 10 && (
              <p className="text-xs text-destructive">
                Reason must be at least 10 characters ({reason.length}/10)
              </p>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div>
              <Label className="text-destructive">Cancel Immediately</Label>
              <p className="text-xs text-muted-foreground">
                If disabled, subscription will cancel at period end
              </p>
            </div>
            <Switch checked={cancelImmediately} onCheckedChange={setCancelImmediately} />
          </div>

          {cancelImmediately && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <AlertTriangle className="h-4 w-4 inline mr-2" />
              Immediate cancellation will restrict access to this branch. You can still export your
              data.
            </div>
          )}

          {!cancelImmediately && (
            <div className="p-3 bg-muted rounded-lg text-sm text-muted-foreground">
              Your subscription will remain active until the end of the current billing period. You
              can continue using all features until then.
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Keep Subscription
            </Button>
            <Button type="submit" variant="destructive" disabled={isLoading || !isValid}>
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Subscription'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
