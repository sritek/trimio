/**
 * Database Seed Script
 * Comprehensive seed data for all implemented modules
 * Uses batch inserts for performance
 */

import { PrismaClient, Prisma } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ============================================
// Main Seed Function
// ============================================

async function main() {
  console.log('🌱 Starting database seed...');

  if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
    // Clear existing data in reverse dependency order
    await clearDatabase();

    // 1. Core: Tenant & Branch
    const { tenant, branches } = await seedTenantAndBranches();
    console.log(`✅ Created tenant: ${tenant.name} with ${branches.length} branches`);

    // 2. Users & Staff
    const users = await seedUsers(tenant.id, branches);
    console.log(`✅ Created ${users.length} users`);

    // 3. Staff Profiles & Related
    await seedStaffData(tenant.id, branches, users);
    console.log(`✅ Created staff profiles, shifts, and attendance data`);

    // 4. Services & Categories
    const services = await seedServices(tenant.id, branches);
    console.log(`✅ Created ${services.length} services`);

    // 5. Customers
    const customers = await seedCustomers(tenant.id, branches[0].id);
    console.log(`✅ Created ${customers.length} customers`);

    // 6. Appointments - seed for both branches
    const appointments1 = await seedAppointments(
      tenant.id,
      branches[0].id,
      users,
      services,
      customers
    );
    const appointments2 = await seedAppointments(
      tenant.id,
      branches[1].id,
      users,
      services,
      customers
    );
    console.log(`✅ Created ${appointments1.length + appointments2.length} appointments`);

    // 7. Inventory: Products & Categories
    const products = await seedInventory(tenant.id, branches);
    console.log(`✅ Created ${products.length} products with vendors and stock`);

    // 8. Billing: Invoices
    await seedBilling(tenant.id, branches[0].id, customers, services, products, users);
    console.log(`✅ Created billing data`);

    // 9. Loyalty & Tags
    await seedLoyaltyAndTags(tenant.id);
    console.log(`✅ Created loyalty config and tags`);

    // 10. Waitlist Entries
    const waitlistCount = await seedWaitlist(tenant.id, branches[0].id, customers, services, users);
    console.log(`✅ Created ${waitlistCount} waitlist entries`);

    // 11. Station Types & Stations
    const { stationTypes, stations } = await seedStations(tenant.id, branches);
    console.log(`✅ Created ${stationTypes.length} station types and ${stations.length} stations`);

    // 12. Subscription Plans & Branch Subscriptions
    const subscriptionPlans = await seedSubscriptionPlans();
    console.log(`✅ Created ${subscriptionPlans.length} subscription plans`);

    // 13. Branch Subscriptions
    await seedBranchSubscriptions(tenant.id, branches, subscriptionPlans);
    console.log(`✅ Created branch subscriptions`);
  }

  console.log('🎉 Seed completed successfully!');
}

// ============================================
// Clear Database
// ============================================

