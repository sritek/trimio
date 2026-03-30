/**
 * Customers Service
 * Business logic for customer management
 */

import { prisma } from '../../lib/prisma';

import type { Prisma, Customer } from '@prisma/client';
import type {
  CreateCustomerBody,
  UpdateCustomerBody,
  CustomerQuery,
  CustomerSearchQuery,
  CreateNoteBody,
  NotesQuery,
} from './customers.schema';

/**
 * Normalize phone number to 10-digit format
 */
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) {
    return digits;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  throw new Error('Invalid phone number format');
}

/**
 * Mask phone number for privacy (stylists)
 */
export function maskPhone(phone: string): string {
  if (phone.length !== 10) return phone;
  return phone.slice(0, 2) + 'XXX-XX' + phone.slice(-3);
}

export class CustomersService {
  /**
   * Get all customers with filtering and pagination
   */
  async getCustomers(
    tenantId: string,
    query: CustomerQuery
  ): Promise<{ data: Customer[]; total: number; page: number; limit: number }> {
    const where: Prisma.CustomerWhereInput = {
      tenantId,
      deletedAt: null,
    };

    // Apply filters
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    if (query.tags) {
      const tagList = query.tags.split(',').map((t) => t.trim());
      where.tags = { hasSome: tagList };
    }

    if (query.gender) {
      where.gender = query.gender;
    }

    if (query.bookingStatus) {
      where.bookingStatus = query.bookingStatus;
    }

    if (query.branchId) {
      where.firstVisitBranchId = query.branchId;
    }

    if (query.isActive !== undefined) {
      if (query.isActive) {
        where.deletedAt = null;
      } else {
        where.deletedAt = { not: null };
      }
    }

    // Get total count
    const total = await prisma.customer.count({ where });

    // Get paginated data
    const data = await prisma.customer.findMany({
      where,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      data,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * Search customers quickly (for autocomplete)
   */
  async searchCustomers(tenantId: string, query: CustomerSearchQuery): Promise<Customer[]> {
    return prisma.customer.findMany({
      where: {
        tenantId,
        deletedAt: null,
        OR: [
          { name: { contains: query.q, mode: 'insensitive' } },
          { phone: { contains: query.q } },
          { email: { contains: query.q, mode: 'insensitive' } },
        ],
      },
      orderBy: { name: 'asc' },
      take: query.limit,
    });
  }

  /**
   * Lookup customer by exact phone number
   * Returns customer if found, null otherwise
   */
  async lookupByPhone(
    tenantId: string,
    phone: string
  ): Promise<{ id: string; name: string; phone: string } | null> {
    const customer = await prisma.customer.findFirst({
      where: {
        tenantId,
        phone,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        phone: true,
      },
    });
    return customer;
  }

  /**
   * Get a single customer by ID
   */
  async getCustomerById(
    tenantId: string,
    customerId: string,
    options?: { includeNotes?: boolean; includeStats?: boolean }
  ): Promise<Customer | null> {
    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        tenantId,
        deletedAt: null,
      },
      include: {
        customerNotes: options?.includeNotes
          ? {
              orderBy: { createdAt: 'desc' },
              take: 10,
            }
          : false,
      },
    });

    return customer;
  }

  /**
   * Get customer by phone number
   */
  async getCustomerByPhone(tenantId: string, phone: string): Promise<Customer | null> {
    const normalizedPhone = normalizePhone(phone);
    return prisma.customer.findFirst({
      where: {
        tenantId,
        phone: normalizedPhone,
        deletedAt: null,
      },
    });
  }

