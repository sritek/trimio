/**
 * Frontend Error Handler
 * Transforms API errors into user-friendly messages
 */

/**
 * Error code to user-friendly message mapping
 */
const ERROR_MESSAGES: Record<string, string> = {
  // Database errors
  DATABASE_UNAVAILABLE: 'The database is temporarily unavailable. Please try again in a moment.',
  DATABASE_TIMEOUT: 'The request took too long. Please try again.',
  DATABASE_ERROR: 'A database error occurred. Please try again later.',

  // Validation errors
  VALIDATION_ERROR: 'Please check your input and try again.',
  INVALID_INPUT: 'The information you provided is invalid. Please check and try again.',
  INVALID_REFERENCE: 'The selected item is no longer available. Please refresh and try again.',

  // Conflict errors
  DUPLICATE_ENTRY: 'This record already exists. Please use a different value.',
  ALREADY_EXISTS: 'This item already exists.',

  // Not found errors
  NOT_FOUND: 'The requested item was not found.',
  RESOURCE_NOT_FOUND: 'The requested resource was not found.',

  // Business logic errors
  INSUFFICIENT_BALANCE: 'Insufficient balance. Please add funds and try again.',
  SLOT_NOT_AVAILABLE: 'The selected time slot is no longer available. Please choose another.',
  BOOKING_LIMIT_EXCEEDED:
    'You have reached the maximum number of bookings. Please contact support.',
  CUSTOMER_BLOCKED: 'This customer is blocked from booking. Please contact support.',
  NO_SHOW_BLOCKED: 'You are blocked from booking due to no-show policy. Please contact support.',
  APPOINTMENT_CONFLICT: 'This time slot conflicts with another appointment.',
  INVALID_STATUS_TRANSITION: 'This action is not allowed for the current status.',
  REQUIRED_RELATION: 'A required item is missing. Please try again.',

  // Authentication errors
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  FORBIDDEN: 'You do not have permission to access this resource.',
  INVALID_CREDENTIALS: 'Invalid email or password.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',

  // Server errors
  INTERNAL_ERROR: 'An unexpected error occurred. Please try again or contact support.',
  INTERNAL_SERVER_ERROR: 'An unexpected error occurred. Please try again or contact support.',

  // Network errors
  NETWORK_ERROR: 'Network error. Please check your connection and try again.',
  TIMEOUT: 'The request timed out. Please try again.',

  // Default
  ERROR: 'An error occurred. Please try again.',
};

/**
 * Get user-friendly error message from error code
 */
export function getErrorMessage(code: string, fallback?: string): string {
  return ERROR_MESSAGES[code] || fallback || ERROR_MESSAGES.ERROR;
}

/**
 * Parse API error response and extract user-friendly message
 */
export function parseApiError(error: unknown): {
  message: string;
  code: string;
  details?: unknown;
} {
  // Handle network errors
  if (error instanceof TypeError) {
    if (error.message.includes('fetch')) {
      return {
        message: ERROR_MESSAGES.NETWORK_ERROR,
        code: 'NETWORK_ERROR',
      };
    }
  }

  // Handle timeout errors
  if (error instanceof Error && error.name === 'AbortError') {
    return {
      message: ERROR_MESSAGES.TIMEOUT,
      code: 'TIMEOUT',
    };
  }

  // Handle API error responses
  if (error && typeof error === 'object') {
    const apiError = error as {
      success?: boolean;
      error?: {
        code?: string;
        message?: string;
        details?: unknown;
      };
      message?: string;
    };

    // Standard API error format
    if (!apiError.success && apiError.error) {
      const code = apiError.error.code || 'ERROR';
      const message = getErrorMessage(code, apiError.error.message);
      return {
        message,
        code,
        details: apiError.error.details,
      };
    }

    // Fallback to message field
    if (apiError.message) {
      return {
        message: apiError.message,
        code: 'ERROR',
      };
    }
  }

  // Handle string errors
  if (typeof error === 'string') {
    return {
      message: error,
      code: 'ERROR',
    };
  }

  // Default error
  return {
    message: ERROR_MESSAGES.ERROR,
    code: 'ERROR',
  };
}

/**
 * Format error for display in toast/alert
 * Returns only the message for simple display
 */
export function formatErrorMessage(error: unknown): string {
  const parsed = parseApiError(error);
  return parsed.message;
}

/**
 * Check if error is a specific type
 */
export function isErrorCode(error: unknown, code: string): boolean {
  if (error && typeof error === 'object') {
    const apiError = error as { error?: { code?: string } };
    return apiError.error?.code === code;
  }
  return false;
}

/**
 * Check if error is a validation error
 */
export function isValidationError(error: unknown): boolean {
  return isErrorCode(error, 'VALIDATION_ERROR');
}

/**
 * Check if error is a database error
 */
export function isDatabaseError(error: unknown): boolean {
  if (error && typeof error === 'object') {
    const apiError = error as { error?: { code?: string } };
    const code = apiError.error?.code || '';
    return code.startsWith('DATABASE_') || code === 'INTERNAL_ERROR';
  }
  return false;
}

/**
 * Check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  return (
    isErrorCode(error, 'NETWORK_ERROR') ||
    isErrorCode(error, 'TIMEOUT') ||
    error instanceof TypeError
  );
}
