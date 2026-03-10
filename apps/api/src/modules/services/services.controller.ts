/**
 * Services Controller
 * Request handlers for service management
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
import { servicesService } from './services.service';

import type {
  CatalogQuery,
  CreateServiceBody,
  ServiceQuery,
  UpdateServiceBody,
} from './services.schema';

export class ServicesController {
  /**
   * Get all services
   */
  async getServices(request: FastifyRequest<{ Querystring: ServiceQuery }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    const result = await servicesService.getServices(tenantId, request.query);

    return reply.send(
      paginatedResponse(result.data, buildPaginationMeta(result.page, result.limit, result.total))
    );
  }

  /**
   * Get a single service
   */
  async getServiceById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    const service = await servicesService.getServiceById(tenantId, request.params.id);

    if (!service) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Service not found'));
    }

    return reply.send(successResponse(service));
  }

  /**
   * Create a new service
   */
  async createService(request: FastifyRequest<{ Body: CreateServiceBody }>, reply: FastifyReply) {
    const { tenantId, sub } = request.user;

    const service = await servicesService.createService(tenantId, request.body, sub);

    return reply.code(201).send(successResponse(service));
  }

  /**
   * Update a service
   */
  async updateService(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateServiceBody }>,
    reply: FastifyReply
  ) {
    const { tenantId, sub } = request.user;

    const service = await servicesService.updateService(
      tenantId,
      request.params.id,
      request.body,
      sub
    );

    return reply.send(successResponse(service));
  }

  /**
   * Delete a service
   */
  async deleteService(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    await servicesService.deleteService(tenantId, request.params.id);

    return reply.send(deleteResponse('Service deleted successfully'));
  }

  /**
   * Duplicate a service
   */
  async duplicateService(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId, sub } = request.user;

    const service = await servicesService.duplicateService(tenantId, request.params.id, sub);

    return reply.code(201).send(successResponse(service));
  }

  /**
   * Get service catalog
   */
  async getServiceCatalog(
    request: FastifyRequest<{ Querystring: CatalogQuery }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const catalog = await servicesService.getServiceCatalog(tenantId, request.query);

    return reply.send(successResponse(catalog));
  }
}

export const servicesController = new ServicesController();
