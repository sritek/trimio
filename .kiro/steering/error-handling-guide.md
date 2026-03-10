# Error Handling Guide

This document explains how to implement clean, user-friendly error handling throughout the Salon Management SaaS application.

## Overview

The error handling system consists of three layers:

1. **Backend Error Handler** (`apps/api/src/lib/error-handler.ts`) - Catches all errors and returns clean messages
2. **Frontend Error Handler** (`apps/web/src/lib/error-handler.ts`) - Transforms API errors into user-friendly messages
3. **Error Hook** (`apps/web/src/hooks/use-error-handler.ts`) - Provides consistent error handling in components

## Backend Error Handling

### How It Works

The backend error handler automatically catches all errors and transforms them into user-friendly messages. It handles:

- **Database connection errors** - "Database is temporarily unavailable. Please try again in a moment."
- **Database timeouts** - "The request took too long. Please try again."
- **Validation errors** - "Please check your input and try again."
- **Duplicate entries** - "This record already exists. Please use a different value."
- **Not found errors** - "The requested item was not found."
- **Business logic errors** - Specific messages for each business rule violation

### Error Response Format

All API errors follow this format:

```json
{
  "success": false,
  "error": {
    "code": "DATABASE_UNAVAILABLE",
    "message": "Database is temporarily unavailable. Please try again in a moment.",
    "details": null
  }
}
```

### Error Codes

Common error codes returned by the API:

| Code                   | HTTP Status | Message                             |
| ---------------------- | ----------- | ----------------------------------- |
| `DATABASE_UNAVAILABLE` | 503         | Database is temporarily unavailable |
| `DATABASE_TIMEOUT`     | 503         | The request took too long           |
| `DATABASE_ERROR`       | 503         | A database error occurred           |
| `VALIDATION_ERROR`     | 400         | Please check your input             |
| `INVALID_INPUT`        | 400         | The information is invalid          |
| `DUPLICATE_ENTRY`      | 409         | This record already exists          |
| `NOT_FOUND`            | 404         | The requested item was not found    |
| `UNAUTHORIZED`         | 401         | You are not authorized              |
| `INTERNAL_ERROR`       | 500         | An unexpected error occurred        |

## Frontend Error Handling

### Using the Error Hook

The `useErrorHandler` hook provides a simple way to handle errors in components:

```typescript
import { useErrorHandler } from '@/hooks/use-error-handler';

export function MyComponent() {
  const { handleError } = useErrorHandler();

  const handleSubmit = async () => {
    try {
      await api.post('/endpoint', data);
    } catch (error) {
      handleError(error, {
        customMessage: 'Failed to save. Please try again.',
      });
    }
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

### Hook Options

```typescript
interface ErrorHandlerOptions {
  // Show error toast (default: true)
  showToast?: boolean;

  // Custom error message to show instead of parsed message
  customMessage?: string;

  // Callback when error occurs
  onError?: (error: unknown) => void;

  // Log error to console (default: true in dev, false in prod)
  logError?: boolean;
}
```

### Examples

#### Basic Error Handling

```typescript
const { handleError } = useErrorHandler();

try {
  await api.post('/invoices', data);
} catch (error) {
  handleError(error);
}
```

#### With Custom Message

```typescript
try {
  await api.post('/invoices', data);
} catch (error) {
  handleError(error, {
    customMessage: 'Failed to create invoice. Please try again.',
  });
}
```

#### With Custom Callback

```typescript
try {
  await api.post('/invoices', data);
} catch (error) {
  handleError(error, {
    onError: (err) => {
      // Log to analytics
      analytics.trackError(err);
    },
  });
}
```

#### Async Wrapper

```typescript
const { handleAsyncError } = useErrorHandler();

const result = await handleAsyncError(() => api.post('/invoices', data), {
  customMessage: 'Failed to create invoice.',
});

if (result) {
  // Success
} else {
  // Error was handled
}
```

### Error Message Mapping

The frontend automatically maps error codes to user-friendly messages:

```typescript
// Error code → User-friendly message
DATABASE_UNAVAILABLE → "The database is temporarily unavailable. Please try again in a moment."
VALIDATION_ERROR → "Please check your input and try again."
DUPLICATE_ENTRY → "This record already exists. Please use a different value."
INSUFFICIENT_BALANCE → "Insufficient balance. Please add funds and try again."
SLOT_NOT_AVAILABLE → "The selected time slot is no longer available. Please choose another."
```

### Utility Functions

#### `formatErrorMessage(error)`

Get just the error message for display:

```typescript
const message = formatErrorMessage(error);
toast.error(message);
```

#### `parseApiError(error)`

Parse error and get code, message, and details:

```typescript
const { code, message, details } = parseApiError(error);
console.log(`Error ${code}: ${message}`);
```

#### `isErrorCode(error, code)`

Check if error is a specific code:

```typescript
if (isErrorCode(error, 'DUPLICATE_ENTRY')) {
  // Handle duplicate entry
}
```

#### `isDatabaseError(error)`

Check if error is a database error:

```typescript
if (isDatabaseError(error)) {
  // Show retry button
}
```

#### `isNetworkError(error)`

Check if error is a network error:

```typescript
if (isNetworkError(error)) {
  // Check internet connection
}
```

## Implementation Patterns

### Pattern 1: Simple Try-Catch

```typescript
const { handleError } = useErrorHandler();

