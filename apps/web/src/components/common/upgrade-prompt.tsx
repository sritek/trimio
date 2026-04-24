/**
 * UpgradePrompt Component
 * Displays when a user tries to access a feature not available on their plan
 */

'use client';

import { useRouter } from 'next/navigation';
import { Lock, Sparkles, ArrowRight, UserCog } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuthStore } from '@/stores/auth-store';
import {
  FEATURE_DISPLAY_NAMES,
  FEATURE_REQUIRED_PLANS,
  type FeatureKey,
} from '@/hooks/use-feature-access';

interface UpgradePromptProps {
  feature: FeatureKey;
  currentPlan?: string | null;
  variant?: 'full-page' | 'card' | 'inline';
  className?: string;
}

// Roles that can manage subscriptions
const ADMIN_ROLES = ['super_owner'];

export function UpgradePrompt({
  feature,
  currentPlan,
  variant = 'card',
  className = '',
}: UpgradePromptProps) {
  const router = useRouter();
  const { user } = useAuthStore();
  const featureName = FEATURE_DISPLAY_NAMES[feature];
  const requiredPlans = FEATURE_REQUIRED_PLANS[feature];

  const isAdmin = user?.role && ADMIN_ROLES.includes(user.role);

  const handleUpgrade = () => {
    router.push('/settings/subscription');
  };

  if (variant === 'inline') {
    return (
      <div
        className={`flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 ${className}`}
      >
        <Lock className="h-4 w-4 flex-shrink-0" />
        <span className="text-sm">
          {featureName} requires {requiredPlans[0]} plan or higher.
        </span>
        {isAdmin ? (
          <Button
            variant="link"
            size="sm"
            onClick={handleUpgrade}
            className="text-amber-700 hover:text-amber-900 p-0 h-auto"
          >
            Upgrade
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        ) : (
          <span className="text-xs text-amber-600">Contact your administrator.</span>
        )}
      </div>
    );
  }

  if (variant === 'full-page') {
    return (
      <div className={`flex flex-col items-center justify-center min-h-[60vh] p-8 ${className}`}>
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-6">
          <Lock className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {isAdmin ? `Upgrade to Access ${featureName}` : `${featureName} Not Available`}
        </h1>
        <p className="text-slate-600 text-center max-w-md mb-6">
          {featureName} is available on {requiredPlans.join(' and ')} plans.
          {currentPlan && (
            <span className="block mt-1 text-sm">
              You&apos;re currently on the <strong>{currentPlan}</strong> plan.
            </span>
          )}
          {!isAdmin && (
            <span className="block mt-2 text-sm text-slate-500">
              Please contact your administrator to upgrade your subscription.
            </span>
          )}
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            Go Back
          </Button>
          {isAdmin ? (
            <Button onClick={handleUpgrade} className="bg-primary hover:bg-primary/90">
              <Sparkles className="h-4 w-4 mr-2" />
              View Plans
            </Button>
          ) : (
            <Button variant="secondary" disabled>
              <UserCog className="h-4 w-4 mr-2" />
              Admin Access Required
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Default: card variant
  return (
    <Card className={`border-amber-200 bg-amber-50/50 ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <Lock className="h-5 w-5 text-amber-600" />
          </div>
          <div>
            <CardTitle className="text-lg text-slate-900">
              {isAdmin ? 'Upgrade Required' : 'Feature Not Available'}
            </CardTitle>
            <CardDescription>{featureName} is not available on your current plan</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-slate-600 mb-4">
          This feature is available on {requiredPlans.join(' and ')} plans.
          {isAdmin
            ? ` Upgrade your subscription to unlock ${featureName.toLowerCase()} and more.`
            : ' Please contact your administrator to upgrade your subscription.'}
        </p>
        {isAdmin ? (
          <Button onClick={handleUpgrade} size="sm" className="bg-primary hover:bg-primary/90">
            <Sparkles className="h-4 w-4 mr-2" />
            View Upgrade Options
          </Button>
        ) : (
          <Button variant="secondary" size="sm" disabled>
            <UserCog className="h-4 w-4 mr-2" />
            Admin Access Required
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
