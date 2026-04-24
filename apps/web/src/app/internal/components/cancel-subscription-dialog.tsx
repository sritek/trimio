/**
 * CancelSubscriptionDialog - Dialog to cancel a branch subscription
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
import { Switch } from '@/components/ui/switch';
import { Loader2, AlertTriangle } from 'lucide-react';

interface CancelSubscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchName: string;
  onSubmit: (data: { reason: string; cancelImmediately: boolean }) => Promise<void>;
  isLoading: boolean;
}

export function CancelSubscriptionDialog({
  open,
  onOpenChange,
  branchName,
  onSubmit,
  isLoading,
}: CancelSubscriptionDialogProps) {
  const [reason, setReason] = useState('');
  const [cancelImmediately, setCancelImmediately] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit({ reason, cancelImmediately });
    setReason('');
    setCancelImmediately(false);
  };

  const isValid = reason.length >= 10;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            Cancel the subscription for <strong>{branchName}</strong>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Reason */}
          <div className="space-y-2">
            <Label>Cancellation Reason</Label>
            <Textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please provide a reason for cancellation (min 10 characters)"
              rows={3}
            />
            {reason.length > 0 && reason.length < 10 && (
              <p className="text-xs text-red-500">
                Reason must be at least 10 characters ({reason.length}/10)
              </p>
            )}
          </div>

          {/* Cancel Immediately Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-red-50 border border-red-100">
            <div>
              <Label className="text-red-700">Cancel Immediately</Label>
              <p className="text-xs text-red-600">
                If disabled, subscription will cancel at period end
              </p>
            </div>
            <Switch checked={cancelImmediately} onCheckedChange={setCancelImmediately} />
          </div>

          {cancelImmediately && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
              <strong>Warning:</strong> Immediate cancellation will restrict branch access. The
              branch will still be able to export data.
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
