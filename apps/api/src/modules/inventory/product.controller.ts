/**
 * Product Controller
 * Request handlers for product catalog management
 * Requirements: 1.1-1.7, 2.1-2.10, 3.1-3.6
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
import { productService } from './product.service';

import type {
  CategoryQuery,
  CreateCategoryBody,
  UpdateCategoryBody,
  ProductQuery,
  CreateProductBody,
  UpdateProductBody,
  UpdateBranchSettingsBody,
  BulkUpdateBranchSettingsBody,
} from './product.schema';

export class ProductController {
  // ============================================
  // Category Handlers
  // ============================================

  /**
   * Get all product categories
   */
  async getCategories(
    request: FastifyRequest<{ Querystring: CategoryQuery }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;

    const categories = await productService.listCategories(tenantId, request.query);

    return reply.send(successResponse(categories));
  }

  /**
   * Get a single category by ID
   */
  async getCategoryById(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    const category = await productService.getCategoryById(tenantId, request.params.id);

    if (!category) {
      return reply
        .code(404)
        .send({
          success: false,
          error: { code: 'CATEGORY_NOT_FOUND', message: 'Category not found' },
        });
    }

    return reply.send(successResponse(category));
  }

  /**
   * Create a new product category
   */
  async createCategory(request: FastifyRequest<{ Body: CreateCategoryBody }>, reply: FastifyReply) {
    const { tenantId, sub } = request.user;

    const category = await productService.createCategory(tenantId, request.body, sub);

    return reply.code(201).send(successResponse(category));
  }

  /**
   * Update a product category
   */
  async updateCategory(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateCategoryBody }>,
    reply: FastifyReply
  ) {
    const { tenantId, sub } = request.user;

    const category = await productService.updateCategory(
      tenantId,
      request.params.id,
      request.body,
      sub
    );

    return reply.send(successResponse(category));
  }

  /**
   * Delete a product category
   */
  async deleteCategory(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    await productService.deleteCategory(tenantId, request.params.id);

    return reply.send(deleteResponse('Category deleted successfully'));
  }

  // ============================================
  // Product Handlers
  // ============================================

  /**
   * Get all products
   */
  async getProducts(request: FastifyRequest<{ Querystring: ProductQuery }>, reply: FastifyReply) {
    const { tenantId } = request.user;
    const { branchId, ...filters } = request.query;

    const result = await productService.listProducts(tenantId, filters, branchId);

    return reply.send(
      paginatedResponse(result.data, buildPaginationMeta(result.page, result.limit, result.total))
    );
  }

  /**
   * Get a single product by ID
   */
  async getProductById(
    request: FastifyRequest<{ Params: { id: string }; Querystring: { branchId?: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;
    const { branchId } = request.query;

    const product = await productService.getProduct(tenantId, request.params.id, branchId);

    if (!product) {
      return reply
        .code(404)
        .send({
          success: false,
          error: { code: 'PRODUCT_NOT_FOUND', message: 'Product not found' },
        });
    }

    return reply.send(successResponse(product));
  }

  /**
   * Create a new product
   */
  async createProduct(request: FastifyRequest<{ Body: CreateProductBody }>, reply: FastifyReply) {
    const { tenantId, sub } = request.user;

    const product = await productService.createProduct(tenantId, request.body, sub);

    return reply.code(201).send(successResponse(product));
  }

  /**
   * Update a product
   */
  async updateProduct(
    request: FastifyRequest<{ Params: { id: string }; Body: UpdateProductBody }>,
    reply: FastifyReply
  ) {
    const { tenantId, sub } = request.user;

    const product = await productService.updateProduct(
      tenantId,
      request.params.id,
      request.body,
      sub
    );

    return reply.send(successResponse(product));
  }

  /**
   * Delete a product
   */
  async deleteProduct(request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) {
    const { tenantId } = request.user;

    await productService.deleteProduct(tenantId, request.params.id);

    return reply.send(deleteResponse('Product deleted successfully'));
  }

  // ============================================
  // Branch Product Settings Handlers
  // ============================================

  /**
   * Get branch-specific settings for a product
   */
  async getBranchSettings(
    request: FastifyRequest<{ Params: { id: string; branchId: string } }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;
    const { id: productId, branchId } = request.params;

    const settings = await productService.getBranchSettings(tenantId, branchId, productId);

    // If no settings exist, return default values
    if (!settings) {
      return reply.send(
        successResponse({
          productId,
          branchId,
          isEnabled: true,
          reorderLevel: null,
          sellingPriceOverride: null,
        })
      );
    }

    return reply.send(successResponse(settings));
  }

  /**
   * Update branch-specific settings for a product
   */
  async updateBranchSettings(
    request: FastifyRequest<{
      Params: { id: string; branchId: string };
      Body: UpdateBranchSettingsBody;
    }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;
    const { id: productId, branchId } = request.params;

    const settings = await productService.updateBranchSettings(
      tenantId,
      branchId,
      productId,
      request.body
    );

    return reply.send(successResponse(settings));
  }

  /**
   * Bulk update branch settings for multiple products
   */
  async bulkUpdateBranchSettings(
    request: FastifyRequest<{
      Params: { branchId: string };
      Body: BulkUpdateBranchSettingsBody;
    }>,
    reply: FastifyReply
  ) {
    const { tenantId } = request.user;
    const { branchId } = request.params;

    const results = await productService.bulkUpdateBranchSettings(
      tenantId,
      branchId,
      request.body.updates
    );

    return reply.send(successResponse(results));
  }
}

export const productController = new ProductController();
