# Error Handling - Quick Reference

## For Backend Developers

### Creating a New Controller Method

```typescript
// ✅ GOOD - No try-catch, let errors bubble up
async createService(request: FastifyRequest<{ Body: CreateServiceBody }>, reply: FastifyReply) {
  const { tenantId, sub } = request.user;
  const service = await servicesService.createService(tenantId, request.body, sub);
  return reply.code(201).send(successResponse(service));
}

// ❌ BAD - Don't catch errors in controllers
async createService(request: FastifyRequest<{ Body: CreateServiceBody }>, reply: FastifyReply) {
  try {
    const { tenantId, sub } = request.user;
    const service = await servicesService.createService(tenantId, request.body, sub);
    return reply.code(201).send(successResponse(service));
  } catch (error) {
    // This prevents the global error handler from processing the error!
    return reply.code(400).send(errorResponse('ERROR', error.message));
  }
}
```

### Creating a Service Method

```typescript
import { NotFoundError, ConflictError, BadRequestError } from '@/lib/errors';

async createService(tenantId: string, data: CreateServiceBody, userId: string) {
  // Check for duplicates
  const existing = await prisma.service.findFirst({
    where: { tenantId, name: data.name, deletedAt: null }
  });

  if (existing) {
    // ✅ Throw custom error with error code
    throw new ConflictError('DUPLICATE_ENTRY', 'Service with this name already exists');
  }

  // Check for invalid references
  const category = await prisma.serviceCategory.findFirst({
    where: { id: data.categoryId, tenantId }
  });

  if (!category) {
    // ✅ Throw custom error with error code
    throw new NotFoundError('CATEGORY_NOT_FOUND', 'Service category not found');
  }

  // Create service - let Prisma errors bubble up
  return prisma.service.create({
    data: {
      tenantId,
      name: data.name,
      categoryId: data.categoryId,
      createdBy: userId,
      updatedBy: userId
    }
  });
}
```

### Error Classes to Use

```typescript
import {
  NotFoundError,
  ConflictError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  InternalServerError,
  AppError,
} from '@/lib/errors';

// All error classes follow the pattern: (code, message)

// Not found (404)
throw new NotFoundError('RESOURCE_NOT_FOUND', 'Resource not found');

// Conflict - duplicate, already exists (409)
throw new ConflictError('DUPLICATE_ENTRY', 'Resource already exists');

// Bad request - validation, business rule (400)
throw new BadRequestError('INVALID_INPUT', 'Invalid input data');

// Unauthorized (401)
throw new UnauthorizedError('UNAUTHORIZED', 'You are not authorized');

// Forbidden (403)
throw new ForbiddenError('FORBIDDEN', 'You do not have permission');

// Validation error (422) - message only, code is always VALIDATION_ERROR
throw new ValidationError('Invalid input', [{ field: 'email', message: 'Invalid email format' }]);

// Internal server error (500)
throw new InternalServerError('INTERNAL_ERROR', 'An unexpected error occurred');

// Custom app error - (code, message, statusCode, details)
throw new AppError('CUSTOM_CODE', 'Custom message', 400, { details: 'here' });
```

## For Frontend Developers

### Using the Error Handler Hook

```typescript
import { useErrorHandler } from '@/hooks/use-error-handler';

export function MyComponent() {
  const { handleError } = useErrorHandler();

  const handleSubmit = async () => {
    try {
      await api.post('/endpoint', data);
      toast.success('Success!');
    } catch (error) {
      // ✅ Automatically shows user-friendly toast
      handleError(error);
    }
  };

  return <button onClick={handleSubmit}>Submit</button>;
}
```

### With Custom Message

```typescript
const { handleError } = useErrorHandler();

try {
  await api.post('/invoices', data);
} catch (error) {
  handleError(error, {
    customMessage: 'Failed to create invoice. Please check your input and try again.',
  });
}
```

### With Callback

```typescript
const { handleError } = useErrorHandler();

try {
  await api.post('/endpoint', data);
} catch (error) {
  handleError(error, {
    onError: (err) => {
      // Track error in analytics
      analytics.trackError(err);
    },
  });
}
```

### Checking Error Type

```typescript
import {
  isErrorCode,
  isDatabaseError,
  isNetworkError,
  isValidationError,
  parseApiError,
} from '@/lib/error-handler';

try {
  await api.post('/endpoint', data);
} catch (error) {
  if (isErrorCode(error, 'DUPLICATE_ENTRY')) {
    // Handle duplicate
    setError('This already exists');
  } else if (isDatabaseError(error)) {
    // Handle database error
    handleError(error, {
      customMessage: 'Database error. Please try again.',
    });
  } else if (isNetworkError(error)) {
    // Handle network error
    handleError(error, {
      customMessage: 'Network error. Please check your connection.',
    });
  } else {
    // Handle other errors
    handleError(error);
  }
}
```

## Error Code Reference

| Code                   | HTTP | Message                                                                |
| ---------------------- | ---- | ---------------------------------------------------------------------- |
| `DATABASE_UNAVAILABLE` | 503  | The database is temporarily unavailable. Please try again in a moment. |
| `DATABASE_TIMEOUT`     | 503  | The request took too long. Please try again.                           |
| `VALIDATION_ERROR`     | 400  | Please check your input and try again.                                 |
| `INVALID_CREDENTIALS`  | 401  | Invalid email or password.                                             |
| `DUPLICATE_ENTRY`      | 409  | This record already exists. Please use a different value.              |
| `NOT_FOUND`            | 404  | The requested item was not found.                                      |
| `UNAUTHORIZED`         | 401  | You are not authorized to perform this action.                         |
| `FORBIDDEN`            | 403  | You do not have permission to access this resource.                    |
| `INSUFFICIENT_BALANCE` | 400  | Insufficient balance. Please add funds and try again.                  |
| `SLOT_NOT_AVAILABLE`   | 400  | The selected time slot is no longer available. Please choose another.  |
| `INTERNAL_ERROR`       | 500  | An unexpected error occurred. Please try again or contact support.     |

## Testing

### Test Database Connection Error

```bash
docker-compose down
# Try to login
# Expected: "The database is temporarily unavailable. Please try again in a moment."
```

### Test Invalid Credentials

```bash
# Login with wrong password
# Expected: "Invalid email or password."
```

### Test Duplicate Entry

```bash
# Try to create duplicate
# Expected: "This record already exists. Please use a different value."
```

### Test Not Found

```bash
# Try to get non-existent resource
# Expected: "The requested item was not found."
```

## Checklist for New Features

- [ ] Controller has NO try-catch blocks
- [ ] Service throws custom errors with error codes
- [ ] Controller uses `successResponse`, `paginatedResponse`, `deleteResponse`
- [ ] Frontend uses `useErrorHandler` hook
- [ ] Tested with database down
- [ ] Error messages are user-friendly

## Documentation

- **Complete Guide**: `.kiro/steering/error-handling-guide.md`
- **Refactoring Details**: `.kiro/steering/controller-error-handling-refactor.md`
- **Auth Module Fix**: `.kiro/steering/error-handling-fix.md`
- **Backend Patterns**: `.cursor/rules/22-backend-patterns.md`

## Key Principle

**Controllers should NOT catch errors. Let them bubble to the global error handler.**

The global error handler will:

- Catch all error types
- Transform to user-friendly messages
- Return consistent responses
- Log for debugging