async function clearDatabase() {
  console.log('🗑️  Clearing existing data...');

  // Helper to safely truncate tables (ignores if table doesn't exist)
  const safeTruncate = async (tables: string) => {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE`);
    } catch (e: unknown) {
      // Ignore "table does not exist" errors
      const error = e as { meta?: { message?: string } };
      if (!error.meta?.message?.includes('does not exist')) {
        throw e;
      }
    }
  };

  // Delete in reverse dependency order
  await safeTruncate('stock_audit_items, stock_audits');
  await safeTruncate('stock_transfer_items, stock_transfers');
  await safeTruncate('stock_movements');
  await safeTruncate('stock_batches');
  await safeTruncate('goods_receipt_items, goods_receipt_notes');
  await safeTruncate('purchase_order_items, purchase_orders');
  await safeTruncate('vendor_product_mappings, vendors');
  await safeTruncate('branch_product_settings');
  await safeTruncate('service_consumable_mappings');
  await safeTruncate('products, product_categories');
  await safeTruncate('credit_note_items, credit_notes');
  await safeTruncate('invoice_discounts, payments, invoice_items, invoices');
  await safeTruncate('cash_drawer_transactions, day_closures');
  await safeTruncate('payslips, payroll_items, payroll');
  await safeTruncate('commissions');
  await safeTruncate('staff_deductions');
  await safeTruncate('staff_salary_structures, salary_components');
  await safeTruncate('leave_balances, leaves');
  await safeTruncate('attendance');
  await safeTruncate('staff_shift_assignments, shifts');
  await safeTruncate('staff_profiles');
  await safeTruncate('appointment_status_history, appointment_services, appointments');
  await safeTruncate('walk_in_queue');
  await safeTruncate('waitlist_entries');
  await safeTruncate('stylist_blocked_slots, stylist_breaks');
  await safeTruncate('wallet_transactions, loyalty_transactions');
  await safeTruncate('customer_notes, customers');
  await safeTruncate('service_price_history');
  await safeTruncate('combo_service_items, combo_services');
  await safeTruncate('service_add_on_mappings, service_add_ons');
  await safeTruncate('branch_service_prices');
  await safeTruncate('service_variants, services, service_categories');
  await safeTruncate('custom_tags');
  await safeTruncate('loyalty_configs');
  await safeTruncate('tenant_leave_policies');
  await safeTruncate('audit_logs');
  await safeTruncate('refresh_tokens');
  await safeTruncate('stations, station_types');
  // Subscription tables
  await safeTruncate('subscription_history');
  await safeTruncate('subscription_payments');
  await safeTruncate('subscription_invoices');
  await safeTruncate('branch_subscriptions');
  await safeTruncate('subscription_plans');
  await safeTruncate('user_branches');
  await safeTruncate('users');
  await safeTruncate('branches');
  await safeTruncate('tenants');
}

// ============================================
// Tenant & Branches
// ============================================

async function seedTenantAndBranches() {
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Glamour Studio',
      slug: 'glamour-studio',
      legalName: 'Glamour Studio Pvt. Ltd.',
      email: 'admin@glamourstudio.com',
      phone: '9876543210',
      billingEmail: 'billing@glamourstudio.com',
      settings: {
        currency: 'INR',
        timezone: 'Asia/Kolkata',
        dateFormat: 'dd/MM/yyyy',
        timeFormat: '12h',
      },
    },
  });

  const branchesData = [
    {
      tenantId: tenant.id,
      name: 'Glamour Studio - Andheri',
      slug: 'andheri',
      address: '123 Link Road, Andheri West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400053',
      phone: '9876543211',
      email: 'andheri@glamourstudio.com',
      gstin: '27AABCU9603R1ZM',
      latitude: new Prisma.Decimal(19.1136),
      longitude: new Prisma.Decimal(72.8697),
      geoFenceRadius: 100,
      isActive: true,
      workingHours: {
        monday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        tuesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        wednesday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        thursday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        friday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        saturday: { isOpen: true, openTime: '09:00', closeTime: '21:00' },
        sunday: { isOpen: true, openTime: '10:00', closeTime: '18:00' },
      },
    },
    {
      tenantId: tenant.id,
      name: 'Glamour Studio - Bandra',
      slug: 'bandra',
      address: '456 Hill Road, Bandra West',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400050',
      phone: '9876543212',
      email: 'bandra@glamourstudio.com',
      gstin: '27AABCU9603R1ZN',
      latitude: new Prisma.Decimal(19.0596),
      longitude: new Prisma.Decimal(72.8295),
      geoFenceRadius: 100,
      isActive: true,
      workingHours: {
        monday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        tuesday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        wednesday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        thursday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        friday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        saturday: { isOpen: true, openTime: '10:00', closeTime: '22:00' },
        sunday: { isOpen: false, openTime: '', closeTime: '' },
      },
    },
  ];

  const branches = await prisma.branch.createManyAndReturn({
    data: branchesData,
  });

  return { tenant, branches };
}

// ============================================
// Users
// ============================================

async function seedUsers(tenantId: string, branches: { id: string }[]) {
  const passwordHash = await bcrypt.hash('demo123', 10);

  const usersData = [
    // Super Owner
    {
      email: 'owner@glamourstudio.com',
      phone: '9876543201',
      name: 'Rajesh Sharma',
      role: 'super_owner',
      gender: 'male',
    },
    // Branch Managers
    {
      email: 'manager.andheri@glamourstudio.com',
      phone: '9876543202',
      name: 'Priya Patel',
      role: 'branch_manager',
      gender: 'female',
    },
    {
      email: 'manager.bandra@glamourstudio.com',
      phone: '9876543203',
      name: 'Amit Kumar',
      role: 'branch_manager',
      gender: 'male',
    },
    // Receptionists
    {
      email: 'reception.andheri@glamourstudio.com',
      phone: '9876543204',
      name: 'Sneha Gupta',
      role: 'receptionist',
      gender: 'female',
    },
    {
      email: 'reception.bandra@glamourstudio.com',
      phone: '9876543205',
      name: 'Kavita Singh',
      role: 'receptionist',
      gender: 'female',
    },
    // Stylists - Andheri
    {
      email: 'stylist1@glamourstudio.com',
      phone: '9876543206',
      name: 'Vikram Mehta',
      role: 'stylist',
      gender: 'male',
    },
    {
      email: 'stylist2@glamourstudio.com',
      phone: '9876543207',
      name: 'Anita Desai',
      role: 'stylist',
      gender: 'female',
    },
    {
      email: 'stylist3@glamourstudio.com',
      phone: '9876543208',
      name: 'Rahul Verma',
      role: 'stylist',
      gender: 'male',
    },
    {
      email: 'stylist4@glamourstudio.com',
      phone: '9876543209',
      name: 'Meera Reddy',
      role: 'stylist',
      gender: 'female',
    },
    // Stylists - Bandra
    {
      email: 'stylist5@glamourstudio.com',
      phone: '9876543210',
      name: 'Arjun Kapoor',
      role: 'stylist',
      gender: 'male',
    },
    {
      email: 'stylist6@glamourstudio.com',
      phone: '9876543220',
      name: 'Divya Nair',
      role: 'stylist',
      gender: 'female',
    },
    // Additional Stylists - Andheri
    {
      email: 'stylist7@glamourstudio.com',
      phone: '9876543222',
      name: 'Neha Kapoor',
      role: 'stylist',
      gender: 'female',
    },
    {
      email: 'stylist8@glamourstudio.com',
      phone: '9876543223',
      name: 'Rohan Malhotra',
      role: 'stylist',
      gender: 'male',
    },
    // Additional Stylists - Bandra
    {
      email: 'stylist9@glamourstudio.com',
      phone: '9876543224',
      name: 'Pooja Shetty',
      role: 'stylist',
      gender: 'female',
    },
    {
      email: 'stylist10@glamourstudio.com',
      phone: '9876543225',
      name: 'Karthik Iyer',
      role: 'stylist',
      gender: 'male',
    },
    // Accountant
    {
      email: 'accounts@glamourstudio.com',
      phone: '9876543221',
      name: 'Suresh Iyer',
      role: 'accountant',
      gender: 'male',
    },
  ];

  const users = await prisma.user.createManyAndReturn({
    data: usersData.map((u) => ({
      tenantId,
      ...u,
      passwordHash,
      isActive: true,
      settings: { preferredLanguage: 'en' },
    })),
  });

  // Create branch assignments
  const branchAssignments = [
    // Owner - all branches
    { userId: users[0].id, branchId: branches[0].id, isPrimary: true },
    { userId: users[0].id, branchId: branches[1].id, isPrimary: false },
    // Manager Andheri
    { userId: users[1].id, branchId: branches[0].id, isPrimary: true },
    // Manager Bandra
    { userId: users[2].id, branchId: branches[1].id, isPrimary: true },
    // Reception Andheri
    { userId: users[3].id, branchId: branches[0].id, isPrimary: true },
    // Reception Bandra
    { userId: users[4].id, branchId: branches[1].id, isPrimary: true },
    // Stylists Andheri
    { userId: users[5].id, branchId: branches[0].id, isPrimary: true },
    { userId: users[6].id, branchId: branches[0].id, isPrimary: true },
    { userId: users[7].id, branchId: branches[0].id, isPrimary: true },
    { userId: users[8].id, branchId: branches[0].id, isPrimary: true },
    // Stylists Bandra
    { userId: users[9].id, branchId: branches[1].id, isPrimary: true },
    { userId: users[10].id, branchId: branches[1].id, isPrimary: true },
    // Additional Stylists Andheri
    { userId: users[11].id, branchId: branches[0].id, isPrimary: true },
    { userId: users[12].id, branchId: branches[0].id, isPrimary: true },
    // Additional Stylists Bandra
    { userId: users[13].id, branchId: branches[1].id, isPrimary: true },
    { userId: users[14].id, branchId: branches[1].id, isPrimary: true },
    // Accountant - all branches
    { userId: users[15].id, branchId: branches[0].id, isPrimary: true },
    { userId: users[15].id, branchId: branches[1].id, isPrimary: false },
  ];

  await prisma.userBranch.createMany({ data: branchAssignments });

  return users;
}

// ============================================
// Staff Data (Profiles, Shifts, Attendance, Leaves)
// ============================================

async function seedStaffData(
  tenantId: string,
  branches: { id: string }[],
  users: { id: string; role: string; name: string }[]
) {
  const staffUsers = users.filter((u) =>
    ['stylist', 'receptionist', 'branch_manager'].includes(u.role)
  );

  // Staff Profiles
  const staffProfiles = staffUsers.map((user, idx) => ({
    tenantId,
    userId: user.id,
    dateOfJoining: new Date(2023, idx % 12, 1 + idx),
    employeeCode: `EMP${String(idx + 1).padStart(4, '0')}`,
    designation:
      user.role === 'stylist'
        ? 'Senior Stylist'
        : user.role === 'branch_manager'
          ? 'Branch Manager'
          : 'Front Desk Executive',
    department: user.role === 'stylist' ? 'Styling' : 'Operations',
    employmentType: 'full_time',
    skillLevel: user.role === 'stylist' ? (idx % 2 === 0 ? 'senior' : 'junior') : null,
    specializations: user.role === 'stylist' ? ['Hair', 'Makeup'] : [],
    salaryType: 'monthly',
    baseSalary: new Prisma.Decimal(
      user.role === 'branch_manager' ? 50000 : user.role === 'stylist' ? 30000 : 25000
    ),
    commissionEnabled: user.role === 'stylist',
    defaultCommissionType: 'percentage',
    defaultCommissionRate: new Prisma.Decimal(10),
    isActive: true,
  }));

  await prisma.staffProfile.createMany({ data: staffProfiles });

  // Shifts
  const shiftsData = [
    {
      tenantId,
      branchId: branches[0].id,
      name: 'Morning Shift',
      startTime: '09:00',
      endTime: '17:00',
      breakDurationMinutes: 60,
      applicableDays: [1, 2, 3, 4, 5, 6],
    },
    {
      tenantId,
      branchId: branches[0].id,
      name: 'Evening Shift',
      startTime: '13:00',
      endTime: '21:00',
      breakDurationMinutes: 60,
      applicableDays: [1, 2, 3, 4, 5, 6],
    },
    {
      tenantId,
      branchId: branches[1].id,
      name: 'Full Day',
      startTime: '10:00',
      endTime: '22:00',
      breakDurationMinutes: 90,
      applicableDays: [1, 2, 3, 4, 5, 6],
    },
  ];

  const shifts = await prisma.shift.createManyAndReturn({ data: shiftsData });

  // Shift Assignments
  const shiftAssignments = staffUsers.slice(0, 6).map((user, idx) => ({
    tenantId,
    userId: user.id,
    branchId: idx < 4 ? branches[0].id : branches[1].id,
    shiftId: idx < 4 ? shifts[idx % 2].id : shifts[2].id,
    effectiveFrom: new Date(2024, 0, 1),
  }));

  await prisma.staffShiftAssignment.createMany({ data: shiftAssignments });

  // Attendance (last 30 days)
  const attendanceData: Prisma.AttendanceCreateManyInput[] = [];
  const today = new Date();

  for (let dayOffset = 30; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(date.getDate() - dayOffset);
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0) continue; // Skip Sundays

    for (const user of staffUsers.slice(0, 6)) {
      const branchId = staffUsers.indexOf(user) < 4 ? branches[0].id : branches[1].id;
      const isAbsent = Math.random() < 0.1; // 10% absence rate

      attendanceData.push({
        tenantId,
        branchId,
        userId: user.id,
        attendanceDate: date,
        checkInTime: isAbsent ? null : '09:00:00',
        checkOutTime: isAbsent ? null : '18:00:00',
        scheduledHours: new Prisma.Decimal(8),
        actualHours: isAbsent ? new Prisma.Decimal(0) : new Prisma.Decimal(8),
        status: isAbsent ? 'absent' : 'present',
      });
    }
  }

  await prisma.attendance.createMany({ data: attendanceData });

  // Leave Balances
  const leaveBalances = staffUsers
    .map((user) => [
      {
        tenantId,
        userId: user.id,
        financialYear: '2024-25',
        leaveType: 'casual',
        openingBalance: new Prisma.Decimal(12),
        currentBalance: new Prisma.Decimal(10),
      },
      {
        tenantId,
        userId: user.id,
        financialYear: '2024-25',
        leaveType: 'sick',
        openingBalance: new Prisma.Decimal(6),
        currentBalance: new Prisma.Decimal(5),
      },
      {
        tenantId,
        userId: user.id,
        financialYear: '2024-25',
        leaveType: 'earned',
        openingBalance: new Prisma.Decimal(15),
        currentBalance: new Prisma.Decimal(15),
      },
    ])
    .flat();

  await prisma.leaveBalance.createMany({ data: leaveBalances });

  // Tenant Leave Policies
  const leavePolicies = [
    {
      tenantId,
      leaveType: 'casual',
      annualEntitlement: new Prisma.Decimal(12),
      maxCarryForward: new Prisma.Decimal(0),
    },
    {
      tenantId,
      leaveType: 'sick',
      annualEntitlement: new Prisma.Decimal(6),
      maxCarryForward: new Prisma.Decimal(0),
    },
    {
      tenantId,
      leaveType: 'earned',
      annualEntitlement: new Prisma.Decimal(15),
      maxCarryForward: new Prisma.Decimal(5),
    },
  ];

  await prisma.tenantLeavePolicy.createMany({ data: leavePolicies });

  // Stylist Breaks (regular breaks like lunch)
  const stylistUsers = users.filter((u) => u.role === 'stylist');
  const primaryBranchId = branches[0].id;

  const stylistBreaksData = stylistUsers.flatMap((user) => [
    {
      tenantId,
      branchId: primaryBranchId,
      stylistId: user.id,
      name: 'Lunch Break',
      startTime: '13:00',
      endTime: '14:00',
      isActive: true,
    },
    {
      tenantId,
      branchId: primaryBranchId,
      stylistId: user.id,
      name: 'Tea Break',
      startTime: '16:30',
      endTime: '16:45',
      isActive: true,
    },
  ]);

  await prisma.stylistBreak.createMany({ data: stylistBreaksData });

  // Stylist Blocked Slots (vacation days, training, etc.)
  const blockedSlotsData: Prisma.StylistBlockedSlotCreateManyInput[] = [];
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  // Add some blocked slots for testing
  if (stylistUsers.length > 0) {
    // First stylist has a full day blocked tomorrow
    blockedSlotsData.push({
      tenantId,
      branchId: primaryBranchId,
      stylistId: stylistUsers[0].id,
      blockedDate: tomorrow,
      isFullDay: true,
      reason: 'Personal Leave',
    });

    // Second stylist has afternoon blocked in 3 days
    if (stylistUsers.length > 1) {
      const threeDaysLater = new Date();
      threeDaysLater.setDate(threeDaysLater.getDate() + 3);
      blockedSlotsData.push({
        tenantId,
        branchId: primaryBranchId,
        stylistId: stylistUsers[1].id,
        blockedDate: threeDaysLater,
        isFullDay: false,
        startTime: '14:00',
        endTime: '18:00',
        reason: 'Training Session',
      });
    }

    // Third stylist has morning blocked next week
    if (stylistUsers.length > 2) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      blockedSlotsData.push({
        tenantId,
        branchId: primaryBranchId,
        stylistId: stylistUsers[2].id,
        blockedDate: nextWeek,
        isFullDay: false,
        startTime: '09:00',
        endTime: '12:00',
        reason: 'Doctor Appointment',
      });
    }
  }

  if (blockedSlotsData.length > 0) {
    await prisma.stylistBlockedSlot.createMany({ data: blockedSlotsData });
  }
}

// ============================================
// Services & Categories
// ============================================

async function seedServices(tenantId: string, branches: { id: string }[]) {
  const categoriesData = [
    {
      name: 'Hair Services',
      slug: 'hair-services',
      color: '#8B5CF6',
      displayOrder: 0,
    },
    { name: 'Skin Care', slug: 'skin-care', color: '#EC4899', displayOrder: 1 },
    {
      name: 'Nail Services',
      slug: 'nail-services',
      color: '#F59E0B',
      displayOrder: 2,
    },
    { name: 'Makeup', slug: 'makeup', color: '#EF4444', displayOrder: 3 },
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

  // Branch Service Prices (some overrides)
  const branchPrices = services.slice(0, 10).map((service) => ({
    tenantId,
    branchId: branches[1].id, // Bandra branch has higher prices
    serviceId: service.id,
    price: new Prisma.Decimal(Number(service.basePrice) * 1.1), // 10% higher
    isAvailable: true,
  }));

  await prisma.branchServicePrice.createMany({ data: branchPrices });

  return services;
}

// ============================================
// Customers
// ============================================

async function seedCustomers(tenantId: string, branchId: string) {
  const customersData = [
    {
      phone: '9876500001',
      name: 'Priya Sharma',
      email: 'priya.sharma@email.com',
      gender: 'female',
      dob: '1990-05-15',
      tags: ['VIP', 'Regular'],
      loyalty: 500,
      wallet: 1000,
    },
    {
      phone: '9876500002',
      name: 'Rahul Verma',
      email: 'rahul.verma@email.com',
      gender: 'male',
      dob: '1985-08-22',
      tags: ['Regular'],
      loyalty: 150,
      wallet: 0,
    },
    {
      phone: '9876500003',
      name: 'Anita Patel',
      email: 'anita.patel@email.com',
      gender: 'female',
      dob: '1992-12-03',
      tags: ['New'],
      loyalty: 0,
      wallet: 500,
      allergies: ['Ammonia'],
    },
    {
      phone: '9876500004',
      name: 'Vikram Singh',
      email: 'vikram.singh@email.com',
      gender: 'male',
      dob: '1988-03-10',
      tags: ['Corporate'],
      loyalty: 320,
      wallet: 2500,
    },
    {
      phone: '9876500005',
      name: 'Meera Reddy',
      email: 'meera.reddy@email.com',
      gender: 'female',
      dob: '1995-07-28',
      tags: ['VIP', 'Premium'],
      loyalty: 1200,
      wallet: 5000,
    },
    {
      phone: '9876500006',
      name: 'Arjun Kapoor',
      email: null,
      gender: 'male',
      dob: null,
      tags: ['New', 'Referral'],
      loyalty: 0,
      wallet: 0,
    },
    {
      phone: '9876500007',
      name: 'Sneha Gupta',
      email: 'sneha.gupta@email.com',
      gender: 'female',
      dob: '1993-11-05',
      tags: ['Inactive'],
      loyalty: 50,
      wallet: 0,
    },
    {
      phone: '9876500008',
      name: 'Karan Malhotra',
      email: 'karan.m@email.com',
      gender: 'male',
      dob: '1991-02-18',
      tags: ['Regular'],
      loyalty: 200,
      wallet: 750,
    },
    {
      phone: '9876500009',
      name: 'Deepika Nair',
      email: 'deepika.n@email.com',
      gender: 'female',
      dob: '1994-09-12',
      tags: ['Regular'],
      loyalty: 180,
      wallet: 300,
    },
    {
      phone: '9876500010',
      name: 'Amit Joshi',
      email: 'amit.j@email.com',
      gender: 'male',
      dob: '1987-06-25',
      tags: ['New'],
      loyalty: 0,
      wallet: 0,
    },
    {
      phone: '9876500011',
      name: 'Kavita Desai',
      email: 'kavita.d@email.com',
      gender: 'female',
      dob: '1989-04-08',
      tags: ['VIP'],
      loyalty: 850,
      wallet: 2000,
    },
    {
      phone: '9876500012',
      name: 'Suresh Kumar',
      email: 'suresh.k@email.com',
      gender: 'male',
      dob: '1983-01-30',
      tags: ['Regular'],
      loyalty: 220,
      wallet: 500,
    },
    {
      phone: '9876500013',
      name: 'Pooja Mehta',
      email: 'pooja.m@email.com',
      gender: 'female',
      dob: '1996-10-17',
      tags: ['Premium'],
      loyalty: 600,
      wallet: 1500,
    },
    {
      phone: '9876500014',
      name: 'Rajesh Iyer',
      email: 'rajesh.i@email.com',
      gender: 'male',
      dob: '1982-07-04',
      tags: ['Corporate'],
      loyalty: 400,
      wallet: 1000,
    },
    {
      phone: '9876500015',
      name: 'Sunita Rao',
      email: 'sunita.r@email.com',
      gender: 'female',
      dob: '1991-03-22',
      tags: ['Regular'],
      loyalty: 120,
      wallet: 0,
    },
    {
      phone: '9876500016',
      name: 'Manoj Pillai',
      email: 'manoj.p@email.com',
      gender: 'male',
      dob: '1986-12-09',
      tags: ['New'],
      loyalty: 0,
      wallet: 200,
    },
    {
      phone: '9876500017',
      name: 'Rekha Sharma',
      email: 'rekha.s@email.com',
      gender: 'female',
      dob: '1984-08-14',
      tags: ['Inactive'],
      loyalty: 30,
      wallet: 0,
    },
    {
      phone: '9876500018',
      name: 'Vivek Menon',
      email: 'vivek.m@email.com',
      gender: 'male',
      dob: '1990-05-01',
      tags: ['Regular', 'Referral'],
      loyalty: 280,
      wallet: 800,
    },
    {
      phone: '9876500019',
      name: 'Anjali Bose',
      email: 'anjali.b@email.com',
      gender: 'female',
      dob: '1993-02-28',
      tags: ['VIP', 'Premium'],
      loyalty: 950,
      wallet: 3000,
    },
    {
      phone: '9876500020',
      name: 'Sanjay Gupta',
      email: 'sanjay.g@email.com',
      gender: 'male',
      dob: '1988-11-11',
      tags: ['Regular'],
      loyalty: 175,
      wallet: 400,
    },
    {
      phone: '9876500021',
      name: 'Neha Agarwal',
      email: 'neha.a@email.com',
      gender: 'female',
      dob: '1997-06-19',
      tags: ['New'],
      loyalty: 0,
      wallet: 0,
    },
    {
      phone: '9876500022',
      name: 'Prakash Reddy',
      email: 'prakash.r@email.com',
      gender: 'male',
      dob: '1985-09-07',
      tags: ['Corporate'],
      loyalty: 350,
      wallet: 1200,
    },
    {
      phone: '9876500023',
      name: 'Lakshmi Venkat',
      email: 'lakshmi.v@email.com',
      gender: 'female',
      dob: '1992-04-23',
      tags: ['Regular'],
      loyalty: 200,
      wallet: 600,
    },
    {
      phone: '9876500024',
      name: 'Arun Nambiar',
      email: 'arun.n@email.com',
      gender: 'male',
      dob: '1989-01-16',
      tags: ['Premium'],
      loyalty: 520,
      wallet: 1800,
    },
    {
      phone: '9876500025',
      name: 'Divya Krishnan',
      email: 'divya.k@email.com',
      gender: 'female',
      dob: '1994-07-31',
      tags: ['VIP'],
      loyalty: 780,
      wallet: 2500,
    },
  ];

  const customers = await prisma.customer.createManyAndReturn({
    data: customersData.map((c) => ({
      tenantId,
      phone: c.phone,
      name: c.name,
      email: c.email,
      gender: c.gender,
      dateOfBirth: c.dob ? new Date(c.dob) : null,
      tags: c.tags,
      loyaltyPoints: c.loyalty,
      walletBalance: new Prisma.Decimal(c.wallet),
      allergies: c.allergies || [],
      firstVisitBranchId: branchId,
      marketingConsent: true,
      preferences: {},
      source: ['manual', 'phone'][Math.floor(Math.random() * 2)] as 'manual' | 'phone',
    })),
  });

  return customers;
}

// ============================================
// Appointments
// ============================================

async function seedAppointments(
  tenantId: string,
  branchId: string,
  users: { id: string; role: string }[],
  services: {
    id: string;
    name: string;
    sku: string | null;
    basePrice: Prisma.Decimal;
    taxRate: Prisma.Decimal;
    durationMinutes: number;
    activeTimeMinutes: number;
    commissionValue: Prisma.Decimal;
  }[],
  customers: { id: string; name: string; phone: string }[]
) {
  // Get stylists assigned to this specific branch
  const branchStylists = await prisma.userBranch.findMany({
    where: { branchId },
    select: { userId: true },
  });
  const branchStylistIds = new Set(branchStylists.map((ub) => ub.userId));
  const stylists = users.filter((u) => u.role === 'stylist' && branchStylistIds.has(u.id));

  if (stylists.length === 0) {
    console.log('⚠️  No stylists found for branch, skipping appointments');
    return [];
  }

  const today = new Date();

  const appointmentsData: Prisma.AppointmentCreateManyInput[] = [];
  const appointmentServicesData: {
    appointmentIndex: number;
    service: (typeof services)[0];
    stylistId: string;
  }[] = [];

  // Time slots for more realistic scheduling
  const timeSlots = [
    '09:00',
    '09:30',
    '10:00',
    '10:30',
    '11:00',
    '11:30',
    '12:00',
    '12:30',
    '14:00',
    '14:30',
    '15:00',
    '15:30',
    '16:00',
    '16:30',
    '17:00',
    '17:30',
    '18:00',
    '18:30',
    '19:00',
    '19:30',
    '20:00',
  ];

  // Generate appointments for past 7 days and next 7 days
  for (let dayOffset = -7; dayOffset <= 7; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    const dayOfWeek = date.getDay();

    if (dayOfWeek === 0) continue; // Skip Sundays

    // More appointments per day: 8-15 per stylist, distributed throughout the day
    // This ensures each stylist has a good number of appointments
    for (const stylist of stylists) {
      // 3-6 appointments per stylist per day
      const appointmentsForStylist = 3 + Math.floor(Math.random() * 4);

      // Track used time slots for this stylist to avoid too many overlaps
      const usedSlots = new Set<string>();

      for (let i = 0; i < appointmentsForStylist; i++) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const service = services[Math.floor(Math.random() * services.length)];

        // Pick a time slot that hasn't been used much
        let startTime: string;
        let attempts = 0;
        do {
          startTime = timeSlots[Math.floor(Math.random() * timeSlots.length)];
          attempts++;
        } while (usedSlots.has(startTime) && attempts < 10);
        usedSlots.add(startTime);

        const startHour = parseInt(startTime.split(':')[0]);
        const startMin = parseInt(startTime.split(':')[1]);
        const endMinutes = startHour * 60 + startMin + service.durationMinutes;
        const endHour = Math.floor(endMinutes / 60);
        const endMin = endMinutes % 60;
        const endTime = `${String(Math.min(endHour, 21)).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`;

        let status: string;
        if (dayOffset < 0) {
          // Past appointments
          const rand = Math.random();
          status = rand < 0.7 ? 'completed' : rand < 0.85 ? 'cancelled' : 'no_show';
        } else if (dayOffset === 0) {
          // Today - more variety in statuses
          const currentHour = today.getHours();
          if (startHour < currentHour - 1) {
            // Past appointments today
            status = Math.random() < 0.8 ? 'completed' : 'no_show';
          } else if (startHour <= currentHour + 1) {
            // Current/near appointments
            const rand = Math.random();
            status = rand < 0.3 ? 'in_progress' : rand < 0.6 ? 'checked_in' : 'confirmed';
          } else {
            // Future appointments today
            status = Math.random() < 0.7 ? 'confirmed' : 'booked';
          }
        } else {
          // Future days
          status = Math.random() < 0.6 ? 'booked' : 'confirmed';
        }

        const price = Number(service.basePrice);
        const taxAmount = (price * Number(service.taxRate)) / 100;

        appointmentsData.push({
          tenantId,
          branchId,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          scheduledDate: date,
          scheduledTime: startTime,
          scheduledEndTime: endTime,
          totalDuration: service.durationMinutes,
          stylistId: stylist.id,
          bookingType: ['online', 'phone', 'walk_in'][Math.floor(Math.random() * 3)],
          status,
          subtotal: new Prisma.Decimal(price),
          taxAmount: new Prisma.Decimal(taxAmount),
          totalAmount: new Prisma.Decimal(price + taxAmount),
          priceLockedAt: new Date(),
        });

        appointmentServicesData.push({
          appointmentIndex: appointmentsData.length - 1,
          service,
          stylistId: stylist.id,
        });
      }
    }
  }

  // Add intentional conflicting appointments for today and tomorrow
  // This demonstrates the conflict visualization feature
  const conflictDays = [0, 1]; // Today and tomorrow
  for (const dayOffset of conflictDays) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);

    if (date.getDay() === 0) continue; // Skip Sunday

    // Create 2-3 overlapping appointments for the first stylist
    const primaryStylist = stylists[0];
    const conflictTimes = [
      { start: '10:00', end: '11:30', status: 'booked' },
      { start: '10:30', end: '12:00', status: 'confirmed' }, // Overlaps with first
      { start: '11:00', end: '12:30', status: 'booked' }, // Overlaps with both
    ];

    for (const timeSlot of conflictTimes) {
      const customer = customers[Math.floor(Math.random() * customers.length)];
      const service = services[Math.floor(Math.random() * Math.min(5, services.length))];
      const price = Number(service.basePrice);
      const taxAmount = (price * Number(service.taxRate)) / 100;

      appointmentsData.push({
        tenantId,
        branchId,
        customerId: customer.id,
        customerName: customer.name,
        customerPhone: customer.phone,
        scheduledDate: date,
        scheduledTime: timeSlot.start,
        scheduledEndTime: timeSlot.end,
        totalDuration: 90,
        stylistId: primaryStylist.id,
        bookingType: 'phone',
        status: dayOffset === 0 ? timeSlot.status : 'booked',
        subtotal: new Prisma.Decimal(price),
        taxAmount: new Prisma.Decimal(taxAmount),
        totalAmount: new Prisma.Decimal(price + taxAmount),
        priceLockedAt: new Date(),
        conflictNotes: 'Intentional overlap for demo',
      });

      appointmentServicesData.push({
        appointmentIndex: appointmentsData.length - 1,
        service,
        stylistId: primaryStylist.id,
      });
    }

    // Create a partial overlap scenario for second stylist (if exists)
    if (stylists.length > 1) {
      const secondStylist = stylists[1];
      const partialOverlapTimes = [
        { start: '14:00', end: '15:00', status: 'confirmed' },
        { start: '14:45', end: '15:30', status: 'booked' }, // 15 min overlap (partial)
      ];

      for (const timeSlot of partialOverlapTimes) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const service = services[Math.floor(Math.random() * Math.min(5, services.length))];
        const price = Number(service.basePrice);
        const taxAmount = (price * Number(service.taxRate)) / 100;

        appointmentsData.push({
          tenantId,
          branchId,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          scheduledDate: date,
          scheduledTime: timeSlot.start,
          scheduledEndTime: timeSlot.end,
          totalDuration: 60,
          stylistId: secondStylist.id,
          bookingType: 'walk_in',
          status: dayOffset === 0 ? timeSlot.status : 'booked',
          subtotal: new Prisma.Decimal(price),
          taxAmount: new Prisma.Decimal(taxAmount),
          totalAmount: new Prisma.Decimal(price + taxAmount),
          priceLockedAt: new Date(),
          conflictNotes: 'Partial overlap for demo',
        });

        appointmentServicesData.push({
          appointmentIndex: appointmentsData.length - 1,
          service,
          stylistId: secondStylist.id,
        });
      }
    }

    // Add back-to-back appointments for third stylist to test tight scheduling
    if (stylists.length > 2) {
      const thirdStylist = stylists[2];
      const backToBackTimes = [
        { start: '15:00', end: '15:45' },
        { start: '15:45', end: '16:30' },
        { start: '16:30', end: '17:15' },
        { start: '17:15', end: '18:00' },
      ];

      for (const timeSlot of backToBackTimes) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        const service = services[Math.floor(Math.random() * Math.min(8, services.length))];
        const price = Number(service.basePrice);
        const taxAmount = (price * Number(service.taxRate)) / 100;

        appointmentsData.push({
          tenantId,
          branchId,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          scheduledDate: date,
          scheduledTime: timeSlot.start,
          scheduledEndTime: timeSlot.end,
          totalDuration: 45,
          stylistId: thirdStylist.id,
          bookingType: 'online',
          status: dayOffset === 0 ? 'confirmed' : 'booked',
          subtotal: new Prisma.Decimal(price),
          taxAmount: new Prisma.Decimal(taxAmount),
          totalAmount: new Prisma.Decimal(price + taxAmount),
          priceLockedAt: new Date(),
        });

        appointmentServicesData.push({
          appointmentIndex: appointmentsData.length - 1,
          service,
          stylistId: thirdStylist.id,
        });
      }
    }

    // Add long appointments (2+ hours) for fourth stylist to test duration display
    if (stylists.length > 3) {
      const fourthStylist = stylists[3];
      const longAppointments = [
        { start: '10:00', end: '12:30', duration: 150, name: 'Bridal Makeup' },
        { start: '14:00', end: '17:00', duration: 180, name: 'Keratin Treatment' },
      ];

      for (const apt of longAppointments) {
        const customer = customers[Math.floor(Math.random() * customers.length)];
        // Find matching service or use first one
        const service =
          services.find((s) => s.name.includes(apt.name.split(' ')[0])) || services[0];
        const price = Number(service.basePrice);
        const taxAmount = (price * Number(service.taxRate)) / 100;

        appointmentsData.push({
          tenantId,
          branchId,
          customerId: customer.id,
          customerName: customer.name,
          customerPhone: customer.phone,
          scheduledDate: date,
          scheduledTime: apt.start,
          scheduledEndTime: apt.end,
          totalDuration: apt.duration,
          stylistId: fourthStylist.id,
          bookingType: 'phone',
          status: dayOffset === 0 ? 'confirmed' : 'booked',
          subtotal: new Prisma.Decimal(price),
          taxAmount: new Prisma.Decimal(taxAmount),
          totalAmount: new Prisma.Decimal(price + taxAmount),
          priceLockedAt: new Date(),
        });

        appointmentServicesData.push({
          appointmentIndex: appointmentsData.length - 1,
          service,
          stylistId: fourthStylist.id,
        });
      }
    }
  }

  // Create appointments
  const appointments = await prisma.appointment.createManyAndReturn({ data: appointmentsData });

  // Create appointment services
  const servicesInsertData = appointmentServicesData.map((item, idx) => {
    const appointment = appointments[item.appointmentIndex];
    const service = item.service;
    const price = Number(service.basePrice);
    const taxAmount = (price * Number(service.taxRate)) / 100;

    return {
      tenantId,
      appointmentId: appointment.id,
      serviceId: service.id,
      serviceName: service.name,
      serviceSku: service.sku,
      unitPrice: new Prisma.Decimal(price),
      quantity: 1,
      discountAmount: new Prisma.Decimal(0),
      taxRate: service.taxRate,
      taxAmount: new Prisma.Decimal(taxAmount),
      totalAmount: new Prisma.Decimal(price + taxAmount),
      durationMinutes: service.durationMinutes,
      activeTimeMinutes: service.activeTimeMinutes,
      stylistId: item.stylistId,
      status: appointment.status === 'completed' ? 'completed' : 'pending',
      commissionRate: service.commissionValue,
      commissionAmount: new Prisma.Decimal((price * Number(service.commissionValue)) / 100),
    };
  });

  await prisma.appointmentService.createMany({ data: servicesInsertData });

  // Create status history
  const statusHistoryData = appointments.map((apt) => ({
    tenantId,
    appointmentId: apt.id,
    toStatus: apt.status,
  }));

  await prisma.appointmentStatusHistory.createMany({ data: statusHistoryData });

  return appointments;
}

// ============================================
// Inventory (Products, Vendors, Stock)
// ============================================

async function seedInventory(tenantId: string, branches: { id: string }[]) {
  // Product Categories
  const productCategoriesData = [
    { name: 'Hair Care', slug: 'hair-care', expiryTrackingEnabled: true, displayOrder: 0 },
    { name: 'Skin Care', slug: 'skin-care', expiryTrackingEnabled: true, displayOrder: 1 },
    { name: 'Nail Products', slug: 'nail-products', expiryTrackingEnabled: false, displayOrder: 2 },
    { name: 'Makeup', slug: 'makeup', expiryTrackingEnabled: true, displayOrder: 3 },
    {
      name: 'Tools & Equipment',
      slug: 'tools-equipment',
      expiryTrackingEnabled: false,
      displayOrder: 4,
    },
    { name: 'Consumables', slug: 'consumables', expiryTrackingEnabled: false, displayOrder: 5 },
  ];

  const productCategories = await prisma.productCategory.createManyAndReturn({
    data: productCategoriesData.map((c) => ({ tenantId, ...c, isActive: true })),
  });

  // Products
  const productsData = [
    // Hair Care
    {
      categoryIdx: 0,
      sku: 'PROD-001',
      barcode: '8901234567890',
      name: "L'Oreal Shampoo 500ml",
      type: 'both',
      unit: 'piece',
      purchasePrice: 350,
      sellingPrice: 450,
      tax: 18,
    },
    {
      categoryIdx: 0,
      sku: 'PROD-002',
      barcode: '8901234567891',
      name: "L'Oreal Conditioner 500ml",
      type: 'both',
      unit: 'piece',
      purchasePrice: 380,
      sellingPrice: 480,
      tax: 18,
    },
    {
      categoryIdx: 0,
      sku: 'PROD-003',
      barcode: '8901234567892',
      name: 'Hair Color - Black',
      type: 'consumable',
      unit: 'tube',
      purchasePrice: 150,
      sellingPrice: 0,
      tax: 18,
    },
    {
      categoryIdx: 0,
      sku: 'PROD-004',
      barcode: '8901234567893',
      name: 'Hair Color - Brown',
      type: 'consumable',
      unit: 'tube',
      purchasePrice: 150,
      sellingPrice: 0,
      tax: 18,
    },
    {
      categoryIdx: 0,
      sku: 'PROD-005',
      barcode: '8901234567894',
      name: 'Hair Serum 100ml',
      type: 'both',
      unit: 'piece',
      purchasePrice: 280,
      sellingPrice: 400,
      tax: 18,
    },
    {
      categoryIdx: 0,
      sku: 'PROD-006',
      barcode: '8901234567895',
      name: 'Hair Gel 250ml',
      type: 'both',
      unit: 'piece',
      purchasePrice: 120,
      sellingPrice: 180,
      tax: 18,
    },
    {
      categoryIdx: 0,
      sku: 'PROD-007',
      barcode: '8901234567896',
      name: 'Hair Spray 300ml',
      type: 'both',
      unit: 'piece',
      purchasePrice: 200,
      sellingPrice: 300,
      tax: 18,
    },
    {
      categoryIdx: 0,
      sku: 'PROD-008',
      barcode: '8901234567897',
      name: 'Keratin Treatment Kit',
      type: 'consumable',
      unit: 'kit',
      purchasePrice: 2500,
      sellingPrice: 0,
      tax: 18,
    },
    // Skin Care
    {
      categoryIdx: 1,
      sku: 'PROD-009',
      barcode: '8901234567898',
      name: 'Facial Cream - Gold',
      type: 'consumable',
      unit: 'jar',
      purchasePrice: 400,
      sellingPrice: 0,
      tax: 18,
    },
    {
      categoryIdx: 1,
      sku: 'PROD-010',
      barcode: '8901234567899',
      name: 'Facial Cream - Diamond',
      type: 'consumable',
      unit: 'jar',
      purchasePrice: 600,
      sellingPrice: 0,
      tax: 18,
    },
    {
      categoryIdx: 1,
      sku: 'PROD-011',
      barcode: '8901234567900',
      name: 'Face Wash 200ml',
      type: 'both',
      unit: 'piece',
      purchasePrice: 180,
      sellingPrice: 280,
      tax: 18,
    },
    {
      categoryIdx: 1,
      sku: 'PROD-012',
      barcode: '8901234567901',
      name: 'Moisturizer 100ml',
      type: 'both',
      unit: 'piece',
      purchasePrice: 220,
      sellingPrice: 350,
      tax: 18,
    },
    {
      categoryIdx: 1,
      sku: 'PROD-013',
      barcode: '8901234567902',
      name: 'Sunscreen SPF50 100ml',
      type: 'both',
      unit: 'piece',
      purchasePrice: 300,
      sellingPrice: 450,
      tax: 18,
    },
    {
      categoryIdx: 1,
      sku: 'PROD-014',
      barcode: '8901234567903',
      name: 'Bleach Cream 500g',
      type: 'consumable',
      unit: 'pack',
      purchasePrice: 250,
      sellingPrice: 0,
      tax: 18,
    },
    // Nail Products
    {
      categoryIdx: 2,
      sku: 'PROD-015',
      barcode: '8901234567904',
      name: 'Nail Polish - Red',
      type: 'both',
      unit: 'piece',
      purchasePrice: 80,
      sellingPrice: 150,
      tax: 18,
    },
    {
      categoryIdx: 2,
      sku: 'PROD-016',
      barcode: '8901234567905',
      name: 'Nail Polish - Pink',
      type: 'both',
      unit: 'piece',
      purchasePrice: 80,
      sellingPrice: 150,
      tax: 18,
    },
    {
      categoryIdx: 2,
      sku: 'PROD-017',
      barcode: '8901234567906',
      name: 'Nail Polish Remover 100ml',
      type: 'consumable',
      unit: 'piece',
      purchasePrice: 60,
      sellingPrice: 0,
      tax: 18,
    },
    {
      categoryIdx: 2,
      sku: 'PROD-018',
      barcode: '8901234567907',
      name: 'Gel Nail Kit',
      type: 'consumable',
      unit: 'kit',
      purchasePrice: 800,
      sellingPrice: 0,
      tax: 18,
    },
    {
      categoryIdx: 2,
      sku: 'PROD-019',
      barcode: '8901234567908',
      name: 'Cuticle Oil 30ml',
      type: 'both',
      unit: 'piece',
      purchasePrice: 120,
      sellingPrice: 200,
      tax: 18,
    },
    // Makeup
    {
      categoryIdx: 3,
      sku: 'PROD-020',
      barcode: '8901234567909',
      name: 'Foundation - Fair',
      type: 'both',
      unit: 'piece',
      purchasePrice: 400,
      sellingPrice: 650,
      tax: 18,
    },
    {
      categoryIdx: 3,
      sku: 'PROD-021',
      barcode: '8901234567910',
      name: 'Foundation - Medium',
      type: 'both',
      unit: 'piece',
      purchasePrice: 400,
      sellingPrice: 650,
      tax: 18,
    },
    {
      categoryIdx: 3,
      sku: 'PROD-022',
      barcode: '8901234567911',
      name: 'Lipstick Set',
      type: 'both',
      unit: 'set',
      purchasePrice: 500,
      sellingPrice: 800,
      tax: 18,
    },
    {
      categoryIdx: 3,
      sku: 'PROD-023',
      barcode: '8901234567912',
      name: 'Eye Shadow Palette',
      type: 'both',
      unit: 'piece',
      purchasePrice: 600,
      sellingPrice: 950,
      tax: 18,
    },
    {
      categoryIdx: 3,
      sku: 'PROD-024',
      barcode: '8901234567913',
      name: 'Mascara',
      type: 'both',
      unit: 'piece',
      purchasePrice: 250,
      sellingPrice: 400,
      tax: 18,
    },
    // Tools
    {
      categoryIdx: 4,
      sku: 'PROD-025',
      barcode: '8901234567914',
      name: 'Hair Dryer',
      type: 'retail',
      unit: 'piece',
      purchasePrice: 1500,
      sellingPrice: 2200,
      tax: 18,
    },
    {
      categoryIdx: 4,
      sku: 'PROD-026',
      barcode: '8901234567915',
      name: 'Hair Straightener',
      type: 'retail',
      unit: 'piece',
      purchasePrice: 2000,
      sellingPrice: 3000,
      tax: 18,
    },
    {
      categoryIdx: 4,
      sku: 'PROD-027',
      barcode: '8901234567916',
      name: 'Curling Iron',
      type: 'retail',
      unit: 'piece',
      purchasePrice: 1800,
      sellingPrice: 2800,
      tax: 18,
    },
    {
      categoryIdx: 4,
      sku: 'PROD-028',
      barcode: '8901234567917',
      name: 'Makeup Brush Set',
      type: 'both',
      unit: 'set',
      purchasePrice: 800,
      sellingPrice: 1200,
      tax: 18,
    },
    // Consumables
    {
      categoryIdx: 5,
      sku: 'PROD-029',
      barcode: '8901234567918',
      name: 'Cotton Pads (100pc)',
      type: 'consumable',
      unit: 'pack',
      purchasePrice: 80,
      sellingPrice: 0,
      tax: 18,
    },
    {
      categoryIdx: 5,
      sku: 'PROD-030',
      barcode: '8901234567919',
      name: 'Disposable Gloves (50pc)',
      type: 'consumable',
      unit: 'box',
      purchasePrice: 150,
      sellingPrice: 0,
      tax: 18,
    },
    {
      categoryIdx: 5,
      sku: 'PROD-031',
      barcode: '8901234567920',
      name: 'Tissue Paper Roll',
      type: 'consumable',
      unit: 'roll',
      purchasePrice: 40,
      sellingPrice: 0,
      tax: 18,
    },
    {
      categoryIdx: 5,
      sku: 'PROD-032',
      barcode: '8901234567921',
      name: 'Sanitizer 500ml',
      type: 'consumable',
      unit: 'piece',
      purchasePrice: 120,
      sellingPrice: 0,
      tax: 18,
    },
  ];

  const products = await prisma.product.createManyAndReturn({
    data: productsData.map((p) => ({
      tenantId,
      categoryId: productCategories[p.categoryIdx].id,
      sku: p.sku,
      barcode: p.barcode,
      name: p.name,
      productType: p.type,
      unitOfMeasure: p.unit,
      defaultPurchasePrice: new Prisma.Decimal(p.purchasePrice),
      defaultSellingPrice: new Prisma.Decimal(p.sellingPrice),
      taxRate: new Prisma.Decimal(p.tax),
      expiryTrackingEnabled: productCategories[p.categoryIdx].expiryTrackingEnabled,
      isActive: true,
    })),
  });

  // Branch Product Settings
  const branchSettings = products.flatMap((product) =>
    branches.map((branch) => ({
      tenantId,
      branchId: branch.id,
      productId: product.id,
      isEnabled: true,
      reorderLevel: 10,
    }))
  );

  await prisma.branchProductSettings.createMany({ data: branchSettings });

  // Vendors
  const vendorsData = [
    {
      name: "L'Oreal India",
      contactPerson: 'Amit Shah',
      phone: '9876543301',
      email: 'orders@loreal.in',
      city: 'Mumbai',
      state: 'Maharashtra',
      gstin: '27AABCL1234R1ZM',
      paymentTerms: 30,
      leadTime: 7,
    },
    {
      name: 'Lakme Cosmetics',
      contactPerson: 'Priya Menon',
      phone: '9876543302',
      email: 'supply@lakme.in',
      city: 'Mumbai',
      state: 'Maharashtra',
      gstin: '27AABCL5678R1ZN',
      paymentTerms: 15,
      leadTime: 5,
    },
    {
      name: 'Maybelline India',
      contactPerson: 'Rahul Gupta',
      phone: '9876543303',
      email: 'orders@maybelline.in',
      city: 'Delhi',
      state: 'Delhi',
      gstin: '07AABCM9012R1ZO',
      paymentTerms: 30,
      leadTime: 10,
    },
    {
      name: 'Beauty Supplies Co',
      contactPerson: 'Sneha Patel',
      phone: '9876543304',
      email: 'sales@beautysupplies.in',
      city: 'Mumbai',
      state: 'Maharashtra',
      gstin: '27AABCB3456R1ZP',
      paymentTerms: 7,
      leadTime: 3,
    },
    {
      name: 'Salon Equipment Hub',
      contactPerson: 'Vikram Singh',
      phone: '9876543305',
      email: 'orders@salonhub.in',
      city: 'Pune',
      state: 'Maharashtra',
      gstin: '27AABCS7890R1ZQ',
      paymentTerms: 45,
      leadTime: 14,
    },
  ];

  const vendors = await prisma.vendor.createManyAndReturn({
    data: vendorsData.map((v) => ({
      tenantId,
      name: v.name,
      contactPerson: v.contactPerson,
      phone: v.phone,
      email: v.email,
      city: v.city,
      state: v.state,
      gstin: v.gstin,
      paymentTermsDays: v.paymentTerms,
      leadTimeDays: v.leadTime,
      isActive: true,
    })),
  });

  // Vendor Product Mappings
  const vendorMappings = products.slice(0, 20).map((product, idx) => ({
    tenantId,
    vendorId: vendors[idx % vendors.length].id,
    productId: product.id,
    lastPurchasePrice: product.defaultPurchasePrice,
    isPreferred: idx % 3 === 0,
  }));

  await prisma.vendorProductMapping.createMany({ data: vendorMappings });

  // Stock Batches (initial stock)
  const stockBatches = products.flatMap((product) =>
    branches.map((branch) => {
      const quantity = 20 + Math.floor(Math.random() * 30);
      const expiryDate = product.expiryTrackingEnabled
        ? new Date(Date.now() + (90 + Math.floor(Math.random() * 180)) * 24 * 60 * 60 * 1000)
        : null;

      return {
        tenantId,
        branchId: branch.id,
        productId: product.id,
        batchNumber: `BATCH-${product.sku}-001`,
        quantity,
        availableQuantity: quantity,
        unitCost: product.defaultPurchasePrice,
        totalValue: new Prisma.Decimal(Number(product.defaultPurchasePrice) * quantity),
        receiptDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        expiryDate,
        isExpired: false,
        isDepleted: false,
      };
    })
  );

  await prisma.stockBatch.createMany({ data: stockBatches });

  return products;
}

// ============================================
// Billing (Invoices)
// ============================================

async function seedBilling(
  tenantId: string,
  branchId: string,
  customers: { id: string; name: string; phone: string }[],
  services: {
    id: string;
    name: string;
    sku: string | null;
    basePrice: Prisma.Decimal;
    taxRate: Prisma.Decimal;
  }[],
  products: {
    id: string;
    name: string;
    sku: string | null;
    defaultSellingPrice: Prisma.Decimal;
    taxRate: Prisma.Decimal;
    productType: string;
  }[],
  users: { id: string; role: string }[]
) {
  const stylists = users.filter((u) => u.role === 'stylist');
  const retailProducts = products.filter(
    (p) => p.productType !== 'consumable' && Number(p.defaultSellingPrice) > 0
  );

  // Create 30 invoices over the past 30 days
  const invoicesData: Prisma.InvoiceCreateManyInput[] = [];
  const invoiceItemsData: { invoiceIndex: number; items: Prisma.InvoiceItemCreateManyInput[] }[] =
    [];
  const paymentsData: {
    invoiceIndex: number;
    payment: Omit<Prisma.PaymentCreateManyInput, 'invoiceId'>;
  }[] = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date();
    date.setDate(date.getDate() - Math.floor(Math.random() * 30));

    const customer = customers[Math.floor(Math.random() * customers.length)];
    const invoiceNumber = `INV-${String(i + 1).padStart(5, '0')}`;

    // 1-3 services per invoice
    const numServices = 1 + Math.floor(Math.random() * 3);
    const selectedServices = [];
    for (let j = 0; j < numServices; j++) {
      selectedServices.push(services[Math.floor(Math.random() * services.length)]);
    }

    // 0-2 products per invoice
    const numProducts = Math.floor(Math.random() * 3);
    const selectedProducts = [];
    for (let j = 0; j < numProducts; j++) {
      selectedProducts.push(retailProducts[Math.floor(Math.random() * retailProducts.length)]);
    }

    let subtotal = 0;
    let totalTax = 0;
    const items: Prisma.InvoiceItemCreateManyInput[] = [];

    // Service items
    selectedServices.forEach((service, idx) => {
      const price = Number(service.basePrice);
      const taxRate = Number(service.taxRate);
      const taxAmount = (price * taxRate) / 100;
      const cgstRate = taxRate / 2;
      const sgstRate = taxRate / 2;

      subtotal += price;
      totalTax += taxAmount;

      items.push({
        tenantId,
        invoiceId: '', // Will be set later
        itemType: 'service',
        referenceId: service.id,
        referenceSku: service.sku,
        name: service.name,
        unitPrice: new Prisma.Decimal(price),
        quantity: 1,
        grossAmount: new Prisma.Decimal(price),
        taxRate: new Prisma.Decimal(taxRate),
        taxableAmount: new Prisma.Decimal(price),
        cgstRate: new Prisma.Decimal(cgstRate),
        cgstAmount: new Prisma.Decimal(taxAmount / 2),
        sgstRate: new Prisma.Decimal(sgstRate),
        sgstAmount: new Prisma.Decimal(taxAmount / 2),
        totalTax: new Prisma.Decimal(taxAmount),
        netAmount: new Prisma.Decimal(price + taxAmount),
        stylistId: stylists[Math.floor(Math.random() * stylists.length)].id,
        displayOrder: idx,
      });
    });

    // Product items
    selectedProducts.forEach((product, idx) => {
      const price = Number(product.defaultSellingPrice);
      const taxRate = Number(product.taxRate);
      const taxAmount = (price * taxRate) / 100;
      const cgstRate = taxRate / 2;
      const sgstRate = taxRate / 2;

      subtotal += price;
      totalTax += taxAmount;

      items.push({
        tenantId,
        invoiceId: '', // Will be set later
        itemType: 'product',
        referenceId: product.id,
        referenceSku: product.sku,
        name: product.name,
        unitPrice: new Prisma.Decimal(price),
        quantity: 1,
        grossAmount: new Prisma.Decimal(price),
        taxRate: new Prisma.Decimal(taxRate),
        taxableAmount: new Prisma.Decimal(price),
        cgstRate: new Prisma.Decimal(cgstRate),
        cgstAmount: new Prisma.Decimal(taxAmount / 2),
        sgstRate: new Prisma.Decimal(sgstRate),
        sgstAmount: new Prisma.Decimal(taxAmount / 2),
        totalTax: new Prisma.Decimal(taxAmount),
        netAmount: new Prisma.Decimal(price + taxAmount),
        displayOrder: selectedServices.length + idx,
      });
    });

    const grandTotal = subtotal + totalTax;

    invoicesData.push({
      tenantId,
      branchId,
      invoiceNumber,
      invoiceDate: date,
      customerId: customer.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      subtotal: new Prisma.Decimal(subtotal),
      taxableAmount: new Prisma.Decimal(subtotal),
      cgstAmount: new Prisma.Decimal(totalTax / 2),
      sgstAmount: new Prisma.Decimal(totalTax / 2),
      totalTax: new Prisma.Decimal(totalTax),
      grandTotal: new Prisma.Decimal(grandTotal),
      paymentStatus: 'paid',
      amountPaid: new Prisma.Decimal(grandTotal),
      amountDue: new Prisma.Decimal(0),
      status: 'finalized',
      finalizedAt: date,
    });

    invoiceItemsData.push({ invoiceIndex: i, items });

    // Payment
    const paymentMethods = ['cash', 'card', 'upi'];
    paymentsData.push({
      invoiceIndex: i,
      payment: {
        tenantId,
        branchId,
        paymentMethod: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
        amount: new Prisma.Decimal(grandTotal),
        status: 'completed',
        paymentDate: date,
      },
    });
  }

  // Create invoices
  const invoices = await prisma.invoice.createManyAndReturn({ data: invoicesData });

  // Create invoice items
  const allItems = invoiceItemsData.flatMap(({ invoiceIndex, items }) =>
    items.map((item) => ({ ...item, invoiceId: invoices[invoiceIndex].id }))
  );
  await prisma.invoiceItem.createMany({ data: allItems });

  // Create payments
  const allPayments = paymentsData.map(({ invoiceIndex, payment }) => ({
    ...payment,
    invoiceId: invoices[invoiceIndex].id,
  }));
  await prisma.payment.createMany({ data: allPayments });
}

// ============================================
// Loyalty & Tags
// ============================================

async function seedLoyaltyAndTags(tenantId: string) {
  // Loyalty Config
  await prisma.loyaltyConfig.create({
    data: {
      tenantId,
      pointsPerUnit: new Prisma.Decimal(0.01), // 1 point per ₹100
      redemptionValuePerPoint: new Prisma.Decimal(0.5), // ₹0.50 per point
      expiryDays: 365,
      isEnabled: true,
    },
  });

  // Custom Tags
  const tagsData = [
    { name: 'VIP', color: '#8B5CF6' },
    { name: 'Premium', color: '#EC4899' },
    { name: 'Regular', color: '#3B82F6' },
    { name: 'New', color: '#22C55E' },
    { name: 'Inactive', color: '#6B7280' },
    { name: 'Corporate', color: '#F59E0B' },
    { name: 'Referral', color: '#10B981' },
    { name: 'Birthday Month', color: '#EF4444' },
  ];

  await prisma.customTag.createMany({
    data: tagsData.map((t) => ({ tenantId, ...t })),
  });
}

// ============================================
// Waitlist Entries
// ============================================

async function seedWaitlist(
  tenantId: string,
  branchId: string,
  customers: { id: string; name: string; phone: string }[],
  services: { id: string }[],
  users: { id: string; role: string }[]
) {
  const stylists = users.filter((u) => u.role === 'stylist');
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(nextWeek.getDate() + 7);
  const twoWeeks = new Date(today);
  twoWeeks.setDate(twoWeeks.getDate() + 14);

  const waitlistData = [
    {
      tenantId,
      branchId,
      customerId: customers[0]?.id,
      customerName: customers[0]?.name || 'Priya Sharma',
      customerPhone: customers[0]?.phone || '9876500001',
      serviceIds: [services[0]?.id, services[1]?.id].filter(Boolean),
      preferredStylistId: stylists[0]?.id,
      preferredStartDate: tomorrow,
      preferredEndDate: nextWeek,
      timePreferences: ['morning', 'afternoon'],
      status: 'active',
      notes: 'Prefers morning slots if possible',
    },
    {
      tenantId,
      branchId,
      customerId: customers[1]?.id,
      customerName: customers[1]?.name || 'Rahul Verma',
      customerPhone: customers[1]?.phone || '9876500002',
      serviceIds: [services[2]?.id].filter(Boolean),
      preferredStylistId: null,
      preferredStartDate: today,
      preferredEndDate: twoWeeks,
      timePreferences: ['evening'],
      status: 'active',
      notes: 'Available only after 5 PM',
    },
    {
      tenantId,
      branchId,
      customerId: customers[2]?.id,
      customerName: customers[2]?.name || 'Anita Patel',
      customerPhone: customers[2]?.phone || '9876500003',
      serviceIds: [services[3]?.id, services[4]?.id].filter(Boolean),
      preferredStylistId: stylists[1]?.id,
      preferredStartDate: tomorrow,
      preferredEndDate: nextWeek,
      timePreferences: ['morning', 'afternoon', 'evening'],
      status: 'active',
      notes: 'Flexible with timing',
    },
    {
      tenantId,
      branchId,
      customerName: 'Guest Customer',
      customerPhone: '9876500099',
      serviceIds: [services[0]?.id].filter(Boolean),
      preferredStylistId: null,
      preferredStartDate: today,
      preferredEndDate: nextWeek,
      timePreferences: ['afternoon'],
      status: 'active',
      notes: 'New customer, first visit',
    },
    {
      tenantId,
      branchId,
      customerId: customers[4]?.id,
      customerName: customers[4]?.name || 'Meera Reddy',
      customerPhone: customers[4]?.phone || '9876500005',
      serviceIds: [services[5]?.id].filter(Boolean),
      preferredStylistId: stylists[0]?.id,
      preferredStartDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
      preferredEndDate: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000), // yesterday
      timePreferences: ['morning'],
      status: 'expired',
      notes: 'Expired entry - date range passed',
    },
  ];

  await prisma.waitlistEntry.createMany({
    data: waitlistData.filter((w) => w.serviceIds.length > 0),
  });

  return waitlistData.length;
}

// ============================================
// Station Types & Stations
// ============================================

async function seedStations(tenantId: string, branches: { id: string }[]) {
  // Default Station Types
  const stationTypesData = [
    {
      name: 'Styling Chair',
      color: '#8B5CF6',
      displayOrder: 0,
      isDefault: true,
    },
    {
      name: 'Wash Basin',
      color: '#3B82F6',
      displayOrder: 1,
      isDefault: true,
    },
    {
      name: 'Nail Station',
      color: '#EC4899',
      displayOrder: 2,
      isDefault: true,
    },
    {
      name: 'Facial Bed',
      color: '#22C55E',
      displayOrder: 3,
      isDefault: true,
    },
    {
      name: 'Massage Table',
      color: '#F59E0B',
      displayOrder: 4,
      isDefault: true,
    },
  ];

  const stationTypes = await prisma.stationType.createManyAndReturn({
    data: stationTypesData.map((st) => ({ tenantId, ...st })),
  });

  // Create stations for each branch
  const stationsData: Prisma.StationCreateManyInput[] = [];

  for (const branch of branches) {
    // Styling Chairs (4 per branch)
    for (let i = 1; i <= 4; i++) {
      stationsData.push({
        tenantId,
        branchId: branch.id,
        stationTypeId: stationTypes[0].id, // Styling Chair
        name: `Chair ${i}`,
        displayOrder: i - 1,
        status: 'active',
      });
    }

    // Wash Basins (2 per branch)
    for (let i = 1; i <= 2; i++) {
      stationsData.push({
        tenantId,
        branchId: branch.id,
        stationTypeId: stationTypes[1].id, // Wash Basin
        name: `Wash ${i}`,
        displayOrder: 4 + i - 1,
        status: 'active',
      });
    }

    // Nail Stations (2 per branch)
    for (let i = 1; i <= 2; i++) {
      stationsData.push({
        tenantId,
        branchId: branch.id,
        stationTypeId: stationTypes[2].id, // Nail Station
        name: `Nail ${i}`,
        displayOrder: 6 + i - 1,
        status: 'active',
      });
    }

    // Facial Beds (2 per branch)
    for (let i = 1; i <= 2; i++) {
      stationsData.push({
        tenantId,
        branchId: branch.id,
        stationTypeId: stationTypes[3].id, // Facial Bed
        name: `Facial ${i}`,
        displayOrder: 8 + i - 1,
        status: 'active',
      });
    }

    // Massage Tables (1 per branch)
    stationsData.push({
      tenantId,
      branchId: branch.id,
      stationTypeId: stationTypes[4].id, // Massage Table
      name: 'Massage 1',
      displayOrder: 10,
      status: 'active',
    });
  }

  const stations = await prisma.station.createManyAndReturn({ data: stationsData });

  return { stationTypes, stations };
}

// ============================================
// Subscription Plans
// ============================================

async function seedSubscriptionPlans() {
  const plansData = [
    {
      code: 'basic',
      name: 'Basic',
      tier: 'basic' as const,
      description: 'Perfect for small salons just getting started',
      monthlyPrice: new Prisma.Decimal(999),
      annualPrice: new Prisma.Decimal(9990),
      currency: 'INR',
      maxUsers: 5,
      maxAppointmentsPerDay: 50,
      maxServices: 25,
      maxProducts: 50,
      features: {
        appointments: true,
        customers: true,
        services: true,
        billing: true,
        basicReports: true,
        inventory: false,
        marketing: false,
        advancedReports: false,
        multipleStations: false,
        apiAccess: false,
      },
      trialDays: 14,
      gracePeriodDays: 7,
      displayOrder: 1,
      isActive: true,
      isPublic: true,
    },
    {
      code: 'professional',
      name: 'Professional',
      tier: 'professional' as const,
      description: 'For growing salons that need more features',
      monthlyPrice: new Prisma.Decimal(2499),
      annualPrice: new Prisma.Decimal(24990),
      currency: 'INR',
      maxUsers: 15,
      maxAppointmentsPerDay: 150,
      maxServices: 100,
      maxProducts: 200,
      features: {
        appointments: true,
        customers: true,
        services: true,
        billing: true,
        basicReports: true,
        inventory: true,
        marketing: true,
        advancedReports: true,
        multipleStations: true,
        apiAccess: false,
      },
      trialDays: 14,
      gracePeriodDays: 14,
      displayOrder: 2,
      isActive: true,
      isPublic: true,
    },
    {
      code: 'enterprise',
      name: 'Enterprise',
      tier: 'enterprise' as const,
      description: 'For large salons and chains with advanced needs',
      monthlyPrice: new Prisma.Decimal(4999),
      annualPrice: new Prisma.Decimal(49990),
      currency: 'INR',
      maxUsers: -1, // Unlimited
      maxAppointmentsPerDay: -1, // Unlimited
      maxServices: -1, // Unlimited
      maxProducts: -1, // Unlimited
      features: {
        appointments: true,
        customers: true,
        services: true,
        billing: true,
        basicReports: true,
        inventory: true,
        marketing: true,
        advancedReports: true,
        multipleStations: true,
        apiAccess: true,
        prioritySupport: true,
        customIntegrations: true,
        whiteLabeling: true,
      },
      trialDays: 30,
      gracePeriodDays: 30,
      displayOrder: 3,
      isActive: true,
      isPublic: true,
    },
  ];

  const plans = await prisma.subscriptionPlan.createManyAndReturn({
    data: plansData,
  });

  return plans;
}

// ============================================
// Branch Subscriptions
// ============================================

async function seedBranchSubscriptions(
  tenantId: string,
  branches: { id: string; name: string }[],
  plans: { id: string; code: string }[]
) {
  const professionalPlan = plans.find((p) => p.code === 'professional');
  if (!professionalPlan) {
    console.log('⚠️ Professional plan not found, skipping branch subscriptions');
    return;
  }

  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(nextMonth.getMonth() + 1);

  for (const branch of branches) {
    // Create subscription for each branch
    const subscription = await prisma.branchSubscription.create({
      data: {
        tenantId,
        branchId: branch.id,
        planId: professionalPlan.id,
        billingCycle: 'monthly',
        status: 'active',
        currentPeriodStart: today,
        currentPeriodEnd: nextMonth,
        pricePerPeriod: new Prisma.Decimal(2499),
        currency: 'INR',
        discountPercentage: new Prisma.Decimal(0),
        autoRenew: true,
      },
    });

    // Update branch with subscription status
    await prisma.branch.update({
      where: { id: branch.id },
      data: {
        subscriptionStatus: 'active',
        subscriptionPlanId: professionalPlan.id,
        branchSubscriptionId: subscription.id,
        isAccessible: true,
      },
    });
  }
}

// ============================================
// Run Main
// ============================================

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
