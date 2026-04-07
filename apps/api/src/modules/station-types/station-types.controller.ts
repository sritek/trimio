/**
 * Station Types Controller
 * Request handlers for station type management
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { successResponse, deleteResponse } from '../../lib/response';
import { stationTypesService } from './station-types.service';

import type { CreateStationTypeBody, UpdateStationTypeBody } from './station-types.schema';

export class StationTypesController {
  /**
   * Get all station types
   */
  async getStationTypes(request: FastifyRequest<{ Querystring: { branchId?: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user!;
    const { branchId } = request.query;

    const stationTypes = await stationTypesService.getStationTypes(tenantId, branchId);

    return reply.send(successResponse(stationTypes));
  }

  /**
   * Get a single station type
   */
  async getStationTypeById(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user!;

    const stationType = await stationTypesService.getStationTypeById(tenantId, request.params.id);

    return reply.send(successResponse(stationType));
  }

  /**
   * Create a new station type
   */
  async createStationType(
    request: FastifyRequest<{ Body: CreateStationTypeBody }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user!;

    const stationType = await stationTypesService.createStationType(tenantId, request.body);

    return reply.status(201).send(successResponse(stationType));
  }

  /**
   * Update a station type
   */
  async updateStationType(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateStationTypeBody }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user!;

    const stationType = await stationTypesService.updateStationType(
      tenantId,
      request.params.id,
      request.body
    );

    return reply.send(successResponse(stationType));
  }

  /**
   * Delete a station type
   */
  async deleteStationType(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user!;

    await stationTypesService.deleteStationType(tenantId, request.params.id);

    return reply.send(deleteResponse('Station type deleted successfully'));
  }
}

export const stationTypesController = new StationTypesController();
