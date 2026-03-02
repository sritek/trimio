/**
 * Floor View Controller
 * Request handlers for floor view data
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { successResponse } from '../../lib/response';
import { floorViewService } from './floor-view.service';

export class FloorViewController {
  /**
   * Get floor view data for a branch
   */
  async getFloorView(
    request: FastifyRequest<{ Params: { branchId: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user!;

    const floorView = await floorViewService.getFloorView(tenantId, request.params.branchId);

    return reply.send(successResponse(floorView));
  }
}

export const floorViewController = new FloorViewController();
