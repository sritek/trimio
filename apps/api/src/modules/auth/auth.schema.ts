/**
 * Auth Module Schemas
 * Zod validation schemas for auth endpoints
 */

import { z } from 'zod';

export const loginBodySchema = z.object({
  identifier: z.string().min(1, 'Mobile number or email is required'),
  password: z.string().min(6),
});

export type LoginBody = z.infer<typeof loginBodySchema>;

export const registerBodySchema = z.object({
  businessName: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Invalid phone number'),
  password: z.string().min(8),
  name: z.string().min(2).max(255),
});

export type RegisterBody = z.infer<typeof registerBodySchema>;

export const refreshTokenBodySchema = z.object({
  refreshToken: z.string().min(1),
});

export type RefreshTokenBody = z.infer<typeof refreshTokenBodySchema>;

export const forgotPasswordBodySchema = z
  .object({
    email: z.string().email().optional(),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/)
      .optional(),
  })
  .refine((data) => data.email || data.phone, {
    message: 'Either email or phone is required',
  });

export type ForgotPasswordBody = z.infer<typeof forgotPasswordBodySchema>;

export const resetPasswordBodySchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export type ResetPasswordBody = z.infer<typeof resetPasswordBodySchema>;

// =====================================================
// RESPONSE SCHEMAS
// =====================================================

// Note: Response schemas are intentionally flexible to allow the controller
// to return full objects without strict serialization. Fastify's JSON schema
// serialization would strip properties not defined in the response schema.

export const loginResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: z.any(),
    tenant: z.any(),
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});

export type LoginResponse = z.infer<typeof loginResponseSchema>;

export const registerResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: z.any(),
    tenant: z.any(),
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});

export type RegisterResponse = z.infer<typeof registerResponseSchema>;

export const refreshResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    accessToken: z.string(),
    refreshToken: z.string(),
  }),
});

export type RefreshResponse = z.infer<typeof refreshResponseSchema>;

export const meResponseSchema = z.object({
  success: z.literal(true),
  data: z.any(),
});

export type MeResponse = z.infer<typeof meResponseSchema>;

export const logoutResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    message: z.string(),
  }),
});

export type LogoutResponse = z.infer<typeof logoutResponseSchema>;

export const logoutBodySchema = z.object({
  refreshToken: z.string().optional(),
});

export type LogoutBody = z.infer<typeof logoutBodySchema>;
