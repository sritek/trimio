/**
 * Custom Error Classes
 * HTTP errors for consistent API responses
 *
 * All error classes follow the pattern: (code, message)
 * - code: Error code for programmatic handling (e.g., 'NOT_FOUND', 'DUPLICATE_ENTRY')
 * - message: Human-readable error message
 */

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    public code: string,
    message: string
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends HttpError {
  constructor(code = 'BAD_REQUEST', message = 'Bad Request') {
    super(400, code, message);
  }
}

export class UnauthorizedError extends HttpError {
  constructor(code = 'UNAUTHORIZED', message = 'Unauthorized') {
    super(401, code, message);
  }
}

export class ForbiddenError extends HttpError {
  constructor(code = 'FORBIDDEN', message = 'Forbidden') {
    super(403, code, message);
  }
}

export class NotFoundError extends HttpError {
  constructor(code = 'NOT_FOUND', message = 'Not Found') {
    super(404, code, message);
  }
}

export class ConflictError extends HttpError {
  constructor(code = 'CONFLICT', message = 'Conflict') {
    super(409, code, message);
  }
}

export class ValidationError extends HttpError {
  constructor(
    message = 'Validation Error',
    public details?: Array<{ field: string; message: string }>
  ) {
    super(422, 'VALIDATION_ERROR', message);
  }
}

export class InternalServerError extends HttpError {
  constructor(code = 'INTERNAL_ERROR', message = 'Internal Server Error') {
    super(500, code, message);
  }
}

/**
 * Application Error - for business logic errors with custom codes
 */
export class AppError extends HttpError {
  public details?: unknown;

  constructor(
    code: string = 'APP_ERROR',
    message: string,
    statusCode: number = 400,
    details?: unknown
  ) {
    super(statusCode, code, message);
    this.details = details;
  }
}
