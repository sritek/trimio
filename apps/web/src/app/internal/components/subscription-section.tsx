/**
 * SubscriptionSection - Manage branch subscriptions for a tenant
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { CreditCard, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAdminStore } from '@/stores/admin-store';

import { SubscriptionItem } from './subscription-item';
import { CreateSubscriptionDialog } from './create-subscription-dialog';
import { CancelSubscriptionDialog } from './cancel-subscription-dialog';
import { ReactivateSubscriptionDialog } from './reactivate-subscription-dialog';
import { useInternalApi } from '../hooks';
import type {
  Branch,
  SubscriptionPlan,
  SubscriptionBillingOverview,
  CreateSubscriptionFormData,
} from '../types';

interface SubscriptionSectionProps {
  tenantId: string;
  branches: Branch[];
  onRefresh: () => void;
}

export function SubscriptionSection({ tenantId, branches, onRefresh }: SubscriptionSectionProps) {
  const { accessToken } = useAdminStore();
  const api = useInternalApi();

  // State
  const [billingOverview, setBillingOverview] = useState<SubscriptionBillingOverview | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateLoading, setIsCreateLoading] = useState(false);

  const [cancelBranchId, setCancelBranchId] = useState<string | null>(null);
  const [isCancelLoading, setIsCancelLoading] = useState(false);

  const [reactivateBranchId, setReactivateBranchId] = useState<string | null>(null);
  const [isReactivateLoading, setIsReactivateLoading] = useState(false);

  // Fetch billing overview and plans
  const fetchData = useCallback(async () => {
    if (!accessToken) return;

    setIsLoading(true);
    try {
      const [overview, plansList] = await Promise.all([
        api.getBillingOverview(tenantId),
        api.listPlans(),
      ]);
      setBillingOverview(overview);
      setPlans(plansList);
    } catch (error) {
      if (error instanceof Error && error.message === 'Session expired') {
        return;
      }
      console.error('Failed to fetch subscription data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, tenantId, api]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create subscription
  const handleCreateSubscription = async (data: CreateSubscriptionFormData) => {
    setIsCreateLoading(true);
    try {
      await api.createSubscription(tenantId, data);
      toast.success('Subscription created successfully');
      setIsCreateOpen(false);
      fetchData();
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create subscription');
    } finally {
      setIsCreateLoading(false);
    }
  };

  // Cancel subscription
  const handleCancelSubscription = async (data: { reason: string; cancelImmediately: boolean }) => {
    if (!cancelBranchId) return;

    setIsCancelLoading(true);
    try {
      await api.cancelSubscription(tenantId, cancelBranchId, data);
      toast.success('Subscription cancelled');
      setCancelBranchId(null);
      fetchData();
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel subscription');
    } finally {
      setIsCancelLoading(false);
    }
  };

  // Reactivate subscription
  const handleReactivateSubscription = async (data: {
    planId?: string;
    billingCycle?: 'monthly' | 'annual';
  }) => {
    if (!reactivateBranchId) return;

    setIsReactivateLoading(true);
    try {
      await api.reactivateSubscription(tenantId, reactivateBranchId, data);
      toast.success('Subscription reactivated');
      setReactivateBranchId(null);
      fetchData();
      onRefresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to reactivate subscription');
    } finally {
      setIsReactivateLoading(false);
    }
  };

  // Get subscription for cancel/reactivate dialogs
  const cancelSubscription = billingOverview?.subscriptions.find(
    (s) => s.branchId === cancelBranchId
  );
  const reactivateSubscription = billingOverview?.subscriptions.find(
    (s) => s.branchId === reactivateBranchId
  );

  // Check if there are branches without subscriptions
  const branchesWithoutSubscription = branches.filter(
    (b) => !billingOverview?.subscriptions.some((s) => s.branchId === b.id)
  );

  return (
    <>
      <Card className="bg-white border-slate-200 shadow-sm mt-6">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-slate-900 flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            Subscriptions
          </CardTitle>
          {branchesWithoutSubscription.length > 0 && (
            <Button
              size="sm"
              onClick={() => setIsCreateOpen(true)}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              <Plus className="h-4 w-4 mr-1" />
              Add Subscription
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-24 bg-slate-100 rounded" />
              <div className="h-24 bg-slate-100 rounded" />
            </div>
          ) : billingOverview?.subscriptions.length === 0 ? (
            <div className="text-center py-8">
              <CreditCard className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 mb-4">No subscriptions yet</p>
              {branches.length > 0 && (
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Subscription
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Summary */}
              {billingOverview && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-lg mb-4">
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Active</p>
                    <p className="text-xl font-semibold text-green-600">
                      {billingOverview.summary.activeSubscriptions}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Trial</p>
                    <p className="text-xl font-semibold text-blue-600">
                      {billingOverview.summary.trialSubscriptions}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">Past Due</p>
                    <p className="text-xl font-semibold text-yellow-600">
                      {billingOverview.summary.pastDueSubscriptions}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 uppercase">MRR</p>
                    <p className="text-xl font-semibold text-slate-900">
                      ₹{billingOverview.summary.monthlyRecurring.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
              )}

              {/* Subscription List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {billingOverview?.subscriptions.map((subscription) => (
                  <SubscriptionItem
                    key={subscription.id}
                    subscription={subscription}
                    onCancel={setCancelBranchId}
                    onReactivate={setReactivateBranchId}
                  />
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Subscription Dialog */}
      <CreateSubscriptionDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        branches={branchesWithoutSubscription}
        plans={plans}
        onSubmit={handleCreateSubscription}
        isLoading={isCreateLoading}
      />

      {/* Cancel Subscription Dialog */}
      <CancelSubscriptionDialog
        open={!!cancelBranchId}
        onOpenChange={(open) => !open && setCancelBranchId(null)}
        branchName={cancelSubscription?.branchName || ''}
        onSubmit={handleCancelSubscription}
        isLoading={isCancelLoading}
      />

      {/* Reactivate Subscription Dialog */}
      <ReactivateSubscriptionDialog
        open={!!reactivateBranchId}
        onOpenChange={(open) => !open && setReactivateBranchId(null)}
        subscription={reactivateSubscription || null}
        plans={plans}
        onSubmit={handleReactivateSubscription}
        isLoading={isReactivateLoading}
      />
    </>
  );
}