  /**
   * Create a new customer
   */
  async createCustomer(
    tenantId: string,
    data: CreateCustomerBody,
    branchId?: string,
    createdBy?: string
  ): Promise<Customer> {
    const normalizedPhone = normalizePhone(data.phone);

    // Check for existing customer with same phone
    const existing = await prisma.customer.findFirst({
      where: {
        tenantId,
        phone: normalizedPhone,
      },
    });

    if (existing) {
      // If soft-deleted, reactivate
      if (existing.deletedAt) {
        const [customer] = await prisma.$transaction([
          prisma.customer.update({
            where: { id: existing.id },
            data: {
              deletedAt: null,
              name: data.name,
              email: data.email,
              gender: data.gender,
              dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
              anniversaryDate: data.anniversaryDate ? new Date(data.anniversaryDate) : null,
              address: data.address,
              marketingConsent: data.marketingConsent,
              preferences: data.preferences as Prisma.InputJsonValue,
              allergies: data.allergies,
            },
          }),
          prisma.auditLog.create({
            data: {
              tenantId,
              userId: createdBy,
              action: 'customer.reactivated',
              entityType: 'customer',
              entityId: existing.id,
              oldValues: { deletedAt: existing.deletedAt },
              newValues: { deletedAt: null, reason: 'Reactivated via create with same phone' },
            },
          }),
        ]);
        return customer;
      }
      throw new Error('Customer with this phone number already exists');
    }

    // Validate referrer if provided
    if (data.referredBy) {
      const referrer = await prisma.customer.findFirst({
        where: { id: data.referredBy, tenantId, deletedAt: null },
      });
      if (!referrer) {
        throw new Error('Referrer customer not found');
      }
    }

    // Create customer with "New" tag and audit log
    const [customer] = await prisma.$transaction([
      prisma.customer.create({
        data: {
          tenantId,
          phone: normalizedPhone,
          name: data.name,
          email: data.email,
          gender: data.gender,
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
          anniversaryDate: data.anniversaryDate ? new Date(data.anniversaryDate) : null,
          address: data.address,
          marketingConsent: data.marketingConsent,
          preferences: data.preferences as Prisma.InputJsonValue,
          allergies: data.allergies,
          tags: ['New'],
          firstVisitBranchId: branchId,
        },
      }),
      // Audit log will be created after we have the customer ID
    ]);

    // Create audit log for customer creation
    await prisma.auditLog.create({
      data: {
        tenantId,
        userId: createdBy,
        action: 'customer.created',
        entityType: 'customer',
        entityId: customer.id,
        newValues: {
          name: customer.name,
          phone: customer.phone,
          email: customer.email,
          gender: customer.gender,
          referredBy: data.referredBy,
        },
      },
    });

    return customer;
  }

  /**
   * Update a customer
   */
  async updateCustomer(
    tenantId: string,
    customerId: string,
    data: UpdateCustomerBody,
    updatedBy?: string
  ): Promise<Customer> {
    const existing = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new Error('Customer not found');
    }

    // Track changed fields for audit log
    const oldValues: Record<string, unknown> = {};
    const newValues: Record<string, unknown> = {};

    if (data.name !== undefined && data.name !== existing.name) {
      oldValues.name = existing.name;
      newValues.name = data.name;
    }
    if (data.email !== undefined && data.email !== existing.email) {
      oldValues.email = existing.email;
      newValues.email = data.email;
    }
    if (data.gender !== undefined && data.gender !== existing.gender) {
      oldValues.gender = existing.gender;
      newValues.gender = data.gender;
    }
    if (data.address !== undefined && data.address !== existing.address) {
      oldValues.address = existing.address;
      newValues.address = data.address;
    }
    if (
      data.marketingConsent !== undefined &&
      data.marketingConsent !== existing.marketingConsent
    ) {
      oldValues.marketingConsent = existing.marketingConsent;
      newValues.marketingConsent = data.marketingConsent;
    }

    const customer = await prisma.customer.update({
      where: { id: customerId },
      data: {
        name: data.name,
        email: data.email,
        gender: data.gender,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : undefined,
        anniversaryDate: data.anniversaryDate ? new Date(data.anniversaryDate) : undefined,
        address: data.address,
        marketingConsent: data.marketingConsent,
        preferences: data.preferences as Prisma.InputJsonValue | undefined,
        allergies: data.allergies,
      },
    });

    // Only create audit log if there were changes
    if (Object.keys(newValues).length > 0) {
      await prisma.auditLog.create({
        data: {
          tenantId,
          userId: updatedBy,
          action: 'customer.updated',
          entityType: 'customer',
          entityId: customerId,
          oldValues: oldValues as Prisma.InputJsonValue,
          newValues: newValues as Prisma.InputJsonValue,
        },
      });
    }

