/**
 * useQuickActions Hook
 * Based on: .kiro/specs/ux-redesign/design.md
 * Requirements: 3.1, 3.2, 3.5, 3.9
 *
 * Hook for managing quick actions with slide-over integration and toast notifications.
 * Includes retry functionality for failed actions.
 */

import { useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { useSlideOverStore } from '@/stores/slide-over-store';
import {
  ENTITY_ACTIONS,
  getVisibleActions,
  getPrimaryActions,
  type EntityType,
  type ActionContext,
  type QuickAction,
} from '@/components/ux/quick-actions/entity-actions';

interface UseQuickActionsOptions {
  /** Permissions for the current user */
  permissions?: string[];
  /** Maximum number of primary actions to show */
  maxPrimaryActions?: number;
  /** Callback when an action completes successfully */
  onActionComplete?: (actionId: string) => void;
  /** Callback when an action fails */
  onActionError?: (actionId: string, error: Error) => void;
}

interface UseQuickActionsReturn<T> {
  /** All visible actions for the entity */
  actions: QuickAction<T>[];
  /** Primary actions (shown inline) */
  primaryActions: QuickAction<T>[];
  /** Overflow actions (shown in menu) */
  overflowActions: QuickAction<T>[];
  /** Action context for executing actions */
  context: ActionContext;
  /** Execute an action by ID */
  executeAction: (actionId: string, entity: T) => Promise<void>;
  /** Retry the last failed action */
  retryLastAction: () => Promise<void>;
}

interface FailedAction<T> {
  action: QuickAction<T>;
  entity: T;
  context: ActionContext;
}

/**
 * Hook for managing quick actions for an entity type
 *
 * @example
 * ```tsx
 * const { actions, context, primaryActions, overflowActions } = useQuickActions<Appointment>(
 *   'appointment',
 *   appointment,
 *   { permissions: ['appointments:write'] }
 * );
 *
 * return (
 *   <QuickActionBar
 *     entity={appointment}
 *     actions={actions}
 *     context={context}
 *   />
 * );
 * ```
 */
export function useQuickActions<T>(
  entityType: EntityType,
  entity: T,
  options: UseQuickActionsOptions = {}
): UseQuickActionsReturn<T> {
  const { permissions = [], maxPrimaryActions = 3, onActionComplete, onActionError } = options;

  const openPanel = useSlideOverStore((s) => s.open);

  // Store last failed action for retry
  const lastFailedActionRef = useRef<FailedAction<T> | null>(null);

  // Retry handler - needs to be defined before context
  const retryLastAction = useCallback(async () => {
    const failedAction = lastFailedActionRef.current;
    if (!failedAction) {
      toast.info('No action to retry');
      return;
    }

    const { action, entity: failedEntity, context: failedContext } = failedAction;
    lastFailedActionRef.current = null;

    toast.info(`Retrying ${action.label}...`);

    try {
      await action.execute(failedEntity, failedContext);
      toast.success(`${action.label} completed`);
      onActionComplete?.(action.id);
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Retry failed');
      // Store again for another retry attempt
      lastFailedActionRef.current = failedAction;
      toast.error(err.message, {
        action: {
          label: 'Retry',
          onClick: () => retryLastAction(),
        },
      });
      onActionError?.(action.id, err);
    }
  }, [onActionComplete, onActionError]);

  // Create action context with slide-over and toast integration
  const context: ActionContext = useMemo(
    () => ({
      openPanel: (componentId, props, opts) => {
        openPanel(componentId, props, opts);
      },
      toast: {
        success: (message: string) => toast.success(message),
        error: (message: string) => {
          // Show error with retry option if there's a failed action
          if (lastFailedActionRef.current) {
            toast.error(message, {
              action: {
                label: 'Retry',
                onClick: () => retryLastAction(),
              },
            });
          } else {
            toast.error(message);
          }
        },
        warning: (message: string) => toast.warning(message),
      },
      // API methods - these would be replaced with actual API calls
      api: {
        appointments: {
          checkIn: async (id: string) => {
            // TODO: Implement actual API call
            console.log('Check in appointment:', id);
          },
          start: async (id: string) => {
            // TODO: Implement actual API call
            console.log('Start appointment:', id);
          },
          complete: async (id: string) => {
            // TODO: Implement actual API call
            console.log('Complete appointment:', id);
          },
          cancel: async (id: string, reason?: string) => {
            // TODO: Implement actual API call
            console.log('Cancel appointment:', id, reason);
          },
          markNoShow: async (id: string) => {
            // TODO: Implement actual API call
            console.log('Mark no-show:', id);
          },
        },
      },
    }),
    [openPanel, retryLastAction]
  );

  // Get actions for the entity type
  const allActions = useMemo(() => {
    const entityActions = ENTITY_ACTIONS[entityType] as QuickAction<T>[];
    return entityActions || [];
  }, [entityType]);

  // Get visible actions based on entity state and permissions
  const actions = useMemo(
    () => getVisibleActions(allActions, entity, permissions),
    [allActions, entity, permissions]
  );

  // Split into primary and overflow
  const { primary: primaryActions, overflow: overflowActions } = useMemo(
    () => getPrimaryActions(allActions, entity, permissions, maxPrimaryActions),
    [allActions, entity, permissions, maxPrimaryActions]
  );

  // Execute action by ID with retry support
  const executeAction = useCallback(
    async (actionId: string, targetEntity: T) => {
      const action = actions.find((a) => a.id === actionId);
      if (!action) {
        console.warn(`Action not found: ${actionId}`);
        return;
      }

      try {
        await action.execute(targetEntity, context);
        // Clear failed action on success
        lastFailedActionRef.current = null;
        onActionComplete?.(actionId);
      } catch (error) {
        const err = error instanceof Error ? error : new Error('Action failed');
        // Store for retry
        lastFailedActionRef.current = { action, entity: targetEntity, context };
        // Show error with retry option
        toast.error(err.message, {
          action: {
            label: 'Retry',
            onClick: () => retryLastAction(),
          },
        });
        onActionError?.(actionId, err);
      }
    },
    [actions, context, onActionComplete, onActionError, retryLastAction]
  );

  return {
    actions,
    primaryActions,
    overflowActions,
    context,
    executeAction,
    retryLastAction,
  };
}

/**
 * Hook for getting action context without entity-specific actions
 * Useful for custom action implementations
 */
export function useActionContext(): ActionContext {
  const openPanel = useSlideOverStore((s) => s.open);

  return useMemo(
    () => ({
      openPanel: (componentId, props, opts) => {
        openPanel(componentId, props, opts);
      },
      toast: {
        success: (message: string) => toast.success(message),
        error: (message: string) => toast.error(message),
        warning: (message: string) => toast.warning(message),
      },
      api: {
        appointments: {
          checkIn: async (id: string) => {
            console.log('Check in appointment:', id);
          },
          start: async (id: string) => {
            console.log('Start appointment:', id);
          },
          complete: async (id: string) => {
            console.log('Complete appointment:', id);
          },
          cancel: async (id: string, reason?: string) => {
            console.log('Cancel appointment:', id, reason);
          },
          markNoShow: async (id: string) => {
            console.log('Mark no-show:', id);
          },
        },
      },
    }),
    [openPanel]
  );
}
