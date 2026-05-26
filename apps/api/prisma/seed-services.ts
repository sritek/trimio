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
  // genderApplicable: 'all' | 'male' | 'female'
  // defaultRunParallel: 'always' | 'never' | 'optional'
  const servicesData = [
    // ==================== HAIR SERVICES ====================
    // Men's Hair
    {
      categoryId: categories[0].id,
      sku: 'HAIR-001',
      name: 'Haircut - Men',
      basePrice: 300,
      duration: 30,
      activeTime: 30,
      processingTime: 0,
      commission: 10,
      gender: 'male',
      defaultRunParallel: 'never',
    },
    {
      categoryId: categories[0].id,
      sku: 'HAIR-002',
      name: 'Beard Trim',
      basePrice: 150,
      duration: 15,
      activeTime: 15,
      processingTime: 0,
      commission: 10,
      gender: 'male',
      defaultRunParallel: 'never',
    },
    {
      categoryId: categories[0].id,
      sku: 'HAIR-003',
      name: 'Beard Styling',
      basePrice: 250,
      duration: 25,
      activeTime: 25,
      processingTime: 0,
      commission: 10,
      gender: 'male',
      defaultRunParallel: 'never',
    },
    // Women's Hair
    {
      categoryId: categories[0].id,
      sku: 'HAIR-004',
      name: 'Haircut - Women',
      basePrice: 500,
      duration: 45,
      activeTime: 45,
      processingTime: 0,
      commission: 10,
      gender: 'female',
      defaultRunParallel: 'never',
    },
    {
      categoryId: categories[0].id,
      sku: 'HAIR-005',
      name: 'Hair Trim - Women',
      basePrice: 300,
      duration: 20,
      activeTime: 20,
      processingTime: 0,
      commission: 10,
      gender: 'female',
      defaultRunParallel: 'never',
    },
    {
      categoryId: categories[0].id,
      sku: 'HAIR-006',
      name: 'Blow Dry & Styling',
      basePrice: 400,
      duration: 30,
      activeTime: 30,
      processingTime: 0,
      commission: 8,
      gender: 'female',
      defaultRunParallel: 'never',
    },
    // Unisex Hair Services
    {
      categoryId: categories[0].id,
      sku: 'HAIR-007',
      name: 'Hair Color - Global',
      basePrice: 2500,
      duration: 120,
      activeTime: 30,
      processingTime: 90,
      commission: 12,
      gender: 'all',
      defaultRunParallel: 'optional', // Can do nails during color processing
    },
    {
      categoryId: categories[0].id,
      sku: 'HAIR-008',
      name: 'Hair Color - Highlights',
      basePrice: 3500,
      duration: 150,
      activeTime: 45,
      processingTime: 105,
      commission: 12,
      gender: 'all',
      defaultRunParallel: 'optional',
    },
    {
      categoryId: categories[0].id,
      sku: 'HAIR-009',
      name: 'Hair Spa Treatment',
      basePrice: 1200,
      duration: 60,
      activeTime: 20,
      processingTime: 40,
      commission: 10,
      gender: 'all',
      defaultRunParallel: 'optional',
    },
    {
      categoryId: categories[0].id,
      sku: 'HAIR-010',
      name: 'Keratin Treatment',
      basePrice: 8000,
      duration: 180,
      activeTime: 60,
      processingTime: 120,
      commission: 15,
      gender: 'all',
      defaultRunParallel: 'optional',
    },
    {
      categoryId: categories[0].id,
      sku: 'HAIR-011',
      name: 'Hair Smoothening',
      basePrice: 6000,
      duration: 180,
      activeTime: 60,
      processingTime: 120,
      commission: 15,
      gender: 'all',
      defaultRunParallel: 'optional',
    },
    {
      categoryId: categories[0].id,
      sku: 'HAIR-012',
      name: 'Haircut - Kids',
      basePrice: 200,
      duration: 20,
      activeTime: 20,
      processingTime: 0,
      commission: 8,
      gender: 'all', // Kids of any gender
      defaultRunParallel: 'never',
    },

    // ==================== SKIN CARE ====================
    // Facials - Mostly unisex but some gender-specific
    {
      categoryId: categories[1].id,
      sku: 'SKIN-001',
      name: 'Basic Facial',
      basePrice: 800,
      duration: 45,
      activeTime: 30,
      processingTime: 15,
      commission: 10,
      gender: 'all',
      defaultRunParallel: 'optional',
    },
    {
      categoryId: categories[1].id,
      sku: 'SKIN-002',
      name: 'Gold Facial',
      basePrice: 1500,
      duration: 60,
      activeTime: 40,
      processingTime: 20,
      commission: 10,
      gender: 'female', // Premium facial typically for women
      defaultRunParallel: 'optional',
    },
    {
      categoryId: categories[1].id,
      sku: 'SKIN-003',
      name: 'Diamond Facial',
      basePrice: 2500,
      duration: 75,
      activeTime: 50,
      processingTime: 25,
      commission: 12,
      gender: 'female',
      defaultRunParallel: 'optional',
    },
    {
      categoryId: categories[1].id,
      sku: 'SKIN-004',
      name: "Men's Facial",
      basePrice: 700,
      duration: 40,
      activeTime: 30,
      processingTime: 10,
      commission: 10,
      gender: 'male',
      defaultRunParallel: 'optional',
    },
    {
      categoryId: categories[1].id,
      sku: 'SKIN-005',
      name: 'Cleanup',
      basePrice: 500,
      duration: 30,
      activeTime: 30,
      processingTime: 0,
      commission: 8,
      gender: 'all',
      defaultRunParallel: 'never',
    },
    {
      categoryId: categories[1].id,
      sku: 'SKIN-006',
      name: 'Bleach - Face',
      basePrice: 400,
      duration: 25,
      activeTime: 10,
      processingTime: 15,
      commission: 8,
      gender: 'female',
      defaultRunParallel: 'always', // Can always run during processing
    },
    {
      categoryId: categories[1].id,
      sku: 'SKIN-007',
      name: 'Bleach - Full Arms',
      basePrice: 600,
      duration: 30,
      activeTime: 10,
      processingTime: 20,
      commission: 8,
      gender: 'female',
      defaultRunParallel: 'always',
    },
    {
      categoryId: categories[1].id,
      sku: 'SKIN-008',
      name: 'De-Tan - Face',
      basePrice: 600,
      duration: 30,
      activeTime: 10,
      processingTime: 20,
      commission: 8,
      gender: 'all',
      defaultRunParallel: 'always',
    },
    {
      categoryId: categories[1].id,
      sku: 'SKIN-009',
      name: 'Threading - Eyebrows',
      basePrice: 50,
      duration: 10,
      activeTime: 10,
      processingTime: 0,
      commission: 5,
      gender: 'female',
      defaultRunParallel: 'always', // Quick, can run anytime
    },
    {
      categoryId: categories[1].id,
      sku: 'SKIN-010',
      name: 'Threading - Full Face',
      basePrice: 150,
      duration: 20,
      activeTime: 20,
      processingTime: 0,
      commission: 5,
      gender: 'female',
      defaultRunParallel: 'always',
    },
    {
      categoryId: categories[1].id,
      sku: 'SKIN-011',
      name: 'Waxing - Full Arms',
      basePrice: 400,
      duration: 25,
      activeTime: 25,
      processingTime: 0,
      commission: 8,
      gender: 'female',
      defaultRunParallel: 'optional',
    },
    {
      categoryId: categories[1].id,
      sku: 'SKIN-012',
      name: 'Waxing - Full Legs',
      basePrice: 500,
      duration: 35,
      activeTime: 35,
      processingTime: 0,
      commission: 8,
      gender: 'female',
      defaultRunParallel: 'optional',
    },

    // ==================== NAIL SERVICES ====================
    // Nail services can typically run in parallel with hair treatments
    {
      categoryId: categories[2].id,
      sku: 'NAIL-001',
      name: 'Manicure - Basic',
      basePrice: 400,
      duration: 30,
      activeTime: 30,
      processingTime: 0,
      commission: 8,
      gender: 'all',
      defaultRunParallel: 'always',
    },
    {
      categoryId: categories[2].id,
      sku: 'NAIL-002',
      name: 'Manicure - Spa',
      basePrice: 700,
      duration: 45,
      activeTime: 35,
      processingTime: 10,
      commission: 10,
      gender: 'all',
      defaultRunParallel: 'always',
    },
    {
      categoryId: categories[2].id,
      sku: 'NAIL-003',
      name: 'Pedicure - Basic',
      basePrice: 500,
      duration: 40,
      activeTime: 35,
      processingTime: 5,
      commission: 8,
      gender: 'all',
      defaultRunParallel: 'always',
    },
    {
      categoryId: categories[2].id,
      sku: 'NAIL-004',
      name: 'Pedicure - Spa',
      basePrice: 900,
      duration: 60,
      activeTime: 45,
      processingTime: 15,
      commission: 10,
      gender: 'all',
      defaultRunParallel: 'always',
    },
    {
      categoryId: categories[2].id,
      sku: 'NAIL-005',
      name: 'Nail Art',
      basePrice: 300,
      duration: 30,
      activeTime: 30,
      processingTime: 0,
      commission: 10,
      gender: 'female',
      defaultRunParallel: 'always',
    },
    {
      categoryId: categories[2].id,
      sku: 'NAIL-006',
      name: 'Gel Nails',
      basePrice: 1500,
      duration: 90,
      activeTime: 75,
      processingTime: 15,
      commission: 12,
      gender: 'female',
      defaultRunParallel: 'always',
    },
    {
      categoryId: categories[2].id,
      sku: 'NAIL-007',
      name: 'Nail Extensions',
      basePrice: 2000,
      duration: 120,
      activeTime: 110,
      processingTime: 10,
      commission: 12,
      gender: 'female',
      defaultRunParallel: 'optional', // Long service, may need attention
    },

    // ==================== MAKEUP ====================
    // Makeup requires full attention - never parallel
    {
      categoryId: categories[3].id,
      sku: 'MAKEUP-001',
      name: 'Party Makeup',
      basePrice: 2500,
      duration: 60,
      activeTime: 60,
      processingTime: 0,
      commission: 12,
      gender: 'female',
      defaultRunParallel: 'never',
    },
    {
      categoryId: categories[3].id,
      sku: 'MAKEUP-002',
      name: 'Bridal Makeup',
      basePrice: 15000,
      duration: 180,
      activeTime: 180,
      processingTime: 0,
      commission: 15,
      gender: 'female',
      defaultRunParallel: 'never',
    },
    {
      categoryId: categories[3].id,
      sku: 'MAKEUP-003',
      name: 'Engagement Makeup',
      basePrice: 8000,
      duration: 120,
      activeTime: 120,
      processingTime: 0,
      commission: 15,
      gender: 'female',
      defaultRunParallel: 'never',
    },
    {
      categoryId: categories[3].id,
      sku: 'MAKEUP-004',
      name: 'Eye Makeup',
      basePrice: 800,
      duration: 30,
      activeTime: 30,
      processingTime: 0,
      commission: 10,
      gender: 'female',
      defaultRunParallel: 'never',
    },
    {
      categoryId: categories[3].id,
      sku: 'MAKEUP-005',
      name: 'Saree Draping',
      basePrice: 500,
      duration: 20,
      activeTime: 20,
      processingTime: 0,
      commission: 8,
      gender: 'female',
      defaultRunParallel: 'never',
    },

    // ==================== SPA & WELLNESS ====================
    {
      categoryId: categories[4].id,
      sku: 'SPA-001',
      name: 'Swedish Massage',
      basePrice: 2000,
      duration: 60,
      activeTime: 60,
      processingTime: 0,
      commission: 12,
      gender: 'all',
      defaultRunParallel: 'never',
    },
    {
      categoryId: categories[4].id,
      sku: 'SPA-002',
      name: 'Deep Tissue Massage',
      basePrice: 2500,
      duration: 60,
      activeTime: 60,
      processingTime: 0,
      commission: 12,
      gender: 'all',
      defaultRunParallel: 'never',
    },
    {
      categoryId: categories[4].id,
      sku: 'SPA-003',
      name: 'Aromatherapy Massage',
      basePrice: 3000,
      duration: 75,
      activeTime: 60,
      processingTime: 15,
      commission: 12,
      gender: 'all',
      defaultRunParallel: 'optional',
    },
    {
      categoryId: categories[4].id,
      sku: 'SPA-004',
      name: 'Body Scrub',
      basePrice: 1500,
      duration: 45,
      activeTime: 30,
      processingTime: 15,
      commission: 10,
      gender: 'all',
      defaultRunParallel: 'optional',
    },
    {
      categoryId: categories[4].id,
      sku: 'SPA-005',
      name: 'Body Wrap',
      basePrice: 2000,
      duration: 60,
      activeTime: 15,
      processingTime: 45,
      commission: 10,
      gender: 'all',
      defaultRunParallel: 'always', // Long processing, can do other services
    },
    {
      categoryId: categories[4].id,
      sku: 'SPA-006',
      name: 'Head Massage',
      basePrice: 500,
      duration: 20,
      activeTime: 20,
      processingTime: 0,
      commission: 8,
      gender: 'all',
      defaultRunParallel: 'never',
    },
    {
      categoryId: categories[4].id,
      sku: 'SPA-007',
      name: 'Foot Reflexology',
      basePrice: 800,
      duration: 30,
      activeTime: 30,
      processingTime: 0,
      commission: 10,
      gender: 'all',
      defaultRunParallel: 'always', // Can run while hair processes
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
      activeTimeMinutes: s.activeTime,
      processingTimeMinutes: s.processingTime,
      commissionType: 'percentage',
      commissionValue: new Prisma.Decimal(s.commission),
      genderApplicable: s.gender,
      defaultRunParallel: s.defaultRunParallel,
      displayOrder: idx,
      isActive: true,
    })),
  });

  console.log(`✅ Created ${services.length} services`);

  // Log parallel execution distribution
  const parallelCounts = servicesData.reduce(
    (acc, s) => {
      acc[s.defaultRunParallel]++;
      return acc;
    },
    { always: 0, never: 0, optional: 0 } as Record<string, number>
  );
  console.log(
    `   📊 Parallel settings: Always=${parallelCounts.always}, Never=${parallelCounts.never}, Optional=${parallelCounts.optional}`
  );

  // Log gender distribution
  const genderCounts = servicesData.reduce(
    (acc, s) => {
      acc[s.gender]++;
      return acc;
    },
    { all: 0, male: 0, female: 0 } as Record<string, number>
  );
  console.log(
    `   👤 Gender applicable: All=${genderCounts.all}, Male=${genderCounts.male}, Female=${genderCounts.female}`
  );

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
