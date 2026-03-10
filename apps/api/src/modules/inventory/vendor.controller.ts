/**
 * Vendor Controller
 * Request handlers for vendor management
 * Requirements: 4.1-4.5, 5.1-5.5
 *
 * Note: Authentication and authorization are handled by middleware (preHandler)
 * request.user is guaranteed to be populated when handlers are called
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import {
  successResponse,
  paginatedResponse,
  deleteResponse,
  buildPaginationMeta,
} from '../../lib/response';
import { vendorService } from './vendor.service';

import type {
  VendorQuery,
  CreateVendorBody,
  UpdateVendorBody,
  CreateVendorProductBody,
  UpdateVendorProductBody,
} from './vendor.schema';

export class VendorController {
  // ============================================
  // Vendor Handlers
  // ============================================

  /**
   * Get all vendors
   */
  async getVendors(request: FastifyRequest<{ Querystring: VendorQuery }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    const result = await vendorService.listVendors(tenantId, request.query);

    return reply.send(
      paginatedResponse(result.data, buildPaginationMeta(result.page, result.limit, result.total))
    );
  }

  /**
   * Get a single vendor by ID
   */
  async getVendorById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    const vendor = await vendorService.getVendor(tenantId, request.params.id);

    if (!vendor) {
      return reply
        .code(404)
        .send({ success: false, error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' } });
    }

    return reply.send(successResponse(vendor));
  }

  /**
   * Create a new vendor
   */
  async createVendor(request: FastifyRequest<{ Body: CreateVendorBody }>, reply: FastifyReply) {
    const { tenantId, sub } = request.user;

    const vendor = await vendorService.createVendor(tenantId, request.body, sub);

    return reply.code(201).send(successResponse(vendor));
  }

  /**
   * Update a vendor
   */
  async updateVendor(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateVendorBody }>,
    reply: FastifyReply
  ) {
    const { tenantId, sub } = request.user;

    const vendor = await vendorService.updateVendor(tenantId, request.params.id, request.body, sub);

    return reply.send(successResponse(vendor));
  }

  /**
   * Delete a vendor
   */
  async deleteVendor(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    await vendorService.deleteVendor(tenantId, request.params.id);

    return reply.send(deleteResponse('Vendor deleted successfully'));
  }

  // ============================================
  // Vendor-Product Mapping Handlers
  // ============================================

  /**
   * Get all products for a vendor
   */
  async getVendorProducts(
    request: FastifyRequest<{ Params: { vendorId: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    // Verify vendor exists
    const vendor = await vendorService.getVendor(tenantId, request.params.vendorId);
    if (!vendor) {
      return reply
        .code(404)
        .send({ success: false, error: { code: 'VENDOR_NOT_FOUND', message: 'Vendor not found' } });
    }

    const products = await vendorService.getProductsForVendor(tenantId, request.params.vendorId);

    return reply.send(successResponse(products));
  }

  /**
   * Get all vendors for a product
   */
  async getProductVendors(
    request: FastifyRequest<{ Params: { productId: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const vendors = await vendorService.getVendorsForProduct(tenantId, request.params.productId);

    return reply.send(successResponse(vendors));
  }

  /**
   * Map a product to a vendor
   */
  async createVendorProduct(
    request: FastifyRequest<{ Body: CreateVendorProductBody }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const mapping = await vendorService.mapProductToVendor(tenantId, request.body);

    return reply.code(201).send(successResponse(mapping));
  }

  /**
   * Update a vendor-product mapping
   */
  async updateVendorProduct(
    request: FastifyRequest<{ Params: { mappingId: string }; Body: UpdateVendorProductBody }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const mapping = await vendorService.updateVendorProduct(
      tenantId,
      request.params.mappingId,
      request.body
    );

    return reply.send(successResponse(mapping));
  }

  /**
   * Delete a vendor-product mapping
   */
  async deleteVendorProduct(
    request: FastifyRequest<{ Params: { mappingId: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    await vendorService.deleteVendorProduct(tenantId, request.params.mappingId);

    return reply.send(deleteResponse('Vendor-product mapping deleted successfully'));
  }
}

export const vendorController = new VendorController();
