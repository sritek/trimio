/**
 * Library Barrel Export
 * Re-exports all shared utilities and types
 */

// Prisma utilities
export {
  prisma,
  serializeDecimals,
  withTenant,
  withTenantAndBranch,
  withFullContext,
} from './prisma';

// Response utilities
export {
  successResponse,
  paginatedResponse,
  deleteResponse,
  errorResponse,
  buildPaginationMeta,
} from './response';

// Shared types
export type {
  JwtUser,
  PaginationMeta,
  PaginatedResult,
  ApiSuccessResponse,
  ApiPaginatedResponse,
  ApiErrorResponse,
  ApiResponse,
} from './types';

// Error classes
export {
  HttpError,
  BadRequestError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  ValidationError,
  InternalServerError,
  AppError,
} from './errors';

// Error handler
export { errorHandler } from './error-handler';

// Feature access utilities
export {
  getSubscriptionAccess,
  hasFeatureAccess,
  hasAdvancedReports,
  checkLimit,
  requireFeatureAccess,
  requireWithinLimit,
} from './feature-access';
export type {
  FeatureKey,
  LimitKey,
  SubscriptionFeatures,
  SubscriptionLimits,
  SubscriptionAccess,
} from './feature-access';
