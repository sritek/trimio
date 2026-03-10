/**
 * Add-Ons Controller
 * Request handlers for service add-on management
 *
 * Note: Authentication and authorization are handled by middleware (preHandler)
 * request.user is guaranteed to be populated when handlers are called
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { addOnsService } from './addons.service';
import { successResponse, deleteResponse, errorResponse } from '@/lib/response';

import type { CreateAddOnBody, MapAddOnsToServiceBody, UpdateAddOnBody } from './services.schema';

export class AddOnsController {
  /**
   * Get all add-ons
   */
  async getAddOns(
    request: FastifyRequest<{ Querystring: { includeInactive?: boolean } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const addOns = await addOnsService.getAddOns(tenantId, request.query.includeInactive);

    return reply.send(successResponse(addOns));
  }

  /**
   * Create a new add-on
   */
  async createAddOn(request: FastifyRequest<{ Body: CreateAddOnBody }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    const addOn = await addOnsService.createAddOn(tenantId, request.body);

    return reply.code(201).send(successResponse(addOn));
  }

  /**
   * Update an add-on
   */
  async updateAddOn(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateAddOnBody;
    }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const addOn = await addOnsService.updateAddOn(tenantId, request.params.id, request.body);

    return reply.send(successResponse(addOn));
  }

  /**
   * Delete an add-on
   */
  async deleteAddOn(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    await addOnsService.deleteAddOn(tenantId, request.params.id);

    return reply.send(deleteResponse('Add-on deleted successfully'));
  }

  /**
   * Map add-ons to a service
   */
  async mapAddOnsToService(
    request: FastifyRequest<{
      Params: { id: string };
      Body: MapAddOnsToServiceBody;
    }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const result = await addOnsService.mapAddOnsToService(
      tenantId,
      request.params.id,
      request.body
    );

    return reply.send(successResponse(result));
  }
}

export const addOnsController = new AddOnsController();
