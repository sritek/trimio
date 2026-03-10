/**
 * Global Error Handler
 * Handles all errors including Zod validation, Prisma, and custom HTTP errors
 */

import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { Prisma } from '@prisma/client';
import { env } from '@/config/env';

/**
 * Error response format
 */
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

/**
 * Build error response object
 */
function buildErrorResponse(code: string, message: string, details?: unknown): ErrorResponse {
  const response: ErrorResponse = {
    success: false,
    error: { code, message },
  };
  if (details !== undefined) {
    response.error.details = details;
  }
  return response;
}

/**
 * Handle Prisma errors and map to user-friendly messages
 */
function handlePrismaError(error: Prisma.PrismaClientKnownRequestError, reply: FastifyReply) {
  switch (error.code) {
    // Unique constraint violation
    case 'P2002': {
      const target = (error.meta?.target as string[]) || [];
      const field = target.length > 0 ? target.join(', ') : 'field';
      return reply
        .status(409)
        .send(buildErrorResponse('DUPLICATE_ENTRY', `A record with this ${field} already exists`));
    }

    // Record not found (for update/delete operations)
    case 'P2025':
      return reply.status(404).send(buildErrorResponse('NOT_FOUND', 'Record not found'));

    // Foreign key constraint violation
    case 'P2003': {
      const field = (error.meta?.field_name as string) || 'reference';
      return reply
        .status(400)
        .send(buildErrorResponse('INVALID_REFERENCE', `Referenced ${field} does not exist`));
    }

    // Required relation violation
    case 'P2014':
      return reply
        .status(400)
        .send(buildErrorResponse('REQUIRED_RELATION', 'Required related record is missing'));

    // Record not found for connect
    case 'P2018':
      return reply
        .status(400)
        .send(buildErrorResponse('INVALID_REFERENCE', 'Required connected record not found'));

    // Input value too long
    case 'P2000':
      return reply.status(400).send(buildErrorResponse('INVALID_INPUT', 'Input value is too long'));

    // Database timeout
    case 'P2024':
      return reply
        .status(503)
        .send(
          buildErrorResponse('DATABASE_TIMEOUT', 'Database operation timed out. Please try again.')
        );

    // Default for other Prisma errors
    default:
      return reply
        .status(500)
        .send(buildErrorResponse('DATABASE_ERROR', 'A database error occurred'));
  }
}

/**
 * Handle Prisma runtime errors (connection issues, etc.)
 */
function handlePrismaRuntimeError(error: Error, reply: FastifyReply) {
  const message = error.message || '';

  // Database connection errors
  if (
    message.includes("Can't reach database server") ||
    message.includes('connect ECONNREFUSED') ||
    message.includes('ENOTFOUND') ||
    message.includes('connection refused')
  ) {
    return reply
      .status(503)
      .send(
        buildErrorResponse(
          'DATABASE_UNAVAILABLE',
          'Database is temporarily unavailable. Please try again in a moment.'
        )
      );
  }

  // Network timeout
  if (message.includes('timeout') || message.includes('ETIMEDOUT')) {
    return reply
      .status(503)
      .send(
        buildErrorResponse('DATABASE_TIMEOUT', 'Database operation timed out. Please try again.')
      );
  }

  // Default database error
  return reply
    .status(503)
    .send(
      buildErrorResponse('DATABASE_ERROR', 'A database error occurred. Please try again later.')
    );
}

/**
 * Handle Zod validation errors from fastify-type-provider-zod
 */
function handleZodValidationError(error: FastifyError, reply: FastifyReply) {
  let details: Array<{ field: string; message: string }> = [];

  try {
    const zodErrors = JSON.parse(error.message);
    details = zodErrors.map((err: { path?: string[]; message?: string }) => ({
      field: err.path?.join('.') || 'unknown',
      message: err.message || 'Validation failed',
    }));
  } catch {
    details = [{ field: 'unknown', message: error.message }];
  }

  return reply
    .status(400)
    .send(buildErrorResponse('VALIDATION_ERROR', 'Invalid input data', details));
}

/**
 * Handle AJV validation errors (from inline JSON schemas)
 */
function handleAjvValidationError(error: FastifyError, reply: FastifyReply) {
  const details = error.validation?.map((err) => ({
    field:
      err.instancePath?.replace(/^\//, '') ||
      (err.params as { missingProperty?: string })?.missingProperty ||
      'unknown',
    message: err.message || 'Validation failed',
  }));

  return reply
    .status(400)
    .send(buildErrorResponse('VALIDATION_ERROR', 'Invalid input data', details));
}

/**
 * Global error handler for Fastify
 */
export function errorHandler(error: FastifyError, request: FastifyRequest, reply: FastifyReply) {
  // Handle Prisma known request errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    request.log.warn({ prismaCode: error.code, meta: error.meta }, 'Prisma error');
    return handlePrismaError(error, reply);
  }

  // Handle Prisma validation errors (invalid data type, etc.)
  if (error instanceof Prisma.PrismaClientValidationError) {
    request.log.warn('Prisma validation error');
    return reply.status(400).send(buildErrorResponse('INVALID_INPUT', 'Invalid data format'));
  }

  // Handle Prisma initialization errors (connection issues)
  if (error instanceof Prisma.PrismaClientInitializationError) {
    request.log.error(error, 'Database connection error');
    return handlePrismaRuntimeError(error, reply);
  }

  // Handle Prisma runtime errors (connection issues, timeouts, etc.)
  if (error instanceof Prisma.PrismaClientRustPanicError) {
    request.log.error(error, 'Prisma runtime error');
    return handlePrismaRuntimeError(error, reply);
  }

  // Handle generic Prisma errors (catch-all for other Prisma errors)
  if (error.name === 'PrismaClientError' || error.message?.includes('Prisma')) {
    request.log.error(error, 'Prisma error');
    return handlePrismaRuntimeError(error, reply);
  }

  // Handle Zod validation errors from fastify-type-provider-zod
  if (error.code === 'FST_ERR_VALIDATION') {
    return handleZodValidationError(error, reply);
  }

  // Handle AJV validation errors
  if (error.validation) {
    return handleAjvValidationError(error, reply);
  }

  // Handle custom HTTP errors (from our error classes)
  if (error.statusCode) {
    const response = buildErrorResponse(
      error.code || 'ERROR',
      error.message,
      'details' in error ? (error as { details?: unknown }).details : undefined
    );
    return reply.status(error.statusCode).send(response);
  }

  // Handle unexpected errors
  request.log.error(error, 'Unexpected error');
  return reply
    .status(500)
    .send(
      buildErrorResponse(
        'INTERNAL_ERROR',
        env.NODE_ENV === 'production' ? 'An unexpected error occurred' : error.message
      )
    );
}
