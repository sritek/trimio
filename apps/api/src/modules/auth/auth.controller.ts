/**
 * Auth Controller
 * Request handlers for authentication endpoints
 *
 * Implements stateful refresh tokens stored in database for:
 * - Token revocation support
 * - "Logout from all devices" functionality
 * - Session tracking
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { ROLE_PERMISSIONS } from '@salon-ops/shared';

import { prisma } from '../../lib/prisma';
import { successResponse } from '../../lib/response';
import { authService } from './auth.service';

import type { LoginBody, RefreshTokenBody, RegisterBody } from './auth.schema';

// Refresh token expiry: 7 days
const REFRESH_TOKEN_EXPIRY_DAYS = 7;

export class AuthController {
  /**
   * Login endpoint
   */
  async login(request: FastifyRequest<{ Body: LoginBody }>, reply: FastifyReply) {
    const result = await authService.login(request.body);

    // Generate access token
    const accessToken = request.server.jwt.sign(
      {
        sub: result.user.id,
        tenantId: result.user.tenantId,
        branchIds: result.user.branchIds,
        role: result.user.role,
        permissions: ROLE_PERMISSIONS[result.user.role as keyof typeof ROLE_PERMISSIONS] || [],
      },
      { expiresIn: '15m' }
    );

    // Generate refresh token
    const refreshToken = request.server.jwt.sign(
      {
        sub: result.user.id,
        tenantId: result.user.tenantId,
        type: 'refresh',
      },
      { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
    );

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.refreshToken.create({
      data: {
        userId: result.user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return reply.send(
      successResponse({
        user: result.user,
        tenant: result.tenant,
        accessToken,
        refreshToken,
      })
    );
  }

  /**
   * Register endpoint
   */
  async register(request: FastifyRequest<{ Body: RegisterBody }>, reply: FastifyReply) {
    const result = await authService.register(request.body);

    // Generate access token
    const accessToken = request.server.jwt.sign(
      {
        sub: result.user.id,
        tenantId: result.user.tenantId,
        branchIds: result.user.branchIds,
        role: result.user.role,
        permissions: ROLE_PERMISSIONS[result.user.role as keyof typeof ROLE_PERMISSIONS] || [],
      },
      { expiresIn: '15m' }
    );

    // Generate refresh token
    const refreshToken = request.server.jwt.sign(
      {
        sub: result.user.id,
        tenantId: result.user.tenantId,
        type: 'refresh',
      },
      { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
    );

    // Store refresh token in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.refreshToken.create({
      data: {
        userId: result.user.id,
        token: refreshToken,
        expiresAt,
      },
    });

    return reply.code(201).send(
      successResponse({
        user: result.user,
        tenant: result.tenant,
        accessToken,
        refreshToken,
      })
    );
  }

  /**
   * Refresh token endpoint
   * Implements token rotation: old token is deleted, new one is created
   */
  async refresh(request: FastifyRequest<{ Body: RefreshTokenBody }>, reply: FastifyReply) {
    const { refreshToken } = request.body;

    // Verify refresh token signature
    const payload = request.server.jwt.verify<{
      sub: string;
      tenantId: string;
      type: string;
    }>(refreshToken);

    if (payload.type !== 'refresh') {
      throw new Error('Invalid token type');
    }

    // Verify token exists in database (not revoked)
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshToken },
    });

    if (!storedToken) {
      throw new Error('Token not found or revoked');
    }

    // Check if token is expired
    if (storedToken.expiresAt < new Date()) {
      // Clean up expired token
      await prisma.refreshToken.delete({ where: { id: storedToken.id } });
      throw new Error('Token expired');
    }

    // Get user
    const user = await authService.getUserById(payload.sub);
    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    const branchIds = user.branchAssignments.map((ba) => ba.branchId);

    // Generate new tokens
    const newAccessToken = request.server.jwt.sign(
      {
        sub: user.id,
        tenantId: user.tenantId,
        branchIds,
        role: user.role,
        permissions: ROLE_PERMISSIONS[user.role as keyof typeof ROLE_PERMISSIONS] || [],
      },
      { expiresIn: '15m' }
    );

    const newRefreshToken = request.server.jwt.sign(
      {
        sub: user.id,
        tenantId: user.tenantId,
        type: 'refresh',
      },
      { expiresIn: `${REFRESH_TOKEN_EXPIRY_DAYS}d` }
    );

    // Token rotation: delete old token, create new one
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_EXPIRY_DAYS);

    await prisma.$transaction([
      prisma.refreshToken.delete({ where: { id: storedToken.id } }),
      prisma.refreshToken.create({
        data: {
          userId: user.id,
          token: newRefreshToken,
          expiresAt,
        },
      }),
    ]);

    return reply.send(
      successResponse({
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      })
    );
  }

  /**
   * Get current user profile
   */
  async me(request: FastifyRequest, reply: FastifyReply) {
    await request.jwtVerify();

    const payload = request.user as { sub: string };
    const user = await authService.getUserById(payload.sub);

    if (!user) {
      throw new Error('User not found');
    }

    const branchIds = user.branchAssignments.map((ba) => ba.branchId);

    return reply.send(
      successResponse({
        id: user.id,
        email: user.email,
        phone: user.phone,
        name: user.name,
        role: user.role,
        tenantId: user.tenantId,
        branchIds,
        tenant: {
          id: user.tenant.id,
          name: user.tenant.name,
          slug: user.tenant.slug,
        },
      })
    );
  }

  /**
   * Logout endpoint
   * Revokes the current refresh token
   */
  async logout(request: FastifyRequest<{ Body: { refreshToken?: string } }>, reply: FastifyReply) {
    const { refreshToken } = request.body || {};

    if (refreshToken) {
      // Delete the specific refresh token from database
      await prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    }

    return reply.send(successResponse({ message: 'Logged out successfully' }));
  }

  /**
   * Logout from all devices
   * Revokes all refresh tokens for the current user
   */
  async logoutAll(request: FastifyRequest, reply: FastifyReply) {
    await request.jwtVerify();
    const payload = request.user as { sub: string };

    // Delete all refresh tokens for this user
    await prisma.refreshToken.deleteMany({
      where: { userId: payload.sub },
    });

    return reply.send(successResponse({ message: 'Logged out from all devices' }));
  }
}

export const authController = new AuthController();
