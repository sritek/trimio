/**
 * Authentication Middleware
 * Centralized JWT authentication for protected routes
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import type { UserRole } from '@trimio/shared';

import { UnauthorizedError } from '../lib/errors';

/**
 * JWT payload structure for access tokens
 */
export interface JwtUser {
  sub: string;
  tenantId: string;
  branchIds: string[];
  role: UserRole;
  permissions: string[];
}

/**
 * Augment @fastify/jwt to include our typed user for jwtVerify()
 * Note: We only augment the user type for verification, not the sign payload
 * This allows signing with different payload structures (access vs refresh tokens)
 */
declare module '@fastify/jwt' {
  interface FastifyJWT {
    user: JwtUser;
  }
}

/**
 * Authentication preHandler
 * Verifies JWT token and populates request.user
 *
 * Usage:
 * ```typescript
 * fastify.get('/protected', {
 *   preHandler: [authenticate],
 * }, handler);
 * ```
 */
export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired token');
  }
}

/**
 * Optional authentication preHandler
 * Verifies JWT if present, but doesn't fail if missing
 * Useful for endpoints that behave differently for authenticated users
 */
export async function optionalAuthenticate(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();
  } catch {
    // Token invalid or missing - that's okay for optional auth
    // request.user will be undefined
  }
}
