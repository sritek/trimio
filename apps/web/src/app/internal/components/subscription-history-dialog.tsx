/**
 * SubscriptionHistoryDialog - View subscription history
 */

'use client';

import { format } from 'date-fns';
import {
  History,
  ArrowRight,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RefreshCw,
  Percent,
  CalendarPlus,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { BranchSubscription, SubscriptionHistory } from '../types';

interface SubscriptionHistoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subscription: BranchSubscription | null;
  history: SubscriptionHistory[];
  isLoading: boolean;
}

const EVENT_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  created: {
    label: 'Created',
    icon: CheckCircle,
    color: 'text-green-600 bg-green-50',
  },
  activated: {
    label: 'Activated',
    icon: CheckCircle,
    color: 'text-green-600 bg-green-50',
  },
  upgraded: {
    label: 'Upgraded',
    icon: ArrowRight,
    color: 'text-blue-600 bg-blue-50',
  },
  downgraded: {
    label: 'Downgraded',
    icon: ArrowRight,
    color: 'text-amber-600 bg-amber-50',
  },
  cancelled: {
    label: 'Cancelled',
    icon: XCircle,
    color: 'text-red-600 bg-red-50',
  },
  reactivated: {
    label: 'Reactivated',
    icon: RefreshCw,
    color: 'text-green-600 bg-green-50',
  },
  expired: {
    label: 'Expired',
    icon: Clock,
    color: 'text-slate-600 bg-slate-50',
  },
  suspended: {
    label: 'Suspended',
    icon: AlertCircle,
    color: 'text-red-600 bg-red-50',
  },
  status_changed: {
    label: 'Status Changed',
    icon: RefreshCw,
    color: 'text-purple-600 bg-purple-50',
  },
  trial_extended: {
    label: 'Trial Extended',
    icon: CalendarPlus,
    color: 'text-blue-600 bg-blue-50',
  },
  discount_applied: {
    label: 'Discount Applied',
    icon: Percent,
    color: 'text-green-600 bg-green-50',
  },
  renewed: {
    label: 'Renewed',
    icon: RefreshCw,
    color: 'text-green-600 bg-green-50',
  },
};

export function SubscriptionHistoryDialog({
  open,
  onOpenChange,
  subscription,
  history,
  isLoading,
}: SubscriptionHistoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Subscription History
          </DialogTitle>
          <DialogDescription>
            History for {subscription?.branchName || 'this branch'}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[50vh] pr-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-16 bg-slate-100 rounded" />
                </div>
              ))}
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8">
              <History className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-muted-foreground">No history available</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => {
                const config = EVENT_CONFIG[entry.eventType] || {
                  label: entry.eventType,
                  icon: History,
                  color: 'text-slate-600 bg-slate-50',
                };
                const Icon = config.icon;
                const metadata = entry.metadata as Record<string, unknown>;

                return (
                  <div
                    key={entry.id}
                    className="p-3 border rounded-lg bg-white hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium text-sm">{config.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(entry.createdAt), 'MMM d, yyyy h:mm a')}
                          </p>
                        </div>

                        {/* Status change */}
                        {entry.fromStatus && entry.toStatus && (
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">
                              {entry.fromStatus}
                            </Badge>
                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                            <Badge variant="outline" className="text-xs">
                              {entry.toStatus}
                            </Badge>
                          </div>
                        )}

                        {/* Metadata details */}
                        {metadata && Object.keys(metadata).length > 0 && (
                          <div className="mt-2 text-xs text-muted-foreground space-y-1">
                            {typeof metadata.reason === 'string' && metadata.reason && (
                              <p>
                                <span className="font-medium">Reason:</span> {metadata.reason}
                              </p>
                            )}
                            {typeof metadata.additionalDays === 'number' && (
                              <p>
                                <span className="font-medium">Days added:</span>{' '}
                                {metadata.additionalDays}
                              </p>
                            )}
                            {typeof metadata.newDiscount === 'number' && (
                              <p>
                                <span className="font-medium">New discount:</span>{' '}
                                {metadata.newDiscount}%
                              </p>
                            )}
                            {metadata.adminAction === true && (
                              <Badge variant="secondary" className="text-xs mt-1">
                                Admin Action
                              </Badge>
                            )}
                          </div>
                        )}

                        {/* Performed by */}
                        {entry.performedBy && (
                          <p className="text-xs text-muted-foreground mt-1">
                            By:{' '}
                            {entry.performedBy === 'internal-admin' ? 'Admin' : entry.performedBy}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
