/**
 * Stations Controller
 * Request handlers for station management
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { successResponse, deleteResponse } from '../../lib/response';
import { stationsService } from './stations.service';

import type {
  CreateStationBody,
  UpdateStationBody,
  BulkCreateStationsBody,
  StationQuery,
} from './stations.schema';

export class StationsController {
  /**
   * Get all stations for a branch
   */
  async getStations(
    request: FastifyRequest<{ Params: { branchId: string }; Querystring: StationQuery }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user!;

    const stations = await stationsService.getStations(
      tenantId,
      request.params.branchId,
      request.query
    );

    return reply.send(successResponse(stations));
  }

  /**
   * Get a single station
   */
  async getStationById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user!;

    const station = await stationsService.getStationById(tenantId, request.params.id);

    return reply.send(successResponse(station));
  }

  /**
   * Create a new station
   */
  async createStation(
    request: FastifyRequest<{ Params: { branchId: string }; Body: CreateStationBody }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user!;

    const station = await stationsService.createStation(
      tenantId,
      request.params.branchId,
      request.body
    );

    return reply.status(201).send(successResponse(station));
  }

  /**
   * Bulk create stations
   */
  async bulkCreateStations(
    request: FastifyRequest<{ Params: { branchId: string }; Body: BulkCreateStationsBody }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user!;

    const stations = await stationsService.bulkCreateStations(
      tenantId,
      request.params.branchId,
      request.body
    );

    return reply.status(201).send(successResponse(stations));
  }

  /**
   * Update a station
   */
  async updateStation(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateStationBody }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user!;

    const station = await stationsService.updateStation(tenantId, request.params.id, request.body);

    return reply.send(successResponse(station));
  }

  /**
   * Delete a station
   */
  async deleteStation(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user!;

    await stationsService.deleteStation(tenantId, request.params.id);

    return reply.send(deleteResponse('Station deleted successfully'));
  }
}

export const stationsController = new StationsController();
