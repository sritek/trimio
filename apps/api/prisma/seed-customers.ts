/* eslint-disable no-console */
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
 *
 * System tags available: New, Regular, VIP, Inactive
 * Custom tags can be created via the UI and then used in seed data.
 */

import { PrismaClient, Prisma } from '@prisma/client';

const prisma = new PrismaClient();

interface CustomerSeedData {
  phone: string;
  name: string;
  email: string | null;
  gender: 'male' | 'female';
  dateOfBirth: Date | null;
  anniversaryDate: Date | null;
  address: string | null;
  tags: string[];
  loyaltyPoints: number;
  walletBalance: number;
  noShowCount: number;
  bookingStatus: 'normal' | 'prepaid_only' | 'blocked';
  allergies: string[];
  preferences: Record<string, unknown>;
  source: 'manual' | 'create_appointment' | 'add_walk_in';
  marketingConsent: boolean;
}

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

  // Realistic customer data using only system tags: New, Regular, VIP, Inactive
  const customersData: CustomerSeedData[] = [
    // ==================== VIP CUSTOMERS ====================
    {
      phone: '9876500001',
      name: 'Priya Sharma',
      email: 'priya.sharma@gmail.com',
      gender: 'female',
      dateOfBirth: new Date('1990-05-15'),
      anniversaryDate: new Date('2015-11-20'),
      address: '42, Jubilee Hills, Hyderabad - 500033',
      tags: ['VIP', 'Regular'],
      loyaltyPoints: 2500,
      walletBalance: 5000,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: { preferredTime: 'morning', preferredStylist: 'Anita' },
      source: 'manual',
      marketingConsent: true,
    },
    {
      phone: '9876500002',
      name: 'Meera Reddy',
      email: 'meera.reddy@outlook.com',
      gender: 'female',
      dateOfBirth: new Date('1985-07-28'),
      anniversaryDate: new Date('2010-02-14'),
      address: '15, Banjara Hills Road No. 12, Hyderabad - 500034',
      tags: ['VIP', 'Regular'],
      loyaltyPoints: 4200,
      walletBalance: 15000,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: ['Parabens'],
      preferences: { preferredTime: 'afternoon', preferredStylist: 'Kavita' },
      source: 'manual',
      marketingConsent: true,
    },
    {
      phone: '9876500003',
      name: 'Sunita Agarwal',
      email: 'sunita.agarwal@yahoo.com',
      gender: 'female',
      dateOfBirth: new Date('1978-09-12'),
      anniversaryDate: new Date('2000-05-05'),
      address: '88, Madhapur Main Road, Hyderabad - 500081',
      tags: ['VIP', 'Regular'],
      loyaltyPoints: 3100,
      walletBalance: 8000,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: { preferredTime: 'evening' },
      source: 'manual',
      marketingConsent: true,
    },
    {
      phone: '9876500004',
      name: 'Sanjay Mehta',
      email: 'sanjay.mehta@business.com',
      gender: 'male',
      dateOfBirth: new Date('1975-01-30'),
      anniversaryDate: new Date('2002-06-15'),
      address: '55, Secunderabad Cantonment, Hyderabad - 500003',
      tags: ['VIP', 'Regular'],
      loyaltyPoints: 1800,
      walletBalance: 3000,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: { preferredTime: 'morning' },
      source: 'manual',
      marketingConsent: false,
    },

    // ==================== REGULAR CUSTOMERS ====================
    {
      phone: '9876500005',
      name: 'Rahul Verma',
      email: 'rahul.verma@gmail.com',
      gender: 'male',
      dateOfBirth: new Date('1988-08-22'),
      anniversaryDate: null,
      address: null,
      tags: ['Regular'],
      loyaltyPoints: 450,
      walletBalance: 0,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: {},
      source: 'add_walk_in',
      marketingConsent: true,
    },
    {
      phone: '9876500006',
      name: 'Vikram Singh',
      email: 'vikram.singh@techcorp.com',
      gender: 'male',
      dateOfBirth: new Date('1982-03-10'),
      anniversaryDate: new Date('2012-12-12'),
      address: '201, Gachibowli IT Park, Hyderabad - 500032',
      tags: ['Regular'],
      loyaltyPoints: 820,
      walletBalance: 2500,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: { preferredTime: 'weekend' },
      source: 'create_appointment',
      marketingConsent: true,
    },
    {
      phone: '9876500007',
      name: 'Karan Malhotra',
      email: 'karan.m@gmail.com',
      gender: 'male',
      dateOfBirth: new Date('1991-02-18'),
      anniversaryDate: null,
      address: null,
      tags: ['Regular'],
      loyaltyPoints: 280,
      walletBalance: 500,
      noShowCount: 1,
      bookingStatus: 'normal',
      allergies: [],
      preferences: {},
      source: 'add_walk_in',
      marketingConsent: true,
    },
    {
      phone: '9876500008',
      name: 'Anita Patel',
      email: 'anita.patel@gmail.com',
      gender: 'female',
      dateOfBirth: new Date('1992-12-03'),
      anniversaryDate: null,
      address: '78, Kondapur, Hyderabad - 500084',
      tags: ['Regular'],
      loyaltyPoints: 620,
      walletBalance: 1000,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: ['Ammonia', 'Sulfates'],
      preferences: { preferredStylist: 'Priya' },
      source: 'create_appointment',
      marketingConsent: true,
    },
    {
      phone: '9876500009',
      name: 'Deepika Nair',
      email: 'deepika.n@gmail.com',
      gender: 'female',
      dateOfBirth: new Date('1994-09-12'),
      anniversaryDate: null,
      address: null,
      tags: ['Regular'],
      loyaltyPoints: 380,
      walletBalance: 0,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: {},
      source: 'add_walk_in',
      marketingConsent: true,
    },
    {
      phone: '9876500010',
      name: 'Kavita Desai',
      email: 'kavita.desai@outlook.com',
      gender: 'female',
      dateOfBirth: new Date('1989-04-08'),
      anniversaryDate: new Date('2018-04-22'),
      address: '33, Film Nagar, Hyderabad - 500096',
      tags: ['Regular'],
      loyaltyPoints: 950,
      walletBalance: 2000,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: { preferredTime: 'afternoon' },
      source: 'manual',
      marketingConsent: true,
    },
    {
      phone: '9876500011',
      name: 'Pooja Saxena',
      email: 'pooja.s@gmail.com',
      gender: 'female',
      dateOfBirth: new Date('1993-03-22'),
      anniversaryDate: null,
      address: null,
      tags: ['Regular'],
      loyaltyPoints: 1100,
      walletBalance: 3500,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: {},
      source: 'create_appointment',
      marketingConsent: true,
    },
    {
      phone: '9876500012',
      name: 'Neha Bansal',
      email: 'neha.bansal@yahoo.com',
      gender: 'female',
      dateOfBirth: new Date('1997-02-03'),
      anniversaryDate: null,
      address: '12, Kukatpally Housing Board, Hyderabad - 500072',
      tags: ['Regular'],
      loyaltyPoints: 220,
      walletBalance: 0,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: {},
      source: 'manual',
      marketingConsent: true,
    },
    {
      phone: '9876500013',
      name: 'Vivek Chopra',
      email: 'vivek.chopra@techstart.com',
      gender: 'male',
      dateOfBirth: new Date('1988-11-19'),
      anniversaryDate: new Date('2016-03-08'),
      address: '99, Hitech City, Hyderabad - 500081',
      tags: ['Regular'],
      loyaltyPoints: 680,
      walletBalance: 1500,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: { preferredTime: 'weekend' },
      source: 'create_appointment',
      marketingConsent: true,
    },
    {
      phone: '9876500014',
      name: 'Lakshmi Venkatesh',
      email: 'lakshmi.v@gmail.com',
      gender: 'female',
      dateOfBirth: new Date('1986-01-26'),
      anniversaryDate: new Date('2011-11-11'),
      address: '45, Begumpet, Hyderabad - 500016',
      tags: ['Regular'],
      loyaltyPoints: 520,
      walletBalance: 800,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: ['Formaldehyde'],
      preferences: {},
      source: 'manual',
      marketingConsent: true,
    },
    {
      phone: '9876500015',
      name: 'Rohit Sharma',
      email: 'rohit.sharma@gmail.com',
      gender: 'male',
      dateOfBirth: new Date('1995-06-30'),
      anniversaryDate: null,
      address: null,
      tags: ['Regular'],
      loyaltyPoints: 180,
      walletBalance: 0,
      noShowCount: 1,
      bookingStatus: 'normal',
      allergies: [],
      preferences: {},
      source: 'add_walk_in',
      marketingConsent: true,
    },
    {
      phone: '9876500016',
      name: 'Divya Krishnan',
      email: 'divya.k@outlook.com',
      gender: 'female',
      dateOfBirth: new Date('1991-12-25'),
      anniversaryDate: null,
      address: '67, Ameerpet, Hyderabad - 500038',
      tags: ['Regular'],
      loyaltyPoints: 340,
      walletBalance: 500,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: { preferredStylist: 'Meena' },
      source: 'create_appointment',
      marketingConsent: true,
    },

    // ==================== NEW CUSTOMERS ====================
    {
      phone: '9876500017',
      name: 'Arjun Kapoor',
      email: null,
      gender: 'male',
      dateOfBirth: null,
      anniversaryDate: null,
      address: null,
      tags: ['New'],
      loyaltyPoints: 0,
      walletBalance: 0,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: {},
      source: 'add_walk_in',
      marketingConsent: true,
    },
    {
      phone: '9876500018',
      name: 'Ritu Agarwal',
      email: 'ritu.a@gmail.com',
      gender: 'female',
      dateOfBirth: new Date('1996-10-17'),
      anniversaryDate: null,
      address: null,
      tags: ['New'],
      loyaltyPoints: 50,
      walletBalance: 0,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: {},
      source: 'create_appointment',
      marketingConsent: true,
    },
    {
      phone: '9876500019',
      name: 'Amit Joshi',
      email: 'amit.joshi@gmail.com',
      gender: 'male',
      dateOfBirth: new Date('1987-06-25'),
      anniversaryDate: null,
      address: null,
      tags: ['New'],
      loyaltyPoints: 100,
      walletBalance: 0,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: {},
      source: 'manual',
      marketingConsent: true,
    },
    {
      phone: '9876500020',
      name: 'Arun Pillai',
      email: null,
      gender: 'male',
      dateOfBirth: null,
      anniversaryDate: null,
      address: null,
      tags: ['New'],
      loyaltyPoints: 0,
      walletBalance: 0,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: {},
      source: 'add_walk_in',
      marketingConsent: true,
    },
    {
      phone: '9876500021',
      name: 'Shruti Iyer',
      email: 'shruti.iyer@gmail.com',
      gender: 'female',
      dateOfBirth: new Date('1999-08-14'),
      anniversaryDate: null,
      address: null,
      tags: ['New'],
      loyaltyPoints: 25,
      walletBalance: 0,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: {},
      source: 'create_appointment',
      marketingConsent: true,
    },

    // ==================== INACTIVE CUSTOMERS ====================
    {
      phone: '9876500022',
      name: 'Sneha Gupta',
      email: 'sneha.gupta@gmail.com',
      gender: 'female',
      dateOfBirth: new Date('1993-11-05'),
      anniversaryDate: null,
      address: null,
      tags: ['Inactive'],
      loyaltyPoints: 150,
      walletBalance: 0,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: {},
      source: 'manual',
      marketingConsent: true,
    },
    {
      phone: '9876500023',
      name: 'Nikhil Rao',
      email: 'nikhil.rao@outlook.com',
      gender: 'male',
      dateOfBirth: new Date('1990-12-05'),
      anniversaryDate: null,
      address: null,
      tags: ['Inactive'],
      loyaltyPoints: 75,
      walletBalance: 200,
      noShowCount: 0,
      bookingStatus: 'normal',
      allergies: [],
      preferences: {},
      source: 'add_walk_in',
      marketingConsent: false,
    },

    // ==================== CUSTOMERS WITH BOOKING RESTRICTIONS ====================
    {
      phone: '9876500024',
      name: 'Rajesh Kumar',
      email: null,
      gender: 'male',
      dateOfBirth: new Date('1980-07-14'),
      anniversaryDate: null,
      address: null,
      tags: ['Regular'],
      loyaltyPoints: 50,
      walletBalance: 0,
      noShowCount: 2, // 2 no-shows = prepaid only
      bookingStatus: 'prepaid_only',
      allergies: [],
      preferences: {},
      source: 'add_walk_in',
      marketingConsent: true,
    },
    {
      phone: '9876500025',
      name: 'Manish Tiwari',
      email: 'manish.t@gmail.com',
      gender: 'male',
      dateOfBirth: new Date('1985-04-20'),
      anniversaryDate: null,
      address: null,
      tags: ['Inactive'],
      loyaltyPoints: 0,
      walletBalance: 0,
      noShowCount: 3, // 3 no-shows = blocked from booking
      bookingStatus: 'blocked',
      allergies: [],
      preferences: {},
      source: 'create_appointment',
      marketingConsent: false,
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
      anniversaryDate: c.anniversaryDate,
      address: c.address,
      tags: c.tags,
      loyaltyPoints: c.loyaltyPoints,
      walletBalance: new Prisma.Decimal(c.walletBalance),
      noShowCount: c.noShowCount,
      bookingStatus: c.bookingStatus,
      allergies: c.allergies,
      preferences: c.preferences,
      firstVisitBranchId: branch.id,
      marketingConsent: c.marketingConsent,
      source: c.source,
    })),
  });

  console.log(`✅ Created ${customers.length} customers`);

  // Log distribution stats
  const genderCounts = customersData.reduce(
    (acc, c) => {
      acc[c.gender]++;
      return acc;
    },
    { male: 0, female: 0 } as Record<string, number>
  );
  console.log(`   👤 Gender: Male=${genderCounts.male}, Female=${genderCounts.female}`);

  const sourceCounts = customersData.reduce(
    (acc, c) => {
      acc[c.source] = (acc[c.source] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  console.log(
    `   📥 Sources: ${Object.entries(sourceCounts)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}`
  );

  const statusCounts = customersData.reduce(
    (acc, c) => {
      acc[c.bookingStatus] = (acc[c.bookingStatus] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );
  console.log(
    `   📋 Booking Status: ${Object.entries(statusCounts)
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}`
  );

  const tagCounts: Record<string, number> = {};
  customersData.forEach((c) => {
    c.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  console.log(
    `   🏷️  Tags: ${Object.entries(tagCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, v]) => `${k}=${v}`)
      .join(', ')}`
  );

  // Add customer notes for VIP and problem customers
  const user = await prisma.user.findFirst({ where: { tenantId } });

  if (user) {
    const notesData: {
      tenantId: string;
      customerId: string;
      content: string;
      createdBy: string;
    }[] = [];

    // VIP customer notes
    const vipCustomers = customers.filter((c) =>
      customersData.find((cd) => cd.phone === c.phone)?.tags.includes('VIP')
    );
    vipCustomers.forEach((c) => {
      notesData.push({
        tenantId,
        customerId: c.id,
        content: 'VIP customer - provide premium service and priority booking.',
        createdBy: user.id,
      });
    });

    // Problem customer notes
    const blockedCustomer = customers.find((c) => c.bookingStatus === 'blocked');
    if (blockedCustomer) {
      notesData.push({
        tenantId,
        customerId: blockedCustomer.id,
        content: 'Customer blocked due to repeated no-shows. Do not accept bookings.',
        createdBy: user.id,
      });
    }

    const prepaidOnlyCustomer = customers.find((c) => c.bookingStatus === 'prepaid_only');
    if (prepaidOnlyCustomer) {
      notesData.push({
        tenantId,
        customerId: prepaidOnlyCustomer.id,
        content: 'Customer has 2 no-shows. Require prepayment for all future bookings.',
        createdBy: user.id,
      });
    }

    // Allergy notes
    const allergyCustomers = customers.filter((c) => {
      const data = customersData.find((cd) => cd.phone === c.phone);
      return data && data.allergies.length > 0;
    });
    allergyCustomers.forEach((c) => {
      const data = customersData.find((cd) => cd.phone === c.phone);
      if (data) {
        notesData.push({
          tenantId,
          customerId: c.id,
          content: `⚠️ ALLERGY ALERT: Customer is allergic to ${data.allergies.join(', ')}. Use alternative products.`,
          createdBy: user.id,
        });
      }
    });

    if (notesData.length > 0) {
      await prisma.customerNote.createMany({ data: notesData });
      console.log(`✅ Created ${notesData.length} customer notes`);
    }
  } else {
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
