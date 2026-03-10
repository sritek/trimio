/**
 * Branch Pricing Controller
 * Request handlers for branch-specific service pricing
 *
 * Note: Authentication, authorization, and branch access are handled by middleware (preHandler)
 * request.user is guaranteed to be populated when handlers are called
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { branchPricingService } from './branch-pricing.service';
import { successResponse } from '@/lib/response';

import type { BulkUpdateBranchPricesBody, UpdateBranchPriceBody } from './services.schema';

export class BranchPricingController {
  /**
   * Get all service prices for a branch
   */
  async getBranchServicePrices(
    request: FastifyRequest<{ Params: { id: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const prices = await branchPricingService.getBranchServicePrices(tenantId, request.params.id);

    return reply.send(successResponse(prices));
  }

  /**
   * Bulk update service prices for a branch
   */
  async bulkUpdateBranchServicePrices(
    request: FastifyRequest<{
      Params: { id: string };
      Body: BulkUpdateBranchPricesBody;
    }>,
    reply: FastifyReply
  ) {
    const { tenantId, sub } = request.user;

    const result = await branchPricingService.bulkUpdateBranchServicePrices(
      tenantId,
      request.params.id,
      request.body,
      sub
    );

    return reply.send(successResponse(result));
  }

  /**
   * Update a single service price for a branch
   */
  async updateBranchServicePrice(
    request: FastifyRequest<{
      Params: { id: string; sid: string };
      Body: UpdateBranchPriceBody;
    }>,
    reply: FastifyReply
  ) {
    const { tenantId, sub } = request.user;

    const branchPrice = await branchPricingService.updateBranchServicePrice(
      tenantId,
      request.params.id,
      request.params.sid,
      request.body,
      sub
    );

    return reply.send(successResponse(branchPrice));
  }
}

export const branchPricingController = new BranchPricingController();
