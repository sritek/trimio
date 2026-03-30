import { PrismaClient, Prisma, AppointmentStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import { AppError } from '../../lib/errors';
import type {
  CreateAppointmentInput,
  UpdateAppointmentInput,
  ListAppointmentsInput,
  CancelAppointmentInput,
  RescheduleAppointmentInput,
  ConflictAction,
} from './appointments.schema';

const MAX_RESCHEDULES = 3;

/**
 * Parse a date string (yyyy-MM-dd) to UTC midnight Date
 * This ensures consistent date handling regardless of server timezone
 */
function parseToUTCDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Parse a date string (yyyy-MM-dd) to UTC end of day (23:59:59.999)
 */
function parseToUTCEndOfDay(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

// Valid status transitions
const STATUS_TRANSITIONS: Record<string, string[]> = {
  booked: ['confirmed', 'checked_in', 'cancelled', 'no_show', 'rescheduled'],
  confirmed: ['checked_in', 'cancelled', 'no_show', 'rescheduled'],
  checked_in: ['in_progress', 'cancelled', 'no_show'],
  in_progress: ['completed', 'cancelled'],
  completed: [],
  cancelled: [],
  no_show: [],
  rescheduled: [],
};

export class AppointmentsService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get appointments with pagination and filtering
   */
  async getAppointments(tenantId: string, filters: ListAppointmentsInput) {
    const {
      branchId,
      stylistId,
      customerId,
      status,
      bookingType,
      dateFrom,
      dateTo,
      search,
      page = 1,
      limit = 20,
      sortOrder = 'desc',
    } = filters;

    const where: Prisma.AppointmentWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (branchId) where.branchId = branchId;
    if (stylistId) {
      where.stylistId = Array.isArray(stylistId) ? { in: stylistId } : stylistId;
    }
    if (customerId) where.customerId = customerId;

    if (status) {
      where.status = Array.isArray(status) ? { in: status } : status;
    }

    if (bookingType) {
      where.bookingType = Array.isArray(bookingType) ? { in: bookingType } : bookingType;
    }

    if (dateFrom || dateTo) {
      where.scheduledDate = {};
      // Use UTC dates for comparison since PostgreSQL Date type stores as UTC midnight
      // This ensures consistent filtering regardless of server timezone
      if (dateFrom) where.scheduledDate.gte = parseToUTCDate(dateFrom);
      if (dateTo) where.scheduledDate.lte = parseToUTCEndOfDay(dateTo);
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
        { customer: { name: { contains: search, mode: 'insensitive' } } },
        { customer: { phone: { contains: search } } },
      ];
    }

    const [appointments, total] = await Promise.all([
      this.prisma.appointment.findMany({
        where,
        include: {
          stylist: {
            select: {
              name: true,
            },
          },
          customer: {
            select: { id: true, name: true, phone: true, email: true },
          },
          branch: {
            select: { id: true, name: true },
          },
          services: {
            include: {
              service: {
                select: { id: true, name: true, sku: true },
              },
            },
          },
        },
        // Sort by date first, then by time for proper chronological order
        orderBy: [{ scheduledDate: sortOrder }, { scheduledTime: sortOrder }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.appointment.count({ where }),
    ]);

    return {
      data: appointments,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single appointment by ID
   */
  async getAppointmentById(tenantId: string, appointmentId: string) {
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId,
        deletedAt: null,
      },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            gender: true,
            loyaltyPoints: true,
            walletBalance: true,
          },
        },
        branch: {
          select: { id: true, name: true },
        },
        stylist: {
          select: { id: true, name: true },
        },
        station: {
          include: { stationType: true },
        },
        services: {
          include: {
            service: {
              select: { id: true, name: true, sku: true },
            },
          },
        },
        statusHistory: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!appointment) {
      throw new AppError('APT_040', 'Appointment not found', 404);
    }

    return appointment;
  }

  /**
   * Check for conflicting appointments at the same time slot
   */
  async checkConflicts(
    tenantId: string,
    branchId: string,
    scheduledDate: string,
    scheduledTime: string,
    duration: number,
    stylistId?: string,
    excludeAppointmentId?: string
  ) {
    const scheduledEndTime = this.calculateEndTime(scheduledTime, duration);
    const dateObj = parseToUTCDate(scheduledDate);

    const where: Prisma.AppointmentWhereInput = {
      tenantId,
      branchId,
      scheduledDate: dateObj,
      status: { notIn: ['cancelled', 'no_show', 'rescheduled'] },
      deletedAt: null,
    };

    if (excludeAppointmentId) {
      where.id = { not: excludeAppointmentId };
    }

    if (stylistId) {
      where.stylistId = stylistId;
    }

    const existingAppointments = await this.prisma.appointment.findMany({
      where,
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
        services: {
          select: { serviceName: true },
        },
      },
    });

    // Find overlapping appointments
    const conflicts = existingAppointments.filter((apt) => {
      return this.timesOverlap(
        scheduledTime,
        scheduledEndTime,
        apt.scheduledTime,
        apt.scheduledEndTime
      );
    });

    return conflicts.map((apt) => ({
      id: apt.id,
      customerName: apt.customer?.name || apt.customerName || 'Guest',
      customerPhone: apt.customer?.phone || apt.customerPhone,
      scheduledTime: apt.scheduledTime,
      scheduledEndTime: apt.scheduledEndTime,
      status: apt.status,
      services: apt.services.map((s) => s.serviceName),
    }));
  }

  /**
   * Helper: Check if two time ranges overlap
   */
  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    return start1 < end2 && end1 > start2;
  }

  /**
   * Create a new appointment
   */
  async createAppointment(
    tenantId: string,
    _branchId: string,
    input: CreateAppointmentInput,
    userId: string,
    forceOverride?: boolean,
    overrideReason?: string,
    conflictActions?: ConflictAction[]
  ) {
    // 1. Validate services exist and are active
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: input.services.map((s) => s.serviceId) },
        tenantId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        branchPrices: {
          where: { branchId: input.branchId },
        },
      },
    });

    if (services.length !== input.services.length) {
      throw new AppError('APT_010', 'One or more services are not available', 400);
    }

    // 2. Calculate total duration
    const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);

    // 3. Calculate end time
    const scheduledEndTime = this.calculateEndTime(input.scheduledTime, totalDuration);

    // 3.5. Check for conflicts - we allow conflicts but mark them
    // Conflicts are shown in UI but don't block appointment creation
    let conflicts: any[] = [];
    conflicts = await this.checkConflicts(
      tenantId,
      input.branchId,
      input.scheduledDate,
      input.scheduledTime,
      totalDuration,
      input.stylistId
    );

    // Note: We no longer throw on conflicts - salons need flexibility
    // Conflicts are tracked and shown in the calendar UI

    // 4. Check if customer is blocked (for online bookings)
    if (input.customerId && input.bookingType === 'online') {
      const customer = await this.prisma.customer.findUnique({
        where: { id: input.customerId },
        select: { bookingStatus: true, noShowCount: true },
      });

      if (customer?.bookingStatus === 'blocked') {
        throw new AppError('APT_011', 'Customer is blocked from online booking', 403);
      }
    }

    // 5. Check prepayment requirement
    let prepaymentRequired = false;
    let prepaymentAmount = 0;

    if (input.customerId && input.bookingType === 'online') {
      const customer = await this.prisma.customer.findUnique({
        where: { id: input.customerId },
        select: { bookingStatus: true },
      });

      if (customer?.bookingStatus === 'prepaid_only') {
        prepaymentRequired = true;
      }
    }

    // 6. Calculate pricing (lock at booking time)
    let subtotal = 0;
    let taxAmount = 0;

    const appointmentServices = services.map((service) => {
      const branchPrice = service.branchPrices[0];
      const unitPrice = branchPrice?.price ? Number(branchPrice.price) : Number(service.basePrice);
      const taxRate = Number(service.taxRate);

      // Handle tax-inclusive vs tax-exclusive pricing
      let serviceTax: number;
      let totalAmount: number;

      if (service.isTaxInclusive) {
        // Tax is already included in the price - no additional tax
        // unitPrice IS the final price customer pays
        serviceTax = 0;
        totalAmount = unitPrice;
        subtotal += unitPrice;
      } else {
        // Tax is additional - calculate and add
        serviceTax = (unitPrice * taxRate) / 100;
        totalAmount = unitPrice + serviceTax;
        subtotal += unitPrice;
      }

      taxAmount += serviceTax;

      return {
        tenantId,
        serviceId: service.id,
        serviceName: service.name,
        serviceSku: service.sku,
        unitPrice: new Decimal(unitPrice),
        quantity: 1,
        discountAmount: new Decimal(0),
        taxRate: new Decimal(taxRate),
        taxAmount: new Decimal(serviceTax),
        totalAmount: new Decimal(totalAmount),
        durationMinutes: service.durationMinutes,
        activeTimeMinutes: service.activeTimeMinutes,
        processingTimeMinutes: service.processingTimeMinutes,
        stylistId: input.stylistId,
        status: 'pending',
        commissionRate: new Decimal(service.commissionValue),
        commissionAmount: new Decimal((unitPrice * Number(service.commissionValue)) / 100),
      };
    });

    const totalAmount = subtotal + taxAmount;
    if (prepaymentRequired) {
      prepaymentAmount = totalAmount;
    }

    // 7. Generate token for walk-ins
    let tokenNumber: number | undefined;
    if (input.bookingType === 'walk_in') {
      const today = parseToUTCDate(input.scheduledDate);
      const lastToken = await this.prisma.appointment.findFirst({
        where: {
          branchId: input.branchId,
          scheduledDate: today,
          bookingType: 'walk_in',
          tokenNumber: { not: null },
        },
        orderBy: { tokenNumber: 'desc' },
        select: { tokenNumber: true },
      });
      tokenNumber = (lastToken?.tokenNumber ?? 0) + 1;
    }

    // 7.5. Auto-create or find customer if phone is provided but no customerId
    let resolvedCustomerId = input.customerId;
    let resolvedCustomerName = input.customerName;
    let customerWasCreated = false;

    // Check if we should auto-create/find customer:
    // - No customerId provided (or empty string)
    // - Phone number is provided (and not empty string)
    const hasCustomerId = input.customerId && input.customerId.trim() !== '';
    const hasCustomerPhone = input.customerPhone && input.customerPhone.trim() !== '';

    if (!hasCustomerId && hasCustomerPhone) {
      // Check if customer with this phone already exists
      const existingCustomer = await this.prisma.customer.findFirst({
        where: {
          tenantId,
          phone: input.customerPhone,
          deletedAt: null,
        },
        select: { id: true, name: true, bookingStatus: true },
      });

      if (existingCustomer) {
        // Use existing customer and their stored name (for data consistency)
        resolvedCustomerId = existingCustomer.id;
        resolvedCustomerName = existingCustomer.name;

        // Check if existing customer is blocked (for online bookings)
        if (input.bookingType === 'online' && existingCustomer.bookingStatus === 'blocked') {
          throw new AppError('APT_011', 'Customer is blocked from online booking', 403);
        }

        // Check prepayment requirement for existing customer
        if (input.bookingType === 'online' && existingCustomer.bookingStatus === 'prepaid_only') {
          prepaymentRequired = true;
          prepaymentAmount = subtotal + taxAmount;
        }
      } else {
        // Create new customer - will be done in transaction below
        customerWasCreated = true;
      }
    }

    // 8. Create appointment in transaction
    const appointment = await this.prisma.$transaction(async (tx) => {
      // 8.0 Create customer if needed (phone provided, no existing customer)
      if (customerWasCreated && input.customerPhone) {
        const newCustomer = await tx.customer.create({
          data: {
            tenantId,
            phone: input.customerPhone,
            name: input.customerName || 'Guest',
            tags: ['New'], // Auto-assign "New" tag for new customers
            firstVisitBranchId: input.branchId,
          },
        });
        resolvedCustomerId = newCustomer.id;

        // Audit log for auto-created customer
        await tx.auditLog.create({
          data: {
            tenantId,
            branchId: input.branchId,
            userId,
            action: 'CUSTOMER_AUTO_CREATED',
            entityType: 'customer',
            entityId: newCustomer.id,
            newValues: {
              name: newCustomer.name,
              phone: newCustomer.phone,
              tags: ['New'],
              source: 'appointment_booking',
            },
          },
        });
      }

      // 8.1 Process conflict actions if override is being used
      const processedConflicts: { id: string; action: string; customerName: string }[] = [];

      if (forceOverride && conflicts.length > 0) {
        for (const conflict of conflicts) {
          // Find the action for this conflict (default to 'keep' if not specified)
          const conflictAction = conflictActions?.find((ca) => ca.appointmentId === conflict.id);
          const action = conflictAction?.action || 'keep';

          if (action === 'cancel') {
            // Cancel the conflicting appointment
            await tx.appointment.update({
              where: { id: conflict.id },
              data: {
                status: 'cancelled',
                cancelledAt: new Date(),
                cancelledBy: userId,
                cancellationReason: `Cancelled due to scheduling conflict. Override reason: ${overrideReason || 'Not specified'}`,
                isSalonCancelled: true,
              },
            });

            await tx.appointmentStatusHistory.create({
              data: {
                tenantId,
                appointmentId: conflict.id,
                fromStatus: conflict.status,
                toStatus: 'cancelled',
                changedBy: userId,
                notes: `Cancelled due to conflict override`,
              },
            });
          } else {
            // Mark as having conflict (keep)
            await tx.appointment.update({
              where: { id: conflict.id },
              data: {
                hasConflict: true,
                conflictNotes: `Conflict with new appointment. Override reason: ${overrideReason || 'Not specified'}`,
                conflictMarkedAt: new Date(),
              },
            });
          }

          processedConflicts.push({
            id: conflict.id,
            action,
            customerName: conflict.customerName,
          });

          // Create audit log for conflict handling
          await tx.auditLog.create({
            data: {
              tenantId,
              branchId: input.branchId,
              userId,
              action:
                action === 'cancel'
                  ? 'CONFLICT_APPOINTMENT_CANCELLED'
                  : 'CONFLICT_APPOINTMENT_MARKED',
              entityType: 'appointment',
              entityId: conflict.id,
              newValues: {
                action,
                overrideReason,
                conflictingTime: `${input.scheduledDate} ${input.scheduledTime}`,
              },
            },
          });
        }
      }

      const apt = await tx.appointment.create({
        data: {
          tenantId,
          branchId: input.branchId,
          customerId: resolvedCustomerId,
          customerName: resolvedCustomerName, // Use resolved name (existing customer's name or input name)
          customerPhone: input.customerPhone,
          scheduledDate: parseToUTCDate(input.scheduledDate),
          scheduledTime: input.scheduledTime,
          scheduledEndTime,
          totalDuration,
          stylistId: input.stylistId,
          stylistGenderPreference: input.stylistGenderPreference,
          bookingType: input.bookingType,
          bookingSource: input.bookingSource,
          status: 'booked',
          tokenNumber,
          subtotal,
          taxAmount,
          totalAmount,
          priceLockedAt: new Date(),
          prepaymentRequired,
          prepaymentAmount,
          prepaymentStatus: prepaymentRequired ? 'pending' : null,
          customerNotes: input.customerNotes,
          internalNotes: input.internalNotes,
          createdBy: userId,
          services: {
            create: appointmentServices,
          },
        },
        include: {
          services: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
          branch: {
            select: { id: true, name: true },
          },
        },
      });

      // Create status history
      await tx.appointmentStatusHistory.create({
        data: {
          tenantId,
          appointmentId: apt.id,
          toStatus: 'booked',
          changedBy: userId,
        },
      });

      // Create audit log for appointment creation
      await tx.auditLog.create({
        data: {
          tenantId,
          branchId: input.branchId,
          userId,
          action: 'APPOINTMENT_CREATED',
          entityType: 'appointment',
          entityId: apt.id,
          newValues: {
            customerId: apt.customerId,
            customerName: apt.customerName,
            scheduledDate: apt.scheduledDate,
            scheduledTime: apt.scheduledTime,
            bookingType: apt.bookingType,
            totalAmount: apt.totalAmount,
            tokenNumber: apt.tokenNumber,
            hadConflicts: processedConflicts.length > 0,
            processedConflicts: processedConflicts.length > 0 ? processedConflicts : undefined,
            customerAutoCreated: customerWasCreated,
          },
        },
      });

      // Mark waitlist entry as converted if provided
      if (input.waitlistEntryId) {
        await tx.waitlistEntry.update({
          where: { id: input.waitlistEntryId },
          data: {
            status: 'converted',
            appointmentId: apt.id,
            convertedAt: new Date(),
          },
        });

        await tx.auditLog.create({
          data: {
            tenantId,
            branchId: input.branchId,
            userId,
            action: 'WAITLIST_CONVERTED',
            entityType: 'waitlist_entry',
            entityId: input.waitlistEntryId,
            newValues: {
              appointmentId: apt.id,
              scheduledDate: input.scheduledDate,
              scheduledTime: input.scheduledTime,
            },
          },
        });
      }

      return { apt, processedConflicts };
    });

    return {
      appointment: appointment.apt,
      tokenNumber,
      prepaymentRequired,
      processedConflicts: appointment.processedConflicts,
      prepaymentAmount: prepaymentRequired ? prepaymentAmount : undefined,
      customerCreated: customerWasCreated,
    };
  }

  /**
   * Update appointment
   */
  async updateAppointment(
    tenantId: string,
    appointmentId: string,
    input: UpdateAppointmentInput,
    _userId: string
  ) {
    const appointment = await this.getAppointmentById(tenantId, appointmentId);

    // Can only update certain fields and only in certain statuses
    if (['completed', 'cancelled', 'no_show', 'rescheduled'].includes(appointment.status)) {
      throw new AppError('APT_030', 'Cannot update appointment in current status', 400);
    }

    return this.prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        ...input,
        updatedAt: new Date(),
      },
      include: {
        services: true,
        customer: {
          select: { id: true, name: true, phone: true },
        },
      },
    });
  }

  /**
   * Check in customer
   */
  async checkIn(tenantId: string, appointmentId: string, userId: string) {
    const appointment = await this.getAppointmentById(tenantId, appointmentId);

    if (!STATUS_TRANSITIONS[appointment.status]?.includes('checked_in')) {
      throw new AppError('APT_030', 'Cannot check in appointment in current status', 400);
    }

    return this.updateStatus(tenantId, appointmentId, 'checked_in', userId);
  }

  /**
   * Start appointment
   */
  async start(tenantId: string, appointmentId: string, userId: string) {
    const appointment = await this.getAppointmentById(tenantId, appointmentId);

    if (!STATUS_TRANSITIONS[appointment.status]?.includes('in_progress')) {
      throw new AppError('APT_030', 'Cannot start appointment in current status', 400);
    }

    // Set actualStartTime timestamp when starting
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'in_progress',
          actualStartTime: new Date(),
        },
        include: {
          services: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
          station: {
            include: { stationType: true },
          },
        },
      });

      await tx.appointmentStatusHistory.create({
        data: {
          tenantId,
          appointmentId,
          fromStatus: appointment.status,
          toStatus: 'in_progress',
          changedBy: userId,
        },
      });

      return updated;
    });
  }

  /**
   * Complete appointment
   */
  async complete(tenantId: string, appointmentId: string, userId: string, actualEndTime?: Date) {
    const appointment = await this.getAppointmentById(tenantId, appointmentId);

    if (!STATUS_TRANSITIONS[appointment.status]?.includes('completed')) {
      throw new AppError('APT_030', 'Cannot complete appointment in current status', 400);
    }

    // Use provided end time or default to current time
    const endTime = actualEndTime || new Date();

    // Clear station assignment when completing
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'completed',
          stationId: null, // Clear station on completion
          actualEndTime: endTime,
          updatedAt: new Date(),
        },
        include: {
          services: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
        },
      });

      await tx.appointmentStatusHistory.create({
        data: {
          tenantId,
          appointmentId,
          fromStatus: appointment.status,
          toStatus: 'completed',
          changedBy: userId,
        },
      });

      return updated;
    });
  }

  /**
   * Cancel appointment
   */
  async cancel(
    tenantId: string,
    appointmentId: string,
    input: CancelAppointmentInput,
    userId: string
  ) {
    const appointment = await this.getAppointmentById(tenantId, appointmentId);

    if (!STATUS_TRANSITIONS[appointment.status]?.includes('cancelled')) {
      throw new AppError('APT_030', 'Cannot cancel appointment in current status', 400);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: userId,
          cancellationReason: input.reason,
          isSalonCancelled: input.isSalonCancelled,
        },
        include: {
          services: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
        },
      });

      await tx.appointmentStatusHistory.create({
        data: {
          tenantId,
          appointmentId,
          fromStatus: appointment.status,
          toStatus: 'cancelled',
          changedBy: userId,
          notes: input.reason,
        },
      });

      // Create audit log for cancellation
      await tx.auditLog.create({
        data: {
          tenantId,
          branchId: appointment.branchId,
          userId,
          action: 'APPOINTMENT_CANCELLED',
          entityType: 'appointment',
          entityId: appointmentId,
          oldValues: {
            status: appointment.status,
          },
          newValues: {
            status: 'cancelled',
            reason: input.reason,
            isSalonCancelled: input.isSalonCancelled,
          },
        },
      });

      return updated;
    });
  }

  /**
   * Mark as no-show
   */
  async markNoShow(tenantId: string, appointmentId: string, userId: string) {
    const appointment = await this.getAppointmentById(tenantId, appointmentId);

    if (!STATUS_TRANSITIONS[appointment.status]?.includes('no_show')) {
      throw new AppError('APT_030', 'Cannot mark as no-show in current status', 400);
    }

    return this.prisma.$transaction(async (tx) => {
      // Update appointment status
      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'no_show' },
        include: {
          services: true,
          customer: {
            select: { id: true, name: true, phone: true, noShowCount: true, bookingStatus: true },
          },
        },
      });

      // Create status history
      await tx.appointmentStatusHistory.create({
        data: {
          tenantId,
          appointmentId,
          fromStatus: appointment.status,
          toStatus: 'no_show',
          changedBy: userId,
        },
      });

      // Increment customer no-show count and apply policy
      if (appointment.customerId) {
        const customer = await tx.customer.findUnique({
          where: { id: appointment.customerId },
          select: { noShowCount: true },
        });

        const newNoShowCount = (customer?.noShowCount ?? 0) + 1;
        let newBookingStatus = 'normal';

        if (newNoShowCount >= 3) {
          newBookingStatus = 'blocked';
        } else if (newNoShowCount >= 2) {
          newBookingStatus = 'prepaid_only';
        }

        await tx.customer.update({
          where: { id: appointment.customerId },
          data: {
            noShowCount: newNoShowCount,
            bookingStatus: newBookingStatus,
          },
        });

        // Create audit log
        await tx.auditLog.create({
          data: {
            tenantId,
            branchId: appointment.branchId,
            userId,
            action: 'NO_SHOW_MARKED',
            entityType: 'appointment',
            entityId: appointmentId,
            newValues: {
              noShowCount: newNoShowCount,
              bookingStatus: newBookingStatus,
            },
          },
        });
      }

      return updated;
    });
  }

  /**
   * Reschedule appointment
   */
  async reschedule(
    tenantId: string,
    appointmentId: string,
    input: RescheduleAppointmentInput,
    userId: string
  ) {
    const appointment = await this.getAppointmentById(tenantId, appointmentId);

    if (!STATUS_TRANSITIONS[appointment.status]?.includes('rescheduled')) {
      throw new AppError('APT_021', 'Cannot reschedule appointment in current status', 400);
    }

    if (appointment.rescheduleCount >= MAX_RESCHEDULES) {
      throw new AppError('APT_020', `Maximum reschedule limit (${MAX_RESCHEDULES}) reached`, 400);
    }

    const newScheduledEndTime = this.calculateEndTime(input.newTime, appointment.totalDuration);

    return this.prisma.$transaction(async (tx) => {
      // Update original appointment
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: 'rescheduled' },
      });

      // Create status history for original
      await tx.appointmentStatusHistory.create({
        data: {
          tenantId,
          appointmentId,
          fromStatus: appointment.status,
          toStatus: 'rescheduled',
          changedBy: userId,
          notes: input.reason,
        },
      });

      // Create new appointment
      const newAppointment = await tx.appointment.create({
        data: {
          tenantId,
          branchId: appointment.branchId,
          customerId: appointment.customerId,
          customerName: appointment.customerName,
          customerPhone: appointment.customerPhone,
          scheduledDate: parseToUTCDate(input.newDate),
          scheduledTime: input.newTime,
          scheduledEndTime: newScheduledEndTime,
          totalDuration: appointment.totalDuration,
          stylistId: input.stylistId ?? appointment.stylistId,
          stylistGenderPreference: appointment.stylistGenderPreference,
          bookingType: appointment.bookingType,
          bookingSource: appointment.bookingSource,
          status: 'booked',
          subtotal: appointment.subtotal,
          taxAmount: appointment.taxAmount,
          totalAmount: appointment.totalAmount,
          priceLockedAt: appointment.priceLockedAt,
          prepaymentRequired: appointment.prepaymentRequired,
          prepaymentAmount: appointment.prepaymentAmount,
          prepaymentStatus: appointment.prepaymentStatus,
          customerNotes: appointment.customerNotes,
          internalNotes: appointment.internalNotes,
          rescheduleCount: appointment.rescheduleCount + 1,
          originalAppointmentId: appointment.originalAppointmentId ?? appointmentId,
          createdBy: userId,
        },
        include: {
          services: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
        },
      });

      // Copy services to new appointment
      const originalServices = await tx.appointmentService.findMany({
        where: { appointmentId },
      });

      await tx.appointmentService.createMany({
        data: originalServices.map((s) => ({
          tenantId: s.tenantId,
          appointmentId: newAppointment.id,
          serviceId: s.serviceId,
          serviceName: s.serviceName,
          serviceSku: s.serviceSku,
          unitPrice: s.unitPrice,
          quantity: s.quantity,
          discountAmount: s.discountAmount,
          taxRate: s.taxRate,
          taxAmount: s.taxAmount,
          totalAmount: s.totalAmount,
          durationMinutes: s.durationMinutes,
          activeTimeMinutes: s.activeTimeMinutes,
          processingTimeMinutes: s.processingTimeMinutes,
          stylistId: input.stylistId ?? s.stylistId,
          status: 'pending',
          commissionRate: s.commissionRate,
          commissionAmount: s.commissionAmount,
        })),
      });

      // Link original to new
      await tx.appointment.update({
        where: { id: appointmentId },
        data: { rescheduledToId: newAppointment.id },
      });

      // Create status history for new
      await tx.appointmentStatusHistory.create({
        data: {
          tenantId,
          appointmentId: newAppointment.id,
          toStatus: 'booked',
          changedBy: userId,
          notes: `Rescheduled from appointment ${appointmentId}`,
        },
      });

      // Create audit log for reschedule
      await tx.auditLog.create({
        data: {
          tenantId,
          branchId: appointment.branchId,
          userId,
          action: 'APPOINTMENT_RESCHEDULED',
          entityType: 'appointment',
          entityId: appointmentId,
          oldValues: {
            scheduledDate: appointment.scheduledDate,
            scheduledTime: appointment.scheduledTime,
            status: appointment.status,
          },
          newValues: {
            newAppointmentId: newAppointment.id,
            newScheduledDate: input.newDate,
            newScheduledTime: input.newTime,
            rescheduleCount: newAppointment.rescheduleCount,
            reason: input.reason,
          },
        },
      });

      return {
        originalAppointment: appointment,
        newAppointment,
        rescheduleCount: newAppointment.rescheduleCount,
      };
    });
  }

  /**
   * Resolve conflict flag on an appointment
   */
  async resolveConflict(tenantId: string, appointmentId: string, userId: string) {
    const appointment = await this.getAppointmentById(tenantId, appointmentId);

    if (!appointment.hasConflict) {
      throw new AppError('APT_050', 'Appointment does not have a conflict to resolve', 400);
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          hasConflict: false,
          conflictResolvedAt: new Date(),
        },
        include: {
          services: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
        },
      });

      await tx.auditLog.create({
        data: {
          tenantId,
          branchId: appointment.branchId,
          userId,
          action: 'CONFLICT_RESOLVED',
          entityType: 'appointment',
          entityId: appointmentId,
          oldValues: {
            hasConflict: true,
            conflictNotes: appointment.conflictNotes,
          },
          newValues: {
            hasConflict: false,
            conflictResolvedAt: new Date(),
          },
        },
      });

      return updated;
    });
  }

  /**
   * Helper: Update status with history
   */
  private async updateStatus(
    tenantId: string,
    appointmentId: string,
    newStatus: AppointmentStatus,
    userId: string
  ) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: appointmentId },
      select: { status: true },
    });

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: { status: newStatus },
        include: {
          services: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
        },
      });

      await tx.appointmentStatusHistory.create({
        data: {
          tenantId,
          appointmentId,
          fromStatus: appointment?.status,
          toStatus: newStatus,
          changedBy: userId,
        },
      });

      return updated;
    });
  }

  /**
   * Update appointment status (generic status change with validation)
   */
  async updateAppointmentStatus(
    tenantId: string,
    appointmentId: string,
    newStatus: string,
    userId: string
  ) {
    const appointment = await this.getAppointmentById(tenantId, appointmentId);

    // Validate status transition
    const allowedTransitions = STATUS_TRANSITIONS[appointment.status] || [];
    if (!allowedTransitions.includes(newStatus)) {
      throw new AppError(
        'APT_030',
        `Cannot transition from ${appointment.status} to ${newStatus}`,
        400
      );
    }

    return this.updateStatus(tenantId, appointmentId, newStatus as AppointmentStatus, userId);
  }

  /**
   * Helper: Calculate end time from start time and duration
   */
  private calculateEndTime(startTime: string, durationMinutes: number): string {
    const [hours, minutes] = startTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + durationMinutes;
    const endHours = Math.floor(totalMinutes / 60) % 24;
    const endMinutes = totalMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
  }

  // =====================================================
  // UNASSIGNED APPOINTMENTS
  // =====================================================

  /**
   * Get unassigned appointments for a branch
   * Defaults to today's date if not specified
   */
  async getUnassignedAppointments(tenantId: string, branchId: string, date?: string) {
    const targetDate = date
      ? parseToUTCDate(date)
      : parseToUTCDate(new Date().toISOString().split('T')[0]);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        branchId,
        stylistId: null,
        scheduledDate: targetDate,
        status: { notIn: ['cancelled', 'no_show', 'rescheduled', 'completed'] },
        deletedAt: null,
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
        services: {
          include: {
            service: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    return appointments;
  }

  /**
   * Get count of unassigned appointments for a branch (today)
   */
  async getUnassignedCount(tenantId: string, branchId: string): Promise<number> {
    const today = parseToUTCDate(new Date().toISOString().split('T')[0]);

    return this.prisma.appointment.count({
      where: {
        tenantId,
        branchId,
        stylistId: null,
        scheduledDate: today,
        status: { notIn: ['cancelled', 'no_show', 'rescheduled', 'completed'] },
        deletedAt: null,
      },
    });
  }

  /**
   * Assign a stylist to an unassigned appointment
   */
  async assignStylist(tenantId: string, appointmentId: string, stylistId: string, userId: string) {
    const appointment = await this.getAppointmentById(tenantId, appointmentId);

    // Check if appointment already has a stylist
    if (appointment.stylistId) {
      throw new AppError('APT_ALREADY_ASSIGNED', 'Appointment already has a stylist assigned', 400);
    }

    // Check if appointment is in a valid status for assignment
    if (['completed', 'cancelled', 'no_show', 'rescheduled'].includes(appointment.status)) {
      throw new AppError('APT_030', 'Cannot assign stylist to appointment in current status', 400);
    }

    // Check stylist availability
    const conflicts = await this.checkConflicts(
      tenantId,
      appointment.branchId,
      appointment.scheduledDate.toISOString().split('T')[0],
      appointment.scheduledTime,
      appointment.totalDuration,
      stylistId,
      appointmentId
    );

    if (conflicts.length > 0) {
      throw new AppError(
        'STYLIST_NOT_AVAILABLE',
        'Stylist is not available for this time slot',
        409,
        {
          conflicts,
        }
      );
    }

    // Update appointment with stylist
    const updated = await this.prisma.$transaction(async (tx) => {
      const apt = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          stylistId,
          updatedAt: new Date(),
        },
        include: {
          services: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
          stylist: {
            select: { id: true, name: true },
          },
        },
      });

      // Update services with stylist
      await tx.appointmentService.updateMany({
        where: { appointmentId },
        data: { stylistId },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          branchId: appointment.branchId,
          userId,
          action: 'STYLIST_ASSIGNED',
          entityType: 'appointment',
          entityId: appointmentId,
          oldValues: { stylistId: null },
          newValues: { stylistId },
        },
      });

      return apt;
    });

    return updated;
  }

  // =====================================================
  // STATION ASSIGNMENT (Floor View)
  // =====================================================

  /**
   * Assign a station to an appointment
   */
  async assignStation(tenantId: string, appointmentId: string, stationId: string, userId: string) {
    const appointment = await this.getAppointmentById(tenantId, appointmentId);

    // Check if appointment is in a valid status for station assignment
    if (['completed', 'cancelled', 'no_show', 'rescheduled'].includes(appointment.status)) {
      throw new AppError('APT_030', 'Cannot assign station to appointment in current status', 400);
    }

    // Verify station exists and belongs to the same branch
    const station = await this.prisma.station.findFirst({
      where: {
        id: stationId,
        tenantId,
        branchId: appointment.branchId,
        deletedAt: null,
      },
    });

    if (!station) {
      throw new AppError('STATION_NOT_FOUND', 'Station not found', 404);
    }

    // Check if station is out of service
    if (station.status === 'out_of_service') {
      throw new AppError('STATION_OUT_OF_SERVICE', 'Station is out of service', 400);
    }

    // Check if station is already occupied by another active appointment
    const existingAppointment = await this.prisma.appointment.findFirst({
      where: {
        stationId,
        id: { not: appointmentId },
        status: { in: ['checked_in', 'in_progress'] },
        deletedAt: null,
      },
    });

    if (existingAppointment) {
      throw new AppError('STATION_ALREADY_OCCUPIED', 'Station is already occupied', 409, {
        existingAppointmentId: existingAppointment.id,
      });
    }

    // Update appointment with station and change status to in_progress
    const updated = await this.prisma.$transaction(async (tx) => {
      const apt = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          stationId,
          status: 'in_progress',
          actualStartTime: new Date(),
          updatedAt: new Date(),
        },
        include: {
          services: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
          stylist: {
            select: { id: true, name: true },
          },
          station: {
            include: { stationType: true },
          },
        },
      });

      // Create status history record
      await tx.appointmentStatusHistory.create({
        data: {
          tenantId,
          appointmentId,
          fromStatus: appointment.status,
          toStatus: 'in_progress',
          changedBy: userId,
          notes: `Station assigned: ${station.name}`,
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          branchId: appointment.branchId,
          userId,
          action: 'STATION_ASSIGNED',
          entityType: 'appointment',
          entityId: appointmentId,
          oldValues: { stationId: appointment.stationId, status: appointment.status },
          newValues: { stationId, status: 'in_progress' },
        },
      });

      return apt;
    });

    return updated;
  }

  /**
   * Deassign station from appointment and revert status to checked_in
   */
  async deassignStation(tenantId: string, appointmentId: string, userId: string) {
    const appointment = await this.getAppointmentById(tenantId, appointmentId);

    if (!appointment.stationId) {
      throw new AppError('APT_031', 'Appointment is not assigned to a station', 400);
    }

    if (appointment.status !== 'in_progress') {
      throw new AppError('APT_032', 'Can only deassign appointments that are in progress', 400);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const apt = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          stationId: null,
          status: 'checked_in',
          actualStartTime: null,
          actualEndTime: null,
          updatedAt: new Date(),
        },
        include: {
          services: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
          stylist: {
            select: { id: true, name: true },
          },
          station: {
            include: { stationType: true },
          },
        },
      });

      // Create status history record
      await tx.appointmentStatusHistory.create({
        data: {
          tenantId,
          appointmentId,
          fromStatus: 'in_progress',
          toStatus: 'checked_in',
          changedBy: userId,
          notes: 'Deassigned from station',
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          branchId: appointment.branchId,
          userId,
          action: 'STATION_DEASSIGNED',
          entityType: 'appointment',
          entityId: appointmentId,
          oldValues: {
            stationId: appointment.stationId,
            status: appointment.status,
            actualStartTime: appointment.actualStartTime,
            actualEndTime: appointment.actualEndTime,
          },
          newValues: {
            stationId: null,
            status: 'checked_in',
            actualStartTime: null,
            actualEndTime: null,
          },
        },
      });

      return apt;
    });

    return updated;
  }

  // =====================================================
  // UPDATE APPOINTMENT SERVICES (Before service starts)
  // =====================================================

  /**
   * Update services on an appointment (replace all services)
   * Only allowed for booked, confirmed, or checked_in appointments
   */
  async updateServices(
    tenantId: string,
    appointmentId: string,
    input: { services: Array<{ serviceId: string; stylistId?: string; quantity?: number }> },
    userId: string
  ) {
    const appointment = await this.getAppointmentById(tenantId, appointmentId);

    // Only allow updating services before appointment starts
    const allowedStatuses: AppointmentStatus[] = [
      'booked',
      'confirmed',
      'checked_in',
      'in_progress',
    ];
    if (!allowedStatuses.includes(appointment.status)) {
      throw new AppError('APT_030', 'Can only update services before appointment completes', 400);
    }

    // Validate all services exist and are active
    const serviceIds = input.services.map((s) => s.serviceId);
    const services = await this.prisma.service.findMany({
      where: {
        id: { in: serviceIds },
        tenantId,
        deletedAt: null,
        isActive: true,
      },
      include: {
        branchPrices: {
          where: { branchId: appointment.branchId },
        },
      },
    });

    if (services.length !== serviceIds.length) {
      throw new AppError('APT_010', 'One or more services are not available', 400);
    }

    // Build service map for easy lookup
    const serviceMap = new Map(services.map((s) => [s.id, s]));

    // Calculate new totals
    let subtotal = 0;
    let taxAmount = 0;
    let totalDuration = 0;

    const appointmentServices = input.services.map((inputService) => {
      const service = serviceMap.get(inputService.serviceId)!;
      const branchPrice = service.branchPrices[0];
      const unitPrice = branchPrice?.price ? Number(branchPrice.price) : Number(service.basePrice);
      const quantity = inputService.quantity || 1;
      const taxRate = Number(service.taxRate);

      // Handle tax-inclusive vs tax-exclusive pricing
      let serviceTax: number;
      let totalAmount: number;

      if (service.isTaxInclusive) {
        // Tax is already included in the price - no additional tax
        serviceTax = 0;
        totalAmount = unitPrice * quantity;
      } else {
        // Tax is additional
        serviceTax = (unitPrice * quantity * taxRate) / 100;
        totalAmount = unitPrice * quantity + serviceTax;
      }

      subtotal += unitPrice * quantity;
      taxAmount += serviceTax;
      totalDuration += service.durationMinutes * quantity;

      return {
        tenantId,
        serviceId: service.id,
        serviceName: service.name,
        serviceSku: service.sku,
        unitPrice: new Decimal(unitPrice),
        quantity,
        discountAmount: new Decimal(0),
        taxRate: new Decimal(taxRate),
        taxAmount: new Decimal(serviceTax),
        totalAmount: new Decimal(totalAmount),
        durationMinutes: service.durationMinutes,
        activeTimeMinutes: service.activeTimeMinutes,
        processingTimeMinutes: service.processingTimeMinutes,
        stylistId: inputService.stylistId || appointment.stylistId,
        status: 'pending' as const,
        commissionRate: new Decimal(service.commissionValue),
        commissionAmount: new Decimal(
          (unitPrice * quantity * Number(service.commissionValue)) / 100
        ),
      };
    });

    const totalAmount = subtotal + taxAmount;
    const endTime = this.calculateEndTime(appointment.scheduledTime, totalDuration);

    // Update in transaction
    const updated = await this.prisma.$transaction(async (tx) => {
      // Delete existing services
      await tx.appointmentService.deleteMany({
        where: { appointmentId },
      });

      // Create new services
      await tx.appointmentService.createMany({
        data: appointmentServices.map((s) => ({
          ...s,
          appointmentId,
        })),
      });

      // Update appointment totals
      const apt = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          subtotal,
          taxAmount,
          totalAmount,
          totalDuration,
          scheduledEndTime: endTime,
          updatedAt: new Date(),
        },
        include: {
          services: {
            include: {
              service: { select: { id: true, name: true, sku: true } },
            },
          },
          customer: {
            select: { id: true, name: true, phone: true },
          },
          branch: {
            select: { id: true, name: true },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          branchId: appointment.branchId,
          userId,
          action: 'APPOINTMENT_SERVICES_UPDATED',
          entityType: 'appointment',
          entityId: appointmentId,
          oldValues: {
            serviceCount: appointment.services?.length || 0,
            totalAmount: appointment.totalAmount,
          },
          newValues: {
            serviceCount: input.services.length,
            totalAmount,
            serviceIds,
          },
        },
      });

      return apt;
    });

    return updated;
  }

  // =====================================================
  // ADD SERVICE MID-APPOINTMENT (Upsell)
  // =====================================================

  /**
   * Add a service to an in-progress appointment
   */
  async addService(
    tenantId: string,
    appointmentId: string,
    input: { serviceId: string; stylistId?: string; quantity?: number },
    userId: string
  ) {
    const appointment = await this.getAppointmentById(tenantId, appointmentId);

    // Only allow adding services to in-progress appointments
    if (appointment.status !== 'in_progress') {
      throw new AppError('APT_030', 'Can only add services to in-progress appointments', 400);
    }

    // Get service details
    const service = await this.prisma.service.findFirst({
      where: {
        id: input.serviceId,
        tenantId,
        deletedAt: null,
        isActive: true,
      },
    });

    if (!service) {
      throw new AppError('SERVICE_NOT_FOUND', 'Service not found', 404);
    }

    const quantity = input.quantity || 1;
    const stylistId = input.stylistId || appointment.stylistId;

    // Calculate price (lock at current rate)
    const unitPrice = Number(service.basePrice);
    const taxRate = Number(service.taxRate);

    // Handle tax-inclusive vs tax-exclusive pricing
    let taxAmount: number;
    let totalAmount: number;

    if (service.isTaxInclusive) {
      // Tax is already included in the price - no additional tax
      taxAmount = 0;
      totalAmount = unitPrice * quantity;
    } else {
      // Tax is additional
      taxAmount = (unitPrice * quantity * taxRate) / 100;
      totalAmount = unitPrice * quantity + taxAmount;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Create appointment service
      await tx.appointmentService.create({
        data: {
          tenantId,
          appointmentId,
          serviceId: input.serviceId,
          serviceName: service.name,
          serviceSku: service.sku,
          stylistId,
          quantity,
          unitPrice,
          totalAmount,
          taxRate,
          taxAmount,
          durationMinutes: service.durationMinutes,
          activeTimeMinutes: service.activeTimeMinutes,
          processingTimeMinutes: service.processingTimeMinutes,
          status: 'pending',
          addedMidAppointment: true,
          addedAt: new Date(),
          addedBy: userId,
        },
      });

      // Recalculate appointment totals
      const allServices = await tx.appointmentService.findMany({
        where: { appointmentId },
      });

      // subtotal = sum of (unitPrice * quantity) - the base prices
      const subtotal = allServices.reduce((sum, s) => sum + Number(s.unitPrice) * s.quantity, 0);
      // taxAmount = sum of additional tax amounts
      const totalTax = allServices.reduce((sum, s) => sum + Number(s.taxAmount), 0);
      const totalDuration = await this.calculateTotalDuration(tx, allServices);

      // Update appointment
      const apt = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          subtotal,
          taxAmount: totalTax,
          totalAmount: subtotal + totalTax,
          totalDuration,
          scheduledEndTime: this.calculateEndTime(appointment.scheduledTime, totalDuration),
          updatedAt: new Date(),
        },
        include: {
          services: {
            include: {
              service: { select: { id: true, name: true, durationMinutes: true } },
            },
          },
          customer: {
            select: { id: true, name: true, phone: true },
          },
          stylist: {
            select: { id: true, name: true },
          },
          station: {
            include: { stationType: true },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          branchId: appointment.branchId,
          userId,
          action: 'SERVICE_ADDED_MID_APPOINTMENT',
          entityType: 'appointment',
          entityId: appointmentId,
          newValues: {
            serviceId: input.serviceId,
            serviceName: service.name,
            quantity,
            unitPrice,
            totalAmount,
          },
        },
      });

      return apt;
    });

    return updated;
  }

  /**
   * Helper to calculate total duration from appointment services
   */
  private async calculateTotalDuration(
    tx: any,
    services: Array<{ serviceId: string; quantity: number }>
  ): Promise<number> {
    let totalDuration = 0;

    for (const svc of services) {
      const service = await tx.service.findUnique({
        where: { id: svc.serviceId },
        select: { durationMinutes: true },
      });
      if (service) {
        totalDuration += service.durationMinutes * svc.quantity;
      }
    }

    return totalDuration;
  }

  // =====================================================
  // MULTI-STYLIST SUPPORT
  // =====================================================

  /**
   * Update stylists for an appointment (primary and assistants)
   */
  async updateStylists(
    tenantId: string,
    appointmentId: string,
    input: { primaryStylistId?: string; assistantIds?: string[] },
    userId: string
  ) {
    const appointment = await this.getAppointmentById(tenantId, appointmentId);

    // Check if appointment is in a valid status
    if (['completed', 'cancelled', 'no_show', 'rescheduled'].includes(appointment.status)) {
      throw new AppError(
        'APT_030',
        'Cannot update stylists for appointment in current status',
        400
      );
    }

    const updates: any = { updatedAt: new Date() };

    // Update primary stylist if provided
    if (input.primaryStylistId !== undefined) {
      // Verify stylist exists
      const stylist = await this.prisma.user.findFirst({
        where: {
          id: input.primaryStylistId,
          tenantId,
          role: 'stylist',
          isActive: true,
        },
      });

      if (!stylist) {
        throw new AppError('STYLIST_NOT_FOUND', 'Stylist not found', 404);
      }

      updates.stylistId = input.primaryStylistId;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const apt = await tx.appointment.update({
        where: { id: appointmentId },
        data: updates,
        include: {
          services: {
            include: {
              service: { select: { id: true, name: true } },
            },
          },
          customer: {
            select: { id: true, name: true, phone: true },
          },
          stylist: {
            select: { id: true, name: true },
          },
          station: {
            include: { stationType: true },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          branchId: appointment.branchId,
          userId,
          action: 'STYLISTS_UPDATED',
          entityType: 'appointment',
          entityId: appointmentId,
          oldValues: { stylistId: appointment.stylistId },
          newValues: { stylistId: input.primaryStylistId },
        },
      });

      return apt;
    });

    return updated;
  }
}
