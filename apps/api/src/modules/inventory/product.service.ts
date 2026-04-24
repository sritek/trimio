/**
 * Product Service
 * Business logic for product catalog management including categories, products, and branch settings
 * Requirements: 1.1-1.7, 2.1-2.10, 3.1-3.6
 */

import { prisma, serializeDecimals } from '../../lib/prisma';
import { ForbiddenError, ConflictError, BadRequestError, NotFoundError } from '../../lib/errors';

import type { Prisma, ProductCategory, BranchProductSettings } from '@prisma/client';
import type {
  CreateCategoryInput,
  UpdateCategoryInput,
  CategoryFilters,
  CreateProductInput,
  UpdateProductInput,
  ProductFilters,
  UpdateBranchSettingsInput,
  ProductCategoryWithChildren,
  ProductWithCategory,
  ProductWithSettings,
} from './inventory.types';

/**
 * Generate a URL-friendly slug from a name
 */
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export class ProductService {
  // ============================================
  // Category Management
  // Requirements: 1.1-1.7
  // ============================================

  /**
   * Create a new product category
   * Enforces 2-level hierarchy constraint (Requirement 1.1, 1.3)
   */
  async createCategory(
    tenantId: string,
    data: CreateCategoryInput,
    createdBy?: string
  ): Promise<ProductCategory> {
    // Generate slug if not provided
    const slug = data.slug || generateSlug(data.name);

    // Check for duplicate name within tenant (Requirement 1.2)
    const existingName = await prisma.productCategory.findFirst({
      where: {
        tenantId,
        name: data.name,
        deletedAt: null,
      },
    });

    if (existingName) {
      throw new ConflictError('DUPLICATE_CATEGORY_NAME', 'Category with this name already exists');
    }

    // Check for duplicate slug within tenant
    const existingSlug = await prisma.productCategory.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    });

    if (existingSlug) {
      throw new ConflictError('DUPLICATE_CATEGORY_SLUG', 'Category with this slug already exists');
    }

    // Enforce 2-level hierarchy constraint (Requirement 1.1, 1.3)
    if (data.parentId) {
      const parentCategory = await prisma.productCategory.findFirst({
        where: {
          id: data.parentId,
          tenantId,
          deletedAt: null,
        },
      });

      if (!parentCategory) {
        throw new NotFoundError('PARENT_CATEGORY_NOT_FOUND', 'Parent category not found');
      }

      // Parent category cannot have a parent (max 2 levels)
      if (parentCategory.parentId) {
        throw new BadRequestError(
          'MAX_HIERARCHY_DEPTH',
          'Cannot create category: maximum hierarchy depth is 2 levels'
        );
      }
    }

    // Get next display order if not provided
    let displayOrder = data.displayOrder;
    if (displayOrder === undefined) {
      const maxOrder = await prisma.productCategory.aggregate({
        where: { tenantId, parentId: data.parentId ?? null },
        _max: { displayOrder: true },
      });
      displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
    }

    return prisma.productCategory.create({
      data: {
        tenantId,
        name: data.name,
        slug,
        description: data.description,
        parentId: data.parentId,
        expiryTrackingEnabled: data.expiryTrackingEnabled ?? false,
        displayOrder,
        isActive: data.isActive ?? true,
        createdBy,
      },
    });
  }

  /**
   * Update an existing product category
   */
  async updateCategory(
    tenantId: string,
    categoryId: string,
    data: UpdateCategoryInput,
    _updatedBy?: string
  ): Promise<ProductCategory> {
    const existing = await prisma.productCategory.findFirst({
      where: { id: categoryId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('CATEGORY_NOT_FOUND', 'Category not found');
    }

    // Check name uniqueness if changed (Requirement 1.2)
    if (data.name && data.name !== existing.name) {
      const duplicate = await prisma.productCategory.findFirst({
        where: {
          tenantId,
          name: data.name,
          id: { not: categoryId },
          deletedAt: null,
        },
      });
      if (duplicate) {
        throw new ConflictError(
          'DUPLICATE_CATEGORY_NAME',
          'Category with this name already exists'
        );
      }
    }

    // Check slug uniqueness if changed
    if (data.slug && data.slug !== existing.slug) {
      const duplicateSlug = await prisma.productCategory.findFirst({
        where: {
          tenantId,
          slug: data.slug,
          id: { not: categoryId },
          deletedAt: null,
        },
      });
      if (duplicateSlug) {
        throw new ConflictError(
          'DUPLICATE_CATEGORY_SLUG',
          'Category with this slug already exists'
        );
      }
    }

    // Generate new slug if name changed but slug not provided
    let slug = data.slug;
    if (data.name && data.name !== existing.name && !data.slug) {
      slug = generateSlug(data.name);
      // Check if generated slug is unique
      const slugExists = await prisma.productCategory.findFirst({
        where: {
          tenantId,
          slug,
          id: { not: categoryId },
          deletedAt: null,
        },
      });
      if (slugExists) {
        slug = `${slug}-${Date.now()}`;
      }
    }

    return prisma.productCategory.update({
      where: { id: categoryId },
      data: {
        ...(data.name && { name: data.name }),
        ...(slug && { slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.expiryTrackingEnabled !== undefined && {
          expiryTrackingEnabled: data.expiryTrackingEnabled,
        }),
        ...(data.displayOrder !== undefined && { displayOrder: data.displayOrder }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });
  }

  /**
   * List product categories with optional filtering
   */
  async listCategories(
    tenantId: string,
    filters?: CategoryFilters
  ): Promise<ProductCategoryWithChildren[]> {
    const where: Prisma.ProductCategoryWhereInput = {
      tenantId,
      deletedAt: null,
    };

    // Filter by parent (null for top-level categories)
    if (filters?.parentId !== undefined) {
      where.parentId = filters.parentId;
    }

    // Filter by active status
    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    // Search by name
    if (filters?.search) {
      where.name = { contains: filters.search, mode: 'insensitive' };
    }

    const categories = await prisma.productCategory.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        parent: true,
        children: {
          where: { deletedAt: null },
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    return categories as ProductCategoryWithChildren[];
  }

  /**
   * Get a single category by ID
   */
  async getCategoryById(
    tenantId: string,
    categoryId: string
  ): Promise<ProductCategoryWithChildren | null> {
    const category = await prisma.productCategory.findFirst({
      where: {
        id: categoryId,
        tenantId,
        deletedAt: null,
      },
      include: {
        parent: true,
        children: {
          where: { deletedAt: null },
          orderBy: { displayOrder: 'asc' },
        },
        _count: {
          select: { products: true },
        },
      },
    });

    return category as ProductCategoryWithChildren | null;
  }

  /**
   * Delete a category (soft delete)
   */
  async deleteCategory(tenantId: string, categoryId: string): Promise<void> {
    const category = await prisma.productCategory.findFirst({
      where: { id: categoryId, tenantId, deletedAt: null },
      include: {
        products: { take: 1 },
        children: { take: 1 },
      },
    });

    if (!category) {
      throw new NotFoundError('CATEGORY_NOT_FOUND', 'Category not found');
    }

    // Cannot delete if has products
    if (category.products.length > 0) {
      throw new BadRequestError('CATEGORY_HAS_PRODUCTS', 'Cannot delete category with products');
    }

    // Cannot delete if has children
    if (category.children.length > 0) {
      throw new BadRequestError(
        'CATEGORY_HAS_CHILDREN',
        'Cannot delete category with sub-categories'
      );
    }

    await prisma.productCategory.update({
      where: { id: categoryId },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  // ============================================
  // Product Management
  // Requirements: 2.1-2.10
  // ============================================

  /**
   * Create a new product
   * Requirements: 2.1-2.10
   */
  async createProduct(
    tenantId: string,
    data: CreateProductInput,
    createdBy?: string
  ): Promise<ProductWithCategory> {
    // Check product limit based on branch subscriptions
    const activeSubscriptions = await prisma.branchSubscription.findMany({
      where: {
        tenantId,
        status: { in: ['active', 'trial'] },
      },
      include: {
        plan: {
          select: { maxProducts: true },
        },
      },
    });

    // Calculate total allowed products across all active subscriptions
    // -1 means unlimited
    let maxProducts = 0;
    for (const sub of activeSubscriptions) {
      if (sub.plan.maxProducts === -1) {
        maxProducts = -1; // Unlimited
        break;
      }
      maxProducts += sub.plan.maxProducts;
    }

    if (maxProducts !== -1) {
      const currentProductCount = await prisma.product.count({
        where: {
          tenantId,
          deletedAt: null,
        },
      });

      if (currentProductCount >= maxProducts) {
        throw new ForbiddenError(
          'PRODUCT_LIMIT_REACHED',
          `Product limit reached (${currentProductCount}/${maxProducts}). Please upgrade your plan to add more products.`
        );
      }
    }

    // Validate required fields (Requirement 2.1)
    if (!data.name || !data.categoryId || !data.productType || !data.unitOfMeasure) {
      throw new BadRequestError(
        'MISSING_REQUIRED_FIELDS',
        'Name, category, product type, and unit of measure are required'
      );
    }

    // Validate product type (Requirement 2.1)
    const validProductTypes = ['consumable', 'retail', 'both'];
    if (!validProductTypes.includes(data.productType)) {
      throw new BadRequestError(
        'INVALID_PRODUCT_TYPE',
        'Invalid product type. Must be: consumable, retail, or both'
      );
    }

    // Validate unit of measure (Requirement 2.2)
    const validUnits = ['ml', 'gm', 'pieces', 'bottles', 'sachets', 'tubes', 'boxes'];
    if (!validUnits.includes(data.unitOfMeasure)) {
      throw new BadRequestError(
        'INVALID_UNIT',
        'Invalid unit of measure. Must be: ml, gm, pieces, bottles, sachets, tubes, or boxes'
      );
    }

    // Verify category exists and is active (Requirement 1.5)
    const category = await prisma.productCategory.findFirst({
      where: { id: data.categoryId, tenantId, deletedAt: null },
    });

    if (!category) {
      throw new NotFoundError('CATEGORY_NOT_FOUND', 'Category not found');
    }

    if (!category.isActive) {
      throw new BadRequestError('INACTIVE_CATEGORY', 'Cannot assign product to inactive category');
    }

    // Check SKU uniqueness within tenant (Requirement 2.4)
    if (data.sku) {
      const existingSku = await prisma.product.findUnique({
        where: { tenantId_sku: { tenantId, sku: data.sku } },
      });
      if (existingSku) {
        throw new ConflictError('DUPLICATE_SKU', 'Product with this SKU already exists');
      }
    }

    // Check barcode uniqueness within tenant (Requirement 2.5)
    if (data.barcode) {
      const existingBarcode = await prisma.product.findUnique({
        where: { tenantId_barcode: { tenantId, barcode: data.barcode } },
      });
      if (existingBarcode) {
        throw new ConflictError('DUPLICATE_BARCODE', 'Product with this barcode already exists');
      }
    }

    // Determine expiry tracking (inherit from category if not specified)
    const expiryTrackingEnabled = data.expiryTrackingEnabled ?? category.expiryTrackingEnabled;

    const product = await prisma.product.create({
      data: {
        tenantId,
        categoryId: data.categoryId,
        sku: data.sku,
        barcode: data.barcode,
        name: data.name,
        description: data.description,
        productType: data.productType,
        unitOfMeasure: data.unitOfMeasure,
        defaultPurchasePrice: data.defaultPurchasePrice,
        defaultSellingPrice: data.defaultSellingPrice,
        taxRate: data.taxRate ?? 18,
        hsnCode: data.hsnCode,
        expiryTrackingEnabled,
        imageUrl: data.imageUrl,
        isActive: data.isActive ?? true,
        createdBy,
      },
      include: {
        category: true,
      },
    });

    return serializeDecimals(product) as unknown as ProductWithCategory;
  }

  /**
   * Update an existing product
   */
  async updateProduct(
    tenantId: string,
    productId: string,
    data: UpdateProductInput,
    _updatedBy?: string
  ): Promise<ProductWithCategory> {
    const existing = await prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundError('PRODUCT_NOT_FOUND', 'Product not found');
    }

    // Check SKU uniqueness if changed (Requirement 2.4)
    if (data.sku !== undefined && data.sku !== existing.sku) {
      if (data.sku) {
        const duplicate = await prisma.product.findFirst({
          where: {
            tenantId,
            sku: data.sku,
            id: { not: productId },
            deletedAt: null,
          },
        });
        if (duplicate) {
          throw new ConflictError('DUPLICATE_SKU', 'Product with this SKU already exists');
        }
      }
    }

    // Check barcode uniqueness if changed (Requirement 2.5)
    if (data.barcode !== undefined && data.barcode !== existing.barcode) {
      if (data.barcode) {
        const duplicate = await prisma.product.findFirst({
          where: {
            tenantId,
            barcode: data.barcode,
            id: { not: productId },
            deletedAt: null,
          },
        });
        if (duplicate) {
          throw new ConflictError('DUPLICATE_BARCODE', 'Product with this barcode already exists');
        }
      }
    }

    // Verify category if changed (Requirement 1.5)
    if (data.categoryId && data.categoryId !== existing.categoryId) {
      const category = await prisma.productCategory.findFirst({
        where: { id: data.categoryId, tenantId, deletedAt: null },
      });
      if (!category) {
        throw new NotFoundError('CATEGORY_NOT_FOUND', 'Category not found');
      }
      if (!category.isActive) {
        throw new BadRequestError(
          'INACTIVE_CATEGORY',
          'Cannot assign product to inactive category'
        );
      }
    }

    // Validate product type if changed
    if (data.productType) {
      const validProductTypes = ['consumable', 'retail', 'both'];
      if (!validProductTypes.includes(data.productType)) {
        throw new BadRequestError(
          'INVALID_PRODUCT_TYPE',
          'Invalid product type. Must be: consumable, retail, or both'
        );
      }
    }

    // Validate unit of measure if changed
    if (data.unitOfMeasure) {
      const validUnits = ['ml', 'gm', 'pieces', 'bottles', 'sachets', 'tubes', 'boxes'];
      if (!validUnits.includes(data.unitOfMeasure)) {
        throw new BadRequestError(
          'INVALID_UNIT',
          'Invalid unit of measure. Must be: ml, gm, pieces, bottles, sachets, tubes, or boxes'
        );
      }
    }

    const product = await prisma.product.update({
      where: { id: productId },
      data: {
        ...(data.categoryId && { categoryId: data.categoryId }),
        ...(data.sku !== undefined && { sku: data.sku }),
        ...(data.barcode !== undefined && { barcode: data.barcode }),
        ...(data.name && { name: data.name }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.productType && { productType: data.productType }),
        ...(data.unitOfMeasure && { unitOfMeasure: data.unitOfMeasure }),
        ...(data.defaultPurchasePrice !== undefined && {
          defaultPurchasePrice: data.defaultPurchasePrice,
        }),
        ...(data.defaultSellingPrice !== undefined && {
          defaultSellingPrice: data.defaultSellingPrice,
        }),
        ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
        ...(data.hsnCode !== undefined && { hsnCode: data.hsnCode }),
        ...(data.expiryTrackingEnabled !== undefined && {
          expiryTrackingEnabled: data.expiryTrackingEnabled,
        }),
        ...(data.imageUrl !== undefined && { imageUrl: data.imageUrl }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
      include: {
        category: true,
      },
    });

    return serializeDecimals(product) as unknown as ProductWithCategory;
  }

  /**
   * Get a single product by ID
   */
  async getProduct(
    tenantId: string,
    productId: string,
    branchId?: string
  ): Promise<ProductWithSettings | null> {
    const product = await prisma.product.findFirst({
      where: {
        id: productId,
        tenantId,
        deletedAt: null,
      },
      include: {
        category: true,
        ...(branchId && {
          branchSettings: {
            where: { branchId },
          },
        }),
      },
    });

    if (!product) {
      return null;
    }

    // Calculate effective selling price (Requirement 3.5, 3.6)
    const branchSettings = branchId ? (product as any).branchSettings?.[0] : null;
    const effectiveSellingPrice = branchSettings?.sellingPriceOverride
      ? Number(branchSettings.sellingPriceOverride)
      : Number(product.defaultSellingPrice);

    return serializeDecimals({
      ...product,
      branchSettings: branchSettings || null,
      effectiveSellingPrice,
    }) as unknown as ProductWithSettings;
  }

  /**
   * List products with filtering and pagination
   */
  async listProducts(
    tenantId: string,
    filters?: ProductFilters,
    branchId?: string
  ): Promise<{ data: ProductWithSettings[]; total: number; page: number; limit: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;

    const where: Prisma.ProductWhereInput = {
      tenantId,
      deletedAt: null,
    };

    // Apply filters
    if (filters?.categoryId) {
      where.categoryId = filters.categoryId;
    }

    if (filters?.productType) {
      where.productType = filters.productType;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
        { barcode: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Get total count
    const total = await prisma.product.count({ where });

    // Determine sort field and order
    const sortBy = filters?.sortBy ?? 'name';
    const sortOrder = filters?.sortOrder ?? 'asc';

    // Get paginated data
    const products = await prisma.product.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        category: {
          select: { id: true, name: true, slug: true },
        },
        ...(branchId && {
          branchSettings: {
            where: { branchId },
          },
        }),
      },
    });

    // Calculate effective selling prices (Requirement 3.5, 3.6)
    const productsWithSettings = products.map((product) => {
      const branchSettings = branchId ? (product as any).branchSettings?.[0] : null;
      const effectiveSellingPrice = branchSettings?.sellingPriceOverride
        ? Number(branchSettings.sellingPriceOverride)
        : Number(product.defaultSellingPrice);

      return {
        ...product,
        branchSettings: branchSettings || null,
        effectiveSellingPrice,
      };
    });

    return {
      data: serializeDecimals(productsWithSettings) as unknown as ProductWithSettings[],
      total,
      page,
      limit,
    };
  }

  /**
   * Delete a product (soft delete)
   * Requirement 2.8: Inactive products cannot be used in new POs or stock receipts
   */
  async deleteProduct(tenantId: string, productId: string): Promise<void> {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
      include: {
        stockBatches: {
          where: { isDepleted: false },
          take: 1,
        },
      },
    });

    if (!product) {
      throw new NotFoundError('PRODUCT_NOT_FOUND', 'Product not found');
    }

    // Check if product has active stock
    if (product.stockBatches.length > 0) {
      // Soft delete only - mark as inactive
      await prisma.product.update({
        where: { id: productId },
        data: { deletedAt: new Date(), isActive: false },
      });
    } else {
      // Can hard delete if no stock
      await prisma.$transaction([
        prisma.branchProductSettings.deleteMany({ where: { productId } }),
        prisma.vendorProductMapping.deleteMany({ where: { productId } }),
        prisma.serviceConsumableMapping.deleteMany({ where: { productId } }),
        prisma.product.delete({ where: { id: productId } }),
      ]);
    }
  }

  // ============================================
  // Branch Product Settings
  // Requirements: 3.1-3.6
  // ============================================

  /**
   * Get branch-specific settings for a product
   * Requirement 3.6: Returns tenant defaults if no branch settings exist
   */
  async getBranchSettings(
    tenantId: string,
    branchId: string,
    productId: string
  ): Promise<BranchProductSettings | null> {
    // First verify the product exists
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundError('PRODUCT_NOT_FOUND', 'Product not found');
    }

    const settings = await prisma.branchProductSettings.findUnique({
      where: { branchId_productId: { branchId, productId } },
    });

    return settings ? serializeDecimals(settings) : null;
  }

  /**
   * Update branch-specific settings for a product
   * Requirements: 3.1-3.5
   */
  async updateBranchSettings(
    tenantId: string,
    branchId: string,
    productId: string,
    data: UpdateBranchSettingsInput
  ): Promise<BranchProductSettings> {
    // Verify product exists
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundError('PRODUCT_NOT_FOUND', 'Product not found');
    }

    // Upsert branch settings
    const settings = await prisma.branchProductSettings.upsert({
      where: { branchId_productId: { branchId, productId } },
      create: {
        tenantId,
        branchId,
        productId,
        isEnabled: data.isEnabled ?? true,
        reorderLevel: data.reorderLevel,
        sellingPriceOverride: data.sellingPriceOverride,
      },
      update: {
        ...(data.isEnabled !== undefined && { isEnabled: data.isEnabled }),
        ...(data.reorderLevel !== undefined && { reorderLevel: data.reorderLevel }),
        ...(data.sellingPriceOverride !== undefined && {
          sellingPriceOverride: data.sellingPriceOverride,
        }),
      },
    });

    return serializeDecimals(settings);
  }

  /**
   * Get effective selling price for a product at a branch
   * Requirement 3.5: Branch override takes precedence over tenant default
   */
  async getEffectiveSellingPrice(
    tenantId: string,
    branchId: string,
    productId: string
  ): Promise<number> {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null },
      include: {
        branchSettings: {
          where: { branchId },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('PRODUCT_NOT_FOUND', 'Product not found');
    }

    const branchSettings = (product as any).branchSettings?.[0];

    // Requirement 3.5: Branch override takes precedence
    if (branchSettings?.sellingPriceOverride) {
      return Number(branchSettings.sellingPriceOverride);
    }

    // Requirement 3.6: Fall back to tenant default
    return Number(product.defaultSellingPrice);
  }

  /**
   * Check if a product is enabled at a branch
   * Requirement 3.2: Disabled products cannot be used for stock operations
   */
  async isProductEnabledAtBranch(
    tenantId: string,
    branchId: string,
    productId: string
  ): Promise<boolean> {
    const product = await prisma.product.findFirst({
      where: { id: productId, tenantId, deletedAt: null, isActive: true },
      include: {
        branchSettings: {
          where: { branchId },
        },
      },
    });

    if (!product) {
      return false;
    }

    const branchSettings = (product as any).branchSettings?.[0];

    // If no branch settings exist, product is enabled by default (Requirement 3.6)
    if (!branchSettings) {
      return true;
    }

    return branchSettings.isEnabled;
  }

  /**
   * Bulk update branch settings for multiple products
   */
  async bulkUpdateBranchSettings(
    tenantId: string,
    branchId: string,
    updates: Array<{ productId: string; settings: UpdateBranchSettingsInput }>
  ): Promise<BranchProductSettings[]> {
    const results: BranchProductSettings[] = [];

    for (const update of updates) {
      const settings = await this.updateBranchSettings(
        tenantId,
        branchId,
        update.productId,
        update.settings
      );
      results.push(settings);
    }

    return results;
  }
}

export const productService = new ProductService();
