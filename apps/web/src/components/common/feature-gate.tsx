/**
 * FeatureGate Component
 * Conditionally renders children based on feature access
 * Shows upgrade prompt if feature is not available
 */

'use client';

import { useFeatureAccess, type FeatureKey } from '@/hooks/use-feature-access';
import { UpgradePrompt } from './upgrade-prompt';
import { Skeleton } from '@/components/ui/skeleton';

interface FeatureGateProps {
  feature: FeatureKey;
  children: React.ReactNode;
  /**
   * What to show when feature is not available
   * - 'upgrade-prompt': Show upgrade prompt (default)
   * - 'hide': Hide the content completely
   * - 'disabled': Show content but disabled/grayed out
   * - React.ReactNode: Custom fallback
   */
  fallback?: 'upgrade-prompt' | 'hide' | 'disabled' | React.ReactNode;
  /**
   * Variant for the upgrade prompt
   */
  promptVariant?: 'full-page' | 'card' | 'inline';
  /**
   * Show loading skeleton while checking access
   */
  showLoading?: boolean;
  /**
   * Custom loading component
   */
  loadingComponent?: React.ReactNode;
  /**
   * Class name for the wrapper
   */
  className?: string;
}

export function FeatureGate({
  feature,
  children,
  fallback = 'upgrade-prompt',
  promptVariant = 'card',
  showLoading = true,
  loadingComponent,
  className,
}: FeatureGateProps) {
  const { hasAccess, isLoading, planName } = useFeatureAccess(feature);

  // Show loading state
  if (isLoading && showLoading) {
    if (loadingComponent) {
      return <>{loadingComponent}</>;
    }
    return (
      <div className={className}>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  // User has access - render children
  if (hasAccess) {
    return <>{children}</>;
  }

  // User doesn't have access - handle fallback
  if (fallback === 'hide') {
    return null;
  }

  if (fallback === 'disabled') {
    return <div className={`opacity-50 pointer-events-none ${className}`}>{children}</div>;
  }

  if (fallback === 'upgrade-prompt') {
    return (
      <UpgradePrompt
        feature={feature}
        currentPlan={planName}
        variant={promptVariant}
        className={className}
      />
    );
  }

  // Custom fallback
  return <>{fallback}</>;
}

/**
 * Hook-based feature check for more complex scenarios
 * Use this when you need to conditionally render parts of a component
 *
 * Example:
 * ```tsx
 * function MyComponent() {
 *   const { hasAccess, isLoading } = useFeatureAccess('inventory');
 *
 *   return (
 *     <div>
 *       <h1>Dashboard</h1>
 *       {hasAccess && <InventoryWidget />}
 *       {!hasAccess && <UpgradePrompt feature="inventory" variant="inline" />}
 *     </div>
 *   );
 * }
 * ```
 */
export { useFeatureAccess } from '@/hooks/use-feature-access';