const handleSave = async () => {
  try {
    await api.post('/invoices', data);
    toast.success('Invoice saved');
  } catch (error) {
    handleError(error, {
      customMessage: 'Failed to save invoice.',
    });
  }
};
```

### Pattern 2: Mutation Error Handler

```typescript
const mutation = useMutation({
  mutationFn: (data) => api.post('/invoices', data),
  onError: (error) => {
    handleError(error, {
      customMessage: 'Failed to create invoice.',
    });
  },
  onSuccess: () => {
    toast.success('Invoice created');
  },
});
```

### Pattern 3: Conditional Error Handling

```typescript
const { handleError } = useErrorHandler();

try {
  await api.post('/invoices', data);
} catch (error) {
  if (isErrorCode(error, 'DUPLICATE_ENTRY')) {
    // Handle duplicate
    setError('This invoice already exists');
  } else if (isDatabaseError(error)) {
    // Handle database error
    handleError(error, {
      customMessage: 'Database error. Please try again.',
    });
  } else {
    // Handle other errors
    handleError(error);
  }
}
```

## Best Practices

### 1. Always Use the Error Hook

✅ **Good**

```typescript
const { handleError } = useErrorHandler();
try {
  await api.post('/endpoint', data);
} catch (error) {
  handleError(error);
}
```

❌ **Bad**

```typescript
try {
  await api.post('/endpoint', data);
} catch (error) {
  toast.error(error.message);
}
```

### 2. Provide Context with Custom Messages

✅ **Good**

```typescript
handleError(error, {
  customMessage: 'Failed to create invoice. Please check your input and try again.',
});
```

❌ **Bad**

```typescript
handleError(error);
```

### 3. Don't Show Raw Error Messages

✅ **Good**

```typescript
handleError(error, {
  customMessage: 'Failed to save. Please try again.',
});
```

❌ **Bad**

```typescript
toast.error(error.message); // Shows raw Prisma error
```

### 4. Log Errors in Development

```typescript
const { handleError } = useErrorHandler();

try {
  await api.post('/endpoint', data);
} catch (error) {
  handleError(error, {
    logError: true, // Logs to console in development
  });
}
```

### 5. Handle Specific Error Codes

```typescript
try {
  await api.post('/endpoint', data);
} catch (error) {
  if (isErrorCode(error, 'DUPLICATE_ENTRY')) {
    // Show specific UI for duplicate
    setShowDuplicateWarning(true);
  } else {
    handleError(error);
  }
}
```

## Adding New Error Messages

To add a new error message, update the `ERROR_MESSAGES` object in `apps/web/src/lib/error-handler.ts`:

```typescript
const ERROR_MESSAGES: Record<string, string> = {
  // ... existing messages
  MY_NEW_ERROR: 'User-friendly message for my new error',
};
```

Then use it in the backend error handler:

```typescript
// In apps/api/src/lib/error-handler.ts
if (someCondition) {
  return reply.status(400).send(buildErrorResponse('MY_NEW_ERROR', 'User-friendly message'));
}
```

## Testing Error Handling

### Test Database Connection Error

Stop the database and try to make an API call:

```bash
# Stop database
docker-compose down

# Try to create an invoice
# Should see: "The database is temporarily unavailable. Please try again in a moment."
```

### Test Validation Error

Send invalid data:

```typescript
await api.post('/invoices', {
  // Missing required fields
});
// Should see: "Please check your input and try again."
```

### Test Duplicate Entry

Try to create a duplicate:

```typescript
await api.post('/customers', { phone: '9999999999' });
await api.post('/customers', { phone: '9999999999' });
// Should see: "This record already exists. Please use a different value."
```

## Troubleshooting

### Error Message Not Showing

1. Check if `showToast` is not set to `false`
2. Check if error is being caught properly
3. Check browser console for errors

### Raw Error Message Showing

1. Make sure you're using `handleError` from the hook
2. Check if custom message is provided
3. Verify error code is in `ERROR_MESSAGES` mapping

### Error Not Being Logged

1. Check if `logError` is not set to `false`
2. Check if you're in development mode
3. Open browser console to see logs

## Summary

The error handling system provides:

- ✅ Clean, user-friendly error messages
- ✅ Consistent error handling across the app
- ✅ Automatic error code to message mapping
- ✅ Easy integration with components
- ✅ Development logging for debugging
- ✅ Customizable error messages

Use the `useErrorHandler` hook in all components that make API calls to ensure consistent, user-friendly error handling throughout the application.
