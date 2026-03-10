/**
 * Variants Controller
 * Request handlers for service variant management
 *
 * Note: Authentication and authorization are handled by middleware (preHandler)
 * request.user is guaranteed to be populated when handlers are called
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { variantsService } from './variants.service';
import { successResponse, deleteResponse } from '@/lib/response';

import type { CreateVariantBody, UpdateVariantBody } from './services.schema';

export class VariantsController {
  /**
   * Get all variants for a service
   */
  async getVariants(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    const variants = await variantsService.getVariants(tenantId, request.params.id);

    return reply.send(successResponse(variants));
  }

  /**
   * Create a new variant
   */
  async createVariant(
    request: FastifyRequest<{
      Params: { id: string };
      Body: CreateVariantBody;
    }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const variant = await variantsService.createVariant(tenantId, request.params.id, request.body);

    return reply.code(201).send(successResponse(variant));
  }

  /**
   * Update a variant
   */
  async updateVariant(
    request: FastifyRequest<{
      Params: { id: string; vid: string };
      Body: UpdateVariantBody;
    }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const variant = await variantsService.updateVariant(
      tenantId,
      request.params.id,
      request.params.vid,
      request.body
    );

    return reply.send(successResponse(variant));
  }

  /**
   * Delete a variant
   */
  async deleteVariant(
    request: FastifyRequest<{ Params: { id: string; vid: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    await variantsService.deleteVariant(tenantId, request.params.id, request.params.vid);

    return reply.send(deleteResponse('Variant deleted successfully'));
  }
}

export const variantsController = new VariantsController();
