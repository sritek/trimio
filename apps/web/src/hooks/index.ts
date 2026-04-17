/**
 * Custom Hooks - Barrel Export
 */

export { useDebounce } from './use-debounce';
export { useMediaQuery, useIsMobile, useIsTablet, useIsDesktop } from './use-media-query';
export { useConfirm } from './use-confirm';
export { usePagination } from './use-pagination';
export { usePermissions, PERMISSIONS } from './use-permissions';
export { useErrorHandler } from './use-error-handler';

export { useQuickActions, useActionContext } from './use-quick-actions';

export { useLongPress } from './use-long-press';

// Real-time event hooks
export { useAppointmentEvents } from './use-appointment-events';

// Optimistic update hooks
export {
  useOptimisticUpdate,
  useOptimisticStatusChange,
  useOptimisticCheckIn,
  useOptimisticRemove,
  useOptimisticItemUpdate,
} from './use-optimistic-update';

// Throttled updates hooks
export {
  useThrottledUpdates,
  useBatchedUpdates,
  useThrottledEventHandler,
} from './use-throttled-updates';

// Update highlighting hooks
export { useHighlightUpdate, useHighlightClass, useHighlightedItem } from './use-highlight-update';

// Concurrent edit hooks
export { useConcurrentEdit, ConcurrentEditIndicator } from './use-concurrent-edit';

// Offline support hooks
export { useOfflineSupport, useOfflineData } from './use-offline-support';

// Reduced motion hooks
export { useReducedMotion, usePrefersReducedMotion } from './use-reduced-motion';

// Feature access hooks
export {
  useSubscriptionAccess,
  useFeatureAccess,
  useAdvancedReports,
  useWithinLimit,
  FEATURE_DISPLAY_NAMES,
  FEATURE_REQUIRED_PLANS,
} from './use-feature-access';
export type { FeatureKey, LimitKey, SubscriptionAccess } from './use-feature-access';

// Limit status hooks
export {
  useUserLimitStatus,
  useServiceLimitStatus,
  useProductLimitStatus,
} from './use-limit-status';