    return customer;
  }

  /**
   * Update customer phone number (requires manager approval)
   */
  async updateCustomerPhone(
    tenantId: string,
    customerId: string,
    newPhone: string,
    reason: string,
    updatedBy: string
  ): Promise<Customer> {
    const normalizedPhone = normalizePhone(newPhone);

    const existing = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new Error('Customer not found');
    }

    // Check if new phone is already in use
    const duplicate = await prisma.customer.findFirst({
      where: {
        tenantId,
        phone: normalizedPhone,
        id: { not: customerId },
        deletedAt: null,
      },
    });

    if (duplicate) {
      throw new Error('Phone number already in use by another customer');
    }

    // Update phone and log the change
    const [customer] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { phone: normalizedPhone },
      }),
      prisma.auditLog.create({
        data: {
          tenantId,
          userId: updatedBy,
          action: 'customer.phone_changed',
          entityType: 'customer',
          entityId: customerId,
          oldValues: { phone: existing.phone },
          newValues: { phone: normalizedPhone, reason },
        },
      }),
    ]);

    return customer;
  }

  /**
   * Soft delete a customer
   */
  async deleteCustomer(tenantId: string, customerId: string, deletedBy?: string): Promise<void> {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
      include: {
        appointments: {
          where: {
            status: { in: ['scheduled', 'confirmed', 'checked_in', 'in_progress'] },
          },
          take: 1,
        },
      },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Check for active appointments
    if (customer.appointments.length > 0) {
      throw new Error('Cannot deactivate customer with active appointments');
    }

    // Check for wallet balance
    if (Number(customer.walletBalance) > 0) {
      throw new Error('Cannot deactivate customer with wallet balance');
    }

    const deletedAt = new Date();

    await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { deletedAt },
      }),
      prisma.auditLog.create({
        data: {
          tenantId,
          userId: deletedBy,
          action: 'customer.deactivated',
          entityType: 'customer',
          entityId: customerId,
          oldValues: { deletedAt: null },
          newValues: { deletedAt },
        },
      }),
    ]);
  }

  /**
   * Reactivate a soft-deleted customer
   */
  async reactivateCustomer(
    tenantId: string,
    customerId: string,
    reactivatedBy?: string
  ): Promise<Customer> {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: { not: null } },
    });

    if (!customer) {
      throw new Error('Customer not found or already active');
    }

    const [reactivatedCustomer] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: { deletedAt: null },
      }),
      prisma.auditLog.create({
        data: {
          tenantId,
          userId: reactivatedBy,
          action: 'customer.reactivated',
          entityType: 'customer',
          entityId: customerId,
          oldValues: { deletedAt: customer.deletedAt },
          newValues: { deletedAt: null },
        },
      }),
    ]);

    return reactivatedCustomer;
  }

  /**
   * Unblock customer from booking restrictions
   * Resets no-show count and removes prepaid-only/blocked status
   */
  async unblockCustomer(
    tenantId: string,
    customerId: string,
    reason: string,
    unblockBy: string
  ): Promise<Customer> {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Only unblock if customer has restrictions
    if (customer.bookingStatus === 'normal' && customer.noShowCount === 0) {
      throw new Error('Customer has no booking restrictions');
    }

    const oldValues = {
      noShowCount: customer.noShowCount,
      bookingStatus: customer.bookingStatus,
    };

    const [unblocked] = await prisma.$transaction([
      prisma.customer.update({
        where: { id: customerId },
        data: {
          noShowCount: 0,
          bookingStatus: 'normal',
        },
      }),
      prisma.auditLog.create({
        data: {
          tenantId,
          userId: unblockBy,
          action: 'customer.unblocked',
          entityType: 'customer',
          entityId: customerId,
          oldValues,
          newValues: {
            noShowCount: 0,
            bookingStatus: 'normal',
            reason,
          },
        },
      }),
    ]);

    return unblocked;
  }

  /**
   * Get customer notes
   */
  async getCustomerNotes(tenantId: string, customerId: string, query: NotesQuery) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    const where = { customerId };
    const total = await prisma.customerNote.count({ where });

    const notes = await prisma.customerNote.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (query.page - 1) * query.limit,
      take: query.limit,
    });

    return {
      data: notes,
      total,
      page: query.page,
      limit: query.limit,
    };
  }

  /**
   * Add a note to customer
   */
  async addCustomerNote(
    tenantId: string,
    customerId: string,
    data: CreateNoteBody,
    createdBy: string
  ) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    return prisma.customerNote.create({
      data: {
        tenantId,
        customerId,
        content: data.content,
        createdBy,
      },
    });
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(tenantId: string, customerId: string) {
    const customer = await prisma.customer.findFirst({
      where: { id: customerId, tenantId, deletedAt: null },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    // Get appointment stats
    const appointments = await prisma.appointment.findMany({
      where: {
        customerId,
        status: 'completed',
        deletedAt: null,
      },
      select: {
        id: true,
        totalAmount: true,
        scheduledDate: true,
        branchId: true,
      },
      orderBy: { scheduledDate: 'asc' },
    });

    const visitCount = appointments.length;
    const totalSpend = appointments.reduce((sum, apt) => sum + Number(apt.totalAmount), 0);
    const avgTicketSize = visitCount > 0 ? totalSpend / visitCount : 0;

    // Get first and last visit dates
    const firstVisitDate = appointments[0]?.scheduledDate || null;
    const lastVisitDate = appointments[appointments.length - 1]?.scheduledDate || null;

    // Get most visited branch
    const branchVisits = appointments.reduce(
      (acc, apt) => {
        acc[apt.branchId] = (acc[apt.branchId] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const mostVisitedBranchId =
      Object.entries(branchVisits).sort(([, a], [, b]) => b - a)[0]?.[0] || null;

    return {
      totalSpend,
      visitCount,
      avgTicketSize: Math.round(avgTicketSize * 100) / 100,
      firstVisitDate,
      lastVisitDate,
      firstVisitBranchId: customer.firstVisitBranchId,
      mostVisitedBranchId,
      loyaltyPoints: customer.loyaltyPoints,
      walletBalance: Number(customer.walletBalance),
      noShowCount: customer.noShowCount,
    };
  }
}

export const customersService = new CustomersService();
