/**
 * Combos Controller
 * Request handlers for combo service management
 *
 * Note: Authentication and authorization are handled by middleware (preHandler)
 * request.user is guaranteed to be populated when handlers are called
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { combosService } from './combos.service';
import { successResponse, deleteResponse, errorResponse } from '@/lib/response';

import type { CreateComboBody, UpdateComboBody } from './services.schema';

export class CombosController {
  /**
   * Get all combos
   */
  async getCombos(
    request: FastifyRequest<{ Querystring: { includeInactive?: boolean } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const combos = await combosService.getCombos(tenantId, request.query.includeInactive);

    return reply.send(successResponse(combos));
  }

  /**
   * Get a single combo
   */
  async getComboById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    const combo = await combosService.getComboById(tenantId, request.params.id);

    if (!combo) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Combo not found'));
    }

    return reply.send(successResponse(combo));
  }

  /**
   * Create a new combo
   */
  async createCombo(request: FastifyRequest<{ Body: CreateComboBody }>, reply: FastifyReply) {
    const { tenantId, sub } = request.user;

    const combo = await combosService.createCombo(tenantId, request.body, sub);

    return reply.code(201).send(successResponse(combo));
  }

  /**
   * Update a combo
   */
  async updateCombo(
    request: FastifyRequest<{
      Params: { id: string };
      Body: UpdateComboBody;
    }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const combo = await combosService.updateCombo(tenantId, request.params.id, request.body);

    return reply.send(successResponse(combo));
  }

  /**
   * Delete a combo
   */
  async deleteCombo(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    await combosService.deleteCombo(tenantId, request.params.id);

    return reply.send(deleteResponse('Combo deleted successfully'));
  }
}

export const combosController = new CombosController();
