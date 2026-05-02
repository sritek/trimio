/// <reference types="node" />
/**
 * Seed Customers Script
 * Seeds only customers for a specific tenant
 *
 * Usage: pnpm db:seed-customers <tenant-id>
 *
 * Example: pnpm db:seed-customers cm5abc123def456
 *
 * Note: Visit count is not stored on the customer record.
 * It's calculated dynamically by counting completed appointments.
 */

import { PrismaClient, Prisma, CustomerSource } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get tenant ID from command line args
  const tenantId = process.argv[2];

  if (!tenantId) {
    console.error('❌ Tenant ID is required.');
    console.error('');
    console.error('Usage: pnpm db:seed-customers <tenant-id>');
    console.error('');
    console.error('Example: pnpm db:seed-customers cm5abc123def456');
    process.exit(1);
  }

  console.log('🌱 Seeding customers...');

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    console.error(`❌ Tenant not found with ID: ${tenantId}`);
    process.exit(1);
  }

  console.log(`📍 Using tenant: ${tenant.name} (${tenantId})`);

  // Get first branch for firstVisitBranchId
  const branch = await prisma.branch.findFirst({ where: { tenantId } });
  if (!branch) {
    console.error('❌ No branch found for this tenant. Please create a branch first.');
    process.exit(1);
  }

  console.log(`📍 Using branch: ${branch.name}`);

  // Clear existing customers data
  console.log('🗑️  Clearing existing customers data...');
  await prisma.customerNote.deleteMany({ where: { tenantId } });
  await prisma.walletTransaction.deleteMany({ where: { tenantId } });
  await prisma.loyaltyTransaction.deleteMany({ where: { tenantId } });
  await prisma.customer.deleteMany({ where: { tenantId } });

  // Seed customers
  const customersData: {
    phone: string;
    name: string;
    email: string | null;
    gender: string;
    dateOfBirth: Date | null;
    tags: string[];
    loyaltyPoints: number;
    walletBalance: Prisma.Decimal;
    allergies?: string[];
    source: CustomerSource;
  }[] = [
    {
      phone: '9876500001',
      name: 'Priya Sharma',
      email: 'priya.sharma@email.com',
      gender: 'female',
      dateOfBirth: new Date('1990-05-15'),
      tags: ['VIP', 'Regular'],
      loyaltyPoints: 500,
      walletBalance: new Prisma.Decimal(1000),
      source: 'manual',
    },
    {
      phone: '9876500002',
      name: 'Rahul Verma',
      email: 'rahul.verma@email.com',
      gender: 'male',
      dateOfBirth: new Date('1985-08-22'),
      tags: ['Regular'],
      loyaltyPoints: 150,
      walletBalance: new Prisma.Decimal(0),
      source: 'manual',
    },
    {
      phone: '9876500003',
      name: 'Anita Patel',
      email: 'anita.patel@email.com',
      gender: 'female',
      dateOfBirth: new Date('1992-12-03'),
      tags: ['New'],
      loyaltyPoints: 0,
      walletBalance: new Prisma.Decimal(500),
      allergies: ['Ammonia'],
      source: 'manual',
    },
    {
      phone: '9876500004',
      name: 'Vikram Singh',
      email: 'vikram.singh@email.com',
      gender: 'male',
      dateOfBirth: new Date('1988-03-10'),
      tags: ['Corporate'],
      loyaltyPoints: 320,
      walletBalance: new Prisma.Decimal(2500),
      source: 'manual',
    },
    {
      phone: '9876500005',
      name: 'Meera Reddy',
      email: 'meera.reddy@email.com',
      gender: 'female',
      dateOfBirth: new Date('1995-07-28'),
      tags: ['VIP', 'Premium'],
      loyaltyPoints: 1200,
      walletBalance: new Prisma.Decimal(5000),
      source: 'manual',
    },
    {
      phone: '9876500006',
      name: 'Arjun Kapoor',
      email: null,
      gender: 'male',
      dateOfBirth: null,
      tags: ['New', 'Referral'],
      loyaltyPoints: 0,
      walletBalance: new Prisma.Decimal(0),
      source: 'manual',
    },
    {
      phone: '9876500007',
      name: 'Sneha Gupta',
      email: 'sneha.gupta@email.com',
      gender: 'female',
      dateOfBirth: new Date('1993-11-05'),
      tags: ['Inactive'],
      loyaltyPoints: 50,
      walletBalance: new Prisma.Decimal(0),
      source: 'manual',
    },
    {
      phone: '9876500008',
      name: 'Karan Malhotra',
      email: 'karan.m@email.com',
      gender: 'male',
      dateOfBirth: new Date('1991-02-18'),
      tags: ['Regular'],
      loyaltyPoints: 200,
      walletBalance: new Prisma.Decimal(750),
      source: 'manual',
    },
    {
      phone: '9876500009',
      name: 'Deepika Nair',
      email: 'deepika.n@email.com',
      gender: 'female',
      dateOfBirth: new Date('1994-09-12'),
      tags: ['Regular'],
      loyaltyPoints: 180,
      walletBalance: new Prisma.Decimal(300),
      source: 'manual',
    },
    {
      phone: '9876500010',
      name: 'Amit Joshi',
      email: 'amit.j@email.com',
      gender: 'male',
      dateOfBirth: new Date('1987-06-25'),
      tags: ['New'],
      loyaltyPoints: 0,
      walletBalance: new Prisma.Decimal(0),
      source: 'manual',
    },
    {
      phone: '9876500011',
      name: 'Kavita Desai',
      email: 'kavita.d@email.com',
      gender: 'female',
      dateOfBirth: new Date('1989-04-08'),
      tags: ['Regular', 'Birthday-April'],
      loyaltyPoints: 450,
      walletBalance: new Prisma.Decimal(1200),
      source: 'manual',
    },
    {
      phone: '9876500012',
      name: 'Sanjay Mehta',
      email: 'sanjay.m@email.com',
      gender: 'male',
      dateOfBirth: new Date('1982-01-30'),
      tags: ['VIP', 'Corporate'],
      loyaltyPoints: 800,
      walletBalance: new Prisma.Decimal(3000),
      source: 'manual',
    },
    {
      phone: '9876500013',
      name: 'Ritu Agarwal',
      email: 'ritu.a@email.com',
      gender: 'female',
      dateOfBirth: new Date('1996-10-17'),
      tags: ['New'],
      loyaltyPoints: 25,
      walletBalance: new Prisma.Decimal(0),
      source: 'manual',
    },
    {
      phone: '9876500014',
      name: 'Nikhil Rao',
      email: 'nikhil.r@email.com',
      gender: 'male',
      dateOfBirth: new Date('1990-12-05'),
      tags: ['Regular'],
      loyaltyPoints: 275,
      walletBalance: new Prisma.Decimal(500),
      source: 'manual',
    },
    {
      phone: '9876500015',
      name: 'Pooja Saxena',
      email: 'pooja.s@email.com',
      gender: 'female',
      dateOfBirth: new Date('1993-03-22'),
      tags: ['Premium'],
      loyaltyPoints: 600,
      walletBalance: new Prisma.Decimal(2000),
      source: 'manual',
    },
    {
      phone: '9876500016',
      name: 'Rajesh Kumar',
      email: null,
      gender: 'male',
      dateOfBirth: new Date('1978-07-14'),
      tags: ['Regular'],
      loyaltyPoints: 100,
      walletBalance: new Prisma.Decimal(0),
      source: 'manual',
    },
    {
      phone: '9876500017',
      name: 'Sunita Sharma',
      email: 'sunita.s@email.com',
      gender: 'female',
      dateOfBirth: new Date('1985-09-28'),
      tags: ['VIP'],
      loyaltyPoints: 950,
      walletBalance: new Prisma.Decimal(4000),
      source: 'manual',
    },
    {
      phone: '9876500018',
      name: 'Arun Pillai',
      email: 'arun.p@email.com',
      gender: 'male',
      dateOfBirth: new Date('1992-05-11'),
      tags: ['New', 'Walk-in'],
      loyaltyPoints: 0,
      walletBalance: new Prisma.Decimal(0),
      source: 'manual',
    },
    {
      phone: '9876500019',
      name: 'Neha Bansal',
      email: 'neha.b@email.com',
      gender: 'female',
      dateOfBirth: new Date('1997-02-03'),
      tags: ['Regular'],
      loyaltyPoints: 125,
      walletBalance: new Prisma.Decimal(250),
      source: 'manual',
    },
    {
      phone: '9876500020',
      name: 'Vivek Chopra',
      email: 'vivek.c@email.com',
      gender: 'male',
      dateOfBirth: new Date('1988-11-19'),
      tags: ['Corporate', 'Regular'],
      loyaltyPoints: 380,
      walletBalance: new Prisma.Decimal(1500),
      source: 'manual',
    },
  ];

  const customers = await prisma.customer.createManyAndReturn({
    data: customersData.map((c) => ({
      tenantId,
      phone: c.phone,
      name: c.name,
      email: c.email,
      gender: c.gender,
      dateOfBirth: c.dateOfBirth,
      tags: c.tags,
      loyaltyPoints: c.loyaltyPoints,
      walletBalance: c.walletBalance,
      allergies: c.allergies || [],
      firstVisitBranchId: branch.id,
      marketingConsent: true,
      source: c.source,
    })),
  });

  console.log(`✅ Created ${customers.length} customers`);

  // Add some customer notes for VIP customers
  const vipCustomers = customers.filter((c) =>
    customersData.find((cd) => cd.phone === c.phone)?.tags.includes('VIP')
  );

  // Get a user to set as createdBy (required field)
  const user = await prisma.user.findFirst({ where: { tenantId } });

  if (vipCustomers.length > 0 && user) {
    const notesData = vipCustomers.map((c) => ({
      tenantId,
      customerId: c.id,
      content: 'VIP customer - provide premium service and priority booking.',
      createdBy: user.id,
    }));

    await prisma.customerNote.createMany({ data: notesData });
    console.log(`✅ Created ${notesData.length} customer notes`);
  } else if (vipCustomers.length > 0 && !user) {
    console.log('⚠️  Skipped customer notes - no user found to set as createdBy');
  }

  console.log('🎉 Customers seed completed!');
  console.log('');
  console.log('ℹ️  Note: Visit count is calculated dynamically from completed appointments.');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
