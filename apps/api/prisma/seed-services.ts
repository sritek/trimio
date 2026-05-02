/* eslint-disable no-console */
/// <reference types="node" />
/**
 * Seed Services Script
 * Seeds only service categories and services for a specific tenant
 *
 * Usage: pnpm db:seed-services <tenant-id>
 *
 * Example: pnpm db:seed-services cm5abc123def456
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get tenant ID from command line args
  const tenantId = process.argv[2];

  if (!tenantId) {
    console.error('❌ Tenant ID is required.');
    console.error('');
    console.error('Usage: pnpm db:seed-services <tenant-id>');
    console.error('');
    console.error('Example: pnpm db:seed-services cm5abc123def456');
    process.exit(1);
  }

  console.log('🌱 Seeding service categories and services...');

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    console.error(`❌ Tenant not found with ID: ${tenantId}`);
    process.exit(1);
  }
  console.log(`📍 Using tenant: ${tenant.name} (${tenantId})`);

  // Get branches for branch pricing
  const branches = await prisma.branch.findMany({ where: { tenantId } });
  console.log(`📍 Found ${branches.length} branch(es)`);

  // Clear existing services data
  console.log('🗑️  Clearing existing services data...');
  await prisma.branchServicePrice.deleteMany({ where: { tenantId } });
  await prisma.service.deleteMany({ where: { tenantId } });
  await prisma.serviceCategory.deleteMany({ where: { tenantId } });

  // Seed categories
  const categoriesData = [
    {
      name: 'Hair Services',
      slug: 'hair-services',
      color: '#8B5CF6',
      displayOrder: 0,
    },
    {
      name: 'Skin Care',
      slug: 'skin-care',
      color: '#EC4899',
      displayOrder: 1,
    },
    {
      name: 'Nail Services',
      slug: 'nail-services',
      color: '#F59E0B',
      displayOrder: 2,
    },
    {
      name: 'Makeup',
      slug: 'makeup',
      color: '#EF4444',
      displayOrder: 3,
    },
    {
      name: 'Spa & Wellness',
      slug: 'spa-wellness',
      color: '#22C55E',
      displayOrder: 4,
    },
  ];

  const categories = await prisma.serviceCategory.createManyAndReturn({
    data: categoriesData.map((c) => ({ tenantId, ...c, isActive: true })),
  });

  console.log(`✅ Created ${categories.length} categories`);

  // Seed services
  const servicesData = [
    // Hair Services
    {
      categoryId: categories[0].id,
      sku: 'HAIR-001',
      name: 'Haircut - Men',
      basePrice: 300,
      duration: 30,
      commission: 10,
    },
    {
      categoryId: categories[0].id,
      sku: 'HAIR-002',
      name: 'Haircut - Women',
      basePrice: 500,
      duration: 45,
      commission: 10,
    },
    {
      categoryId: categories[0].id,
      sku: 'HAIR-003',
      name: 'Hair Color - Global',
      basePrice: 2500,
      duration: 120,
      commission: 12,
    },
    {
      categoryId: categories[0].id,
      sku: 'HAIR-004',
      name: 'Hair Color - Highlights',
      basePrice: 3500,
      duration: 150,
      commission: 12,
    },
    {
      categoryId: categories[0].id,
      sku: 'HAIR-005',
      name: 'Hair Spa',
      basePrice: 1200,
      duration: 60,
      commission: 10,
    },
    {
      categoryId: categories[0].id,
      sku: 'HAIR-006',
      name: 'Keratin Treatment',
      basePrice: 8000,
      duration: 180,
      commission: 15,
    },
    {
      categoryId: categories[0].id,
      sku: 'HAIR-007',
      name: 'Hair Smoothening',
      basePrice: 6000,
      duration: 180,
      commission: 15,
    },
    {
      categoryId: categories[0].id,
      sku: 'HAIR-008',
      name: 'Blow Dry',
      basePrice: 400,
      duration: 30,
      commission: 8,
    },

    // Skin Care
    {
      categoryId: categories[1].id,
      sku: 'SKIN-001',
      name: 'Basic Facial',
      basePrice: 800,
      duration: 45,
      commission: 10,
    },
    {
      categoryId: categories[1].id,
      sku: 'SKIN-002',
      name: 'Gold Facial',
      basePrice: 1500,
      duration: 60,
      commission: 10,
    },
    {
      categoryId: categories[1].id,
      sku: 'SKIN-003',
      name: 'Diamond Facial',
      basePrice: 2500,
      duration: 75,
      commission: 12,
    },
    {
      categoryId: categories[1].id,
      sku: 'SKIN-004',
      name: 'Cleanup',
      basePrice: 500,
      duration: 30,
      commission: 8,
    },
    {
      categoryId: categories[1].id,
      sku: 'SKIN-005',
      name: 'Bleach - Face',
      basePrice: 400,
      duration: 25,
      commission: 8,
    },
    {
      categoryId: categories[1].id,
      sku: 'SKIN-006',
      name: 'De-Tan',
      basePrice: 600,
      duration: 30,
      commission: 8,
    },

    // Nail Services
    {
      categoryId: categories[2].id,
      sku: 'NAIL-001',
      name: 'Manicure - Basic',
      basePrice: 400,
      duration: 30,
      commission: 8,
    },
    {
      categoryId: categories[2].id,
      sku: 'NAIL-002',
      name: 'Manicure - Spa',
      basePrice: 700,
      duration: 45,
      commission: 10,
    },
    {
      categoryId: categories[2].id,
      sku: 'NAIL-003',
      name: 'Pedicure - Basic',
      basePrice: 500,
      duration: 40,
      commission: 8,
    },
    {
      categoryId: categories[2].id,
      sku: 'NAIL-004',
      name: 'Pedicure - Spa',
      basePrice: 900,
      duration: 60,
      commission: 10,
    },
    {
      categoryId: categories[2].id,
      sku: 'NAIL-005',
      name: 'Nail Art',
      basePrice: 300,
      duration: 30,
      commission: 10,
    },
    {
      categoryId: categories[2].id,
      sku: 'NAIL-006',
      name: 'Gel Nails',
      basePrice: 1500,
      duration: 90,
      commission: 12,
    },

    // Makeup
    {
      categoryId: categories[3].id,
      sku: 'MAKEUP-001',
      name: 'Party Makeup',
      basePrice: 2500,
      duration: 60,
      commission: 12,
    },
    {
      categoryId: categories[3].id,
      sku: 'MAKEUP-002',
      name: 'Bridal Makeup',
      basePrice: 15000,
      duration: 180,
      commission: 15,
    },
    {
      categoryId: categories[3].id,
      sku: 'MAKEUP-003',
      name: 'Engagement Makeup',
      basePrice: 8000,
      duration: 120,
      commission: 15,
    },
    {
      categoryId: categories[3].id,
      sku: 'MAKEUP-004',
      name: 'Eye Makeup',
      basePrice: 800,
      duration: 30,
      commission: 10,
    },

    // Spa & Wellness
    {
      categoryId: categories[4].id,
      sku: 'SPA-001',
      name: 'Swedish Massage',
      basePrice: 2000,
      duration: 60,
      commission: 12,
    },
    {
      categoryId: categories[4].id,
      sku: 'SPA-002',
      name: 'Deep Tissue Massage',
      basePrice: 2500,
      duration: 60,
      commission: 12,
    },
    {
      categoryId: categories[4].id,
      sku: 'SPA-003',
      name: 'Aromatherapy',
      basePrice: 3000,
      duration: 75,
      commission: 12,
    },
    {
      categoryId: categories[4].id,
      sku: 'SPA-004',
      name: 'Body Scrub',
      basePrice: 1500,
      duration: 45,
      commission: 10,
    },
    {
      categoryId: categories[4].id,
      sku: 'SPA-005',
      name: 'Body Wrap',
      basePrice: 2000,
      duration: 60,
      commission: 10,
    },
  ];

  const services = await prisma.service.createManyAndReturn({
    data: servicesData.map((s, idx) => ({
      tenantId,
      categoryId: s.categoryId,
      sku: s.sku,
      name: s.name,
      basePrice: new Prisma.Decimal(s.basePrice),
      taxRate: new Prisma.Decimal(18),
      durationMinutes: s.duration,
      activeTimeMinutes: s.duration,
      commissionType: 'percentage',
      commissionValue: new Prisma.Decimal(s.commission),
      displayOrder: idx,
      isActive: true,
    })),
  });

  console.log(`✅ Created ${services.length} services`);

  // Branch Service Prices (some overrides for second branch if exists)
  if (branches.length > 1) {
    const branchPrices = services.slice(0, 10).map((service) => ({
      tenantId,
      branchId: branches[1].id,
      serviceId: service.id,
      price: new Prisma.Decimal(Number(service.basePrice) * 1.1), // 10% higher
      isAvailable: true,
    }));

    await prisma.branchServicePrice.createMany({ data: branchPrices });
    console.log(`✅ Created ${branchPrices.length} branch price overrides for ${branches[1].name}`);
  }

  console.log('🎉 Services seed completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
