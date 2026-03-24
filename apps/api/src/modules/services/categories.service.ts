/**
 * Categories Service
 * Business logic for service category management
 */

import { prisma } from '../../lib/prisma';

import type { ServiceCategory } from '@prisma/client';
import type {
  CategoryQuery,
  CreateCategoryBody,
  ReorderCategoriesBody,
  UpdateCategoryBody,
} from './services.schema';

// Helper to generate slug from name
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// Helper to build category tree
interface CategoryWithChildren extends ServiceCategory {
  subCategories?: CategoryWithChildren[];
}

function buildCategoryTree(categories: ServiceCategory[]): CategoryWithChildren[] {
  const categoryMap = new Map<string, CategoryWithChildren>();
  const rootCategories: CategoryWithChildren[] = [];

  // First pass: create map of all categories
  categories.forEach((cat) => {
    categoryMap.set(cat.id, { ...cat, subCategories: [] });
  });

  // Second pass: build tree
  categories.forEach((cat) => {
    const category = categoryMap.get(cat.id)!;
    if (cat.parentId) {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        parent.subCategories!.push(category);
      }
    } else {
      rootCategories.push(category);
    }
  });

  return rootCategories;
}

export class CategoriesService {
  /**
   * Get all categories for a tenant
   */
  async getCategories(
    tenantId: string,
    query: CategoryQuery
  ): Promise<CategoryWithChildren[] | ServiceCategory[]> {
    const where: Record<string, unknown> = {
      tenantId,
      deletedAt: null,
    };

    if (!query.includeInactive) {
      where.isActive = true;
    }

    if (query.parentId !== undefined) {
      where.parentId = query.parentId;
    }

    const categories = await prisma.serviceCategory.findMany({
      where,
      orderBy: [{ level: 'asc' }, { displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        _count: {
          select: { services: true },
        },
      },
    });

    // Return flat list or tree based on query
    if (query.flat) {
      return categories;
    }

    return buildCategoryTree(categories);
  }

  /**
   * Get a single category by ID
   */
  async getCategoryById(tenantId: string, categoryId: string): Promise<ServiceCategory | null> {
    return prisma.serviceCategory.findFirst({
      where: {
        id: categoryId,
        tenantId,
        deletedAt: null,
      },
      include: {
        _count: {
          select: { services: true },
        },
        parent: true,
        subCategories: {
          where: { deletedAt: null },
          orderBy: { displayOrder: 'asc' },
        },
      },
    });
  }

  /**
   * Create a new category
   */
  async createCategory(
    tenantId: string,
    data: CreateCategoryBody,
    createdBy?: string
  ): Promise<ServiceCategory> {
    // Generate slug if not provided
    const slug = data.slug || slugify(data.name);

    // Check for duplicate slug
    const existing = await prisma.serviceCategory.findUnique({
      where: { tenantId_slug: { tenantId, slug } },
    });

    if (existing) {
      throw new Error('Category with this slug already exists');
    }

    // Calculate level based on parent
    let level = 1;
    if (data.parentId) {
      const parent = await prisma.serviceCategory.findUnique({
        where: { id: data.parentId },
      });
      if (!parent || parent.tenantId !== tenantId) {
        throw new Error('Parent category not found');
      }
      level = parent.level + 1;
      if (level > 3) {
        throw new Error('Maximum category depth (3 levels) exceeded');
      }
    }

    // Get next display order if not provided
    let displayOrder = data.displayOrder;
    if (displayOrder === undefined) {
      const maxOrder = await prisma.serviceCategory.aggregate({
        where: { tenantId, parentId: data.parentId ?? null },
        _max: { displayOrder: true },
      });
      displayOrder = (maxOrder._max.displayOrder ?? -1) + 1;
    }

    return prisma.serviceCategory.create({
      data: {
        tenantId,
        name: data.name,
        slug,
        description: data.description,
        color: data.color,
        parentId: data.parentId,
        level,
        displayOrder,
        isActive: data.isActive,
        createdBy,
      },
    });
  }

  /**
   * Update a category
   */
  async updateCategory(
    tenantId: string,
    categoryId: string,
    data: UpdateCategoryBody
  ): Promise<ServiceCategory> {
    const existing = await prisma.serviceCategory.findFirst({
      where: { id: categoryId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new Error('Category not found');
    }

    // Check slug uniqueness if changed
    if (data.slug && data.slug !== existing.slug) {
      const duplicate = await prisma.serviceCategory.findFirst({
        where: {
          tenantId,
          slug: data.slug,
          id: { not: categoryId },
        },
      });
      if (duplicate) {
        throw new Error('Category with this slug already exists');
      }
    }

    // Calculate new level if parent changed
    let level = existing.level;
    if (data.parentId !== undefined && data.parentId !== existing.parentId) {
      if (data.parentId === null) {
        level = 1;
      } else {
        // Prevent circular reference
        if (data.parentId === categoryId) {
          throw new Error('Category cannot be its own parent');
        }

        const parent = await prisma.serviceCategory.findUnique({
          where: { id: data.parentId },
        });
        if (!parent || parent.tenantId !== tenantId) {
          throw new Error('Parent category not found');
        }
        level = parent.level + 1;
        if (level > 3) {
          throw new Error('Maximum category depth (3 levels) exceeded');
        }
      }
    }

    return prisma.serviceCategory.update({
      where: { id: categoryId },
      data: {
        ...data,
        level,
      },
    });
  }

  /**
   * Delete a category (soft delete)
   */
  async deleteCategory(tenantId: string, categoryId: string): Promise<void> {
    const category = await prisma.serviceCategory.findFirst({
      where: { id: categoryId, tenantId, deletedAt: null },
      include: {
        _count: {
          select: { services: true, subCategories: true },
        },
      },
    });

    if (!category) {
      throw new Error('Category not found');
    }

    // Check for subcategories
    if (category._count.subCategories > 0) {
      throw new Error('Cannot delete category with subcategories');
    }

    // Check for active services
    if (category._count.services > 0) {
      throw new Error('Cannot delete category with services. Move or delete services first.');
    }

    await prisma.serviceCategory.update({
      where: { id: categoryId },
      data: { deletedAt: new Date() },
    });
  }

  /**
   * Reorder categories
   */
  async reorderCategories(tenantId: string, data: ReorderCategoriesBody): Promise<void> {
    // Verify all categories belong to tenant
    const categoryIds = data.categories.map((c) => c.id);
    const categories = await prisma.serviceCategory.findMany({
      where: {
        id: { in: categoryIds },
        tenantId,
        deletedAt: null,
      },
    });

    if (categories.length !== categoryIds.length) {
      throw new Error('Some categories not found');
    }

    // Update display orders in transaction
    await prisma.$transaction(
      data.categories.map(({ id, displayOrder }) =>
        prisma.serviceCategory.update({
          where: { id },
          data: { displayOrder },
        })
      )
    );
  }
}

export const categoriesService = new CategoriesService();
