/**
 * useErrorHandler Hook
 * Provides consistent error handling across the app
 */

import { useCallback } from 'react';
import { toast } from 'sonner';
import {
  formatErrorMessage,
  parseApiError,
  isDatabaseError,
  isNetworkError,
} from '@/lib/error-handler';

interface ErrorHandlerOptions {
  /**
   * Show error toast (default: true)
   */
  showToast?: boolean;

  /**
   * Custom error message to show instead of parsed message
   */
  customMessage?: string;

  /**
   * Callback when error occurs
   */
  onError?: (error: unknown) => void;

  /**
   * Log error to console (default: true in dev, false in prod)
   */
  logError?: boolean;
}

export function useErrorHandler() {
  /**
   * Handle error and show user-friendly message
   */
  const handleError = useCallback((error: unknown, options: ErrorHandlerOptions = {}) => {
    const {
      showToast = true,
      customMessage,
      onError,
      logError = process.env.NODE_ENV === 'development',
    } = options;

    // Log error in development
    if (logError) {
      console.error('[Error]', error);
    }

    // Call custom error callback
    if (onError) {
      onError(error);
    }

    // Show toast with user-friendly message
    if (showToast) {
      const message = customMessage || formatErrorMessage(error);
      const parsed = parseApiError(error);

      // Determine toast variant based on error type
      let variant: 'default' | 'destructive' = 'destructive';
      if (isDatabaseError(error)) {
        variant = 'destructive';
      } else if (isNetworkError(error)) {
        variant = 'destructive';
      }

      toast.error(message, {
        description:
          parsed.details && typeof parsed.details === 'object'
            ? JSON.stringify(parsed.details)
            : undefined,
      });
    }

    return parseApiError(error);
  }, []);

  /**
   * Handle error from async operation
   * Useful for wrapping async functions
   */
  const handleAsyncError = useCallback(
    async <T>(asyncFn: () => Promise<T>, options: ErrorHandlerOptions = {}): Promise<T | null> => {
      try {
        return await asyncFn();
      } catch (error) {
        handleError(error, options);
        return null;
      }
    },
    [handleError]
  );

  return {
    handleError,
    handleAsyncError,
  };
}
