'use client';

/**
 * Subscription Settings Page
 * View subscription details (super_owner only)
 * Plan changes and cancellations are handled by contacting support
 */

import { CreditCard, Building2, TrendingUp, AlertCircle } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useBillingOverview, useSubscriptionPlans } from '@/hooks/queries/use-subscriptions';

import { SubscriptionCard } from './components/subscription-card';
import { PlanComparisonCard } from './components/plan-comparison-card';
import { CurrentPlanCard } from './components/current-plan-card';

export default function SubscriptionPage() {
  const { data: billingOverview, isLoading: isLoadingBilling } = useBillingOverview();
  const { data: plans, isLoading: isLoadingPlans } = useSubscriptionPlans();

  const isLoading = isLoadingBilling || isLoadingPlans;

  if (isLoading) {
    return <SubscriptionSkeleton />;
  }

  const subscriptions = billingOverview?.subscriptions || [];
  const summary = billingOverview?.summary;

  return (
    <div className="space-y-6">
      {/* Current Plan Card - Shows feature access for current branch */}
      <CurrentPlanCard />

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
          <CardDescription>View subscriptions for each of your branches</CardDescription>
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
                <SubscriptionCard key={subscription.id} subscription={subscription} />
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
    </div>
  );
}

function SubscriptionSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-48" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
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
