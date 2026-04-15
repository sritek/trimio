'use client';

/**
 * Subscription Settings Page
 * View and manage branch subscriptions (super_owner only)
 */

import { useState, useCallback } from 'react';
import { CreditCard, Building2, TrendingUp, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useBillingOverview,
  useSubscriptionPlans,
  useCancelSubscription,
  useReactivateSubscription,
  useChangePlan,
  type BranchSubscription,
  type CancelSubscriptionInput,
  type ReactivateSubscriptionInput,
  type ChangePlanInput,
} from '@/hooks/queries/use-subscriptions';

import { SubscriptionCard } from './components/subscription-card';
import { PlanComparisonCard } from './components/plan-comparison-card';
import { CancelDialog } from './components/cancel-dialog';
import { ReactivateDialog } from './components/reactivate-dialog';
import { ChangePlanDialog } from './components/change-plan-dialog';

export default function SubscriptionPage() {
  const { data: billingOverview, isLoading: isLoadingBilling } = useBillingOverview();
  const { data: plans, isLoading: isLoadingPlans } = useSubscriptionPlans();

  const cancelMutation = useCancelSubscription();
  const reactivateMutation = useReactivateSubscription();
  const changePlanMutation = useChangePlan();

  // Dialog states
  const [cancelSubscription, setCancelSubscription] = useState<BranchSubscription | null>(null);
  const [reactivateSubscription, setReactivateSubscription] = useState<BranchSubscription | null>(
    null
  );
  const [changePlanSubscription, setChangePlanSubscription] = useState<BranchSubscription | null>(
    null
  );

  // Handlers
  const handleCancel = useCallback(
    async (data: CancelSubscriptionInput) => {
      if (!cancelSubscription) return;
      try {
        await cancelMutation.mutateAsync({ branchId: cancelSubscription.branchId, data });
        toast.success('Subscription cancelled');
        setCancelSubscription(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to cancel subscription');
      }
    },
    [cancelSubscription, cancelMutation]
  );

  const handleReactivate = useCallback(
    async (data: ReactivateSubscriptionInput) => {
      if (!reactivateSubscription) return;
      try {
        await reactivateMutation.mutateAsync({ branchId: reactivateSubscription.branchId, data });
        toast.success('Subscription reactivated');
        setReactivateSubscription(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to reactivate subscription');
      }
    },
    [reactivateSubscription, reactivateMutation]
  );

  const handleChangePlan = useCallback(
    async (data: ChangePlanInput) => {
      if (!changePlanSubscription) return;
      try {
        await changePlanMutation.mutateAsync({ branchId: changePlanSubscription.branchId, data });
        toast.success('Plan changed successfully');
        setChangePlanSubscription(null);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Failed to change plan');
      }
    },
    [changePlanSubscription, changePlanMutation]
  );

  const isLoading = isLoadingBilling || isLoadingPlans;

  if (isLoading) {
    return <SubscriptionSkeleton />;
  }

  const subscriptions = billingOverview?.subscriptions || [];
  const summary = billingOverview?.summary;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Building2 className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-semibold">{summary.activeSubscriptions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trial</p>
                  <p className="text-2xl font-semibold">{summary.trialSubscriptions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Past Due</p>
                  <p className="text-2xl font-semibold">{summary.pastDueSubscriptions}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Monthly Recurring</p>
                  <p className="text-2xl font-semibold">
                    ₹{summary.monthlyRecurring.toLocaleString('en-IN')}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Branch Subscriptions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Branch Subscriptions
          </CardTitle>
          <CardDescription>Manage subscriptions for each of your branches</CardDescription>
        </CardHeader>
        <CardContent>
          {subscriptions.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
              <p className="text-muted-foreground">No subscriptions found</p>
              <p className="text-sm text-muted-foreground">
                Contact support to set up subscriptions for your branches
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {subscriptions.map((subscription) => (
                <SubscriptionCard
                  key={subscription.id}
                  subscription={subscription}
                  onCancel={() => setCancelSubscription(subscription)}
                  onReactivate={() => setReactivateSubscription(subscription)}
                  onChangePlan={() => setChangePlanSubscription(subscription)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Comparison */}
      {plans && plans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Available Plans</CardTitle>
            <CardDescription>Compare features across different subscription tiers</CardDescription>
          </CardHeader>
          <CardContent>
            <PlanComparisonCard plans={plans} />
          </CardContent>
        </Card>
      )}

      {/* Cancel Dialog */}
      <CancelDialog
        open={!!cancelSubscription}
        onOpenChange={(open) => !open && setCancelSubscription(null)}
        branchName={cancelSubscription?.branchName || ''}
        onConfirm={handleCancel}
        isLoading={cancelMutation.isPending}
      />

      {/* Reactivate Dialog */}
      <ReactivateDialog
        open={!!reactivateSubscription}
        onOpenChange={(open) => !open && setReactivateSubscription(null)}
        subscription={reactivateSubscription}
        plans={plans || []}
        onConfirm={handleReactivate}
        isLoading={reactivateMutation.isPending}
      />

      {/* Change Plan Dialog */}
      <ChangePlanDialog
        open={!!changePlanSubscription}
        onOpenChange={(open) => !open && setChangePlanSubscription(null)}
        subscription={changePlanSubscription}
        plans={plans || []}
        onConfirm={handleChangePlan}
        isLoading={changePlanMutation.isPending}
      />
    </div>
  );
}

function SubscriptionSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
