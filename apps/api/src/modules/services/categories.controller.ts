/**
 * Categories Controller
 * Request handlers for service categories
 *
 * Note: Authentication and authorization are handled by middleware (preHandler)
 * request.user is guaranteed to be populated when handlers are called
 */

import type { FastifyReply, FastifyRequest } from 'fastify';

import { categoriesService } from './categories.service';
import { successResponse, deleteResponse, errorResponse } from '@/lib/response';

import type {
  CategoryQuery,
  CreateCategoryBody,
  ReorderCategoriesBody,
  UpdateCategoryBody,
} from './services.schema';

export class CategoriesController {
  /**
   * Get all categories
   */
  async getCategories(
    request: FastifyRequest<{ Querystring: CategoryQuery }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const categories = await categoriesService.getCategories(tenantId, request.query);

    return reply.send(successResponse(categories));
  }

  /**
   * Get a single category
   */
  async getCategoryById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    const category = await categoriesService.getCategoryById(tenantId, request.params.id);

    if (!category) {
      return reply.code(404).send(errorResponse('NOT_FOUND', 'Category not found'));
    }

    return reply.send(successResponse(category));
  }

  /**
   * Create a new category
   */
  async createCategory(request: FastifyRequest<{ Body: CreateCategoryBody }>, reply: FastifyReply) {
    const { tenantId, sub } = request.user;

    const category = await categoriesService.createCategory(tenantId, request.body, sub);

    return reply.code(201).send(successResponse(category));
  }

  /**
   * Update a category
   */
  async updateCategory(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateCategoryBody }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const category = await categoriesService.updateCategory(
      tenantId,
      request.params.id,
      request.body
    );

    return reply.send(successResponse(category));
  }

  /**
   * Delete a category
   */
  async deleteCategory(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    await categoriesService.deleteCategory(tenantId, request.params.id);

    return reply.send(deleteResponse('Category deleted successfully'));
  }

  /**
   * Reorder categories
   */
  async reorderCategories(
    request: FastifyRequest<{ Body: ReorderCategoriesBody }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    await categoriesService.reorderCategories(tenantId, request.body);

    return reply.send(deleteResponse('Categories reordered successfully'));
  }
}

export const categoriesController = new CategoriesController();
