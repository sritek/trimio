import { PrismaClient } from '@prisma/client';
import { AppError } from '../../lib/errors';
import type {
  CreateStylistBreakInput,
  CreateBlockedSlotInput,
  GetStylistScheduleInput,
} from './appointments.schema';

/**
 * Parse a date string (yyyy-MM-dd) to UTC midnight Date
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

export class StylistScheduleService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get stylist schedule for a date range
   */
  async getStylistSchedule(tenantId: string, stylistId: string, input: GetStylistScheduleInput) {
    const { dateFrom, dateTo } = input;

    // Verify stylist exists
    const stylist = await this.prisma.user.findFirst({
      where: { id: stylistId, tenantId, role: 'stylist' },
      select: { id: true, name: true, gender: true },
    });

    if (!stylist) {
      throw new AppError('Stylist not found', 404, 'STYLIST_NOT_FOUND');
    }

    // Get breaks
    const breaks = await this.prisma.stylistBreak.findMany({
      where: {
        tenantId,
        stylistId,
        isActive: true,
      },
    });

    // Get blocked slots in date range
    const blockedSlots = await this.prisma.stylistBlockedSlot.findMany({
      where: {
        tenantId,
        stylistId,
        blockedDate: {
          gte: parseToUTCDate(dateFrom),
          lte: parseToUTCEndOfDay(dateTo),
        },
      },
    });

    // Get appointments in date range
    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        stylistId,
        scheduledDate: {
          gte: parseToUTCDate(dateFrom),
          lte: parseToUTCEndOfDay(dateTo),
        },
        status: { notIn: ['cancelled', 'no_show', 'rescheduled'] },
        deletedAt: null,
      },
      include: {
        customer: {
          select: { id: true, name: true },
        },
        services: {
          select: { serviceName: true },
        },
      },
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
    });

    return {
      stylist,
      dateFrom,
      dateTo,
      breaks,
      blockedSlots,
      appointments: appointments.map((apt) => ({
        id: apt.id,
        scheduledDate: apt.scheduledDate.toISOString().split('T')[0],
        scheduledTime: apt.scheduledTime,
        endTime: apt.endTime,
        customerName: apt.customer?.name || apt.customerName || 'Guest',
        services: apt.services.map((s) => s.serviceName),
        status: apt.status,
      })),
    };
  }

  /**
   * Create a recurring break for a stylist
   */
  async createBreak(
    tenantId: string,
    branchId: string,
    stylistId: string,
    input: CreateStylistBreakInput,
    userId: string
  ) {
    // Verify stylist exists and belongs to branch
    const stylist = await this.prisma.user.findFirst({
      where: {
        id: stylistId,
        tenantId,
        role: 'stylist',
        branchAssignments: {
          some: { branchId },
        },
      },
    });

    if (!stylist) {
      throw new AppError(
        'Stylist not found or not assigned to this branch',
        404,
        'STYLIST_NOT_FOUND'
      );
    }

    // Check for overlapping breaks
    const existingBreaks = await this.prisma.stylistBreak.findMany({
      where: {
        tenantId,
        stylistId,
        isActive: true,
        OR: [
          { dayOfWeek: input.dayOfWeek },
          { dayOfWeek: null }, // All days
        ],
      },
    });

    for (const brk of existingBreaks) {
      if (this.timesOverlap(input.startTime, input.endTime, brk.startTime, brk.endTime)) {
        throw new AppError('Break overlaps with existing break', 400, 'BREAK_OVERLAP');
      }
    }

    return this.prisma.stylistBreak.create({
      data: {
        tenantId,
        branchId,
        stylistId,
        name: input.name,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        isActive: true,
        createdBy: userId,
      },
    });
  }

  /**
   * Delete a break
   */
  async deleteBreak(tenantId: string, breakId: string) {
    const brk = await this.prisma.stylistBreak.findFirst({
      where: { id: breakId, tenantId },
    });

    if (!brk) {
      throw new AppError('Break not found', 404, 'BREAK_NOT_FOUND');
    }

    return this.prisma.stylistBreak.delete({
      where: { id: breakId },
    });
  }

  /**
   * Create a blocked slot (one-time)
   */
  async createBlockedSlot(
    tenantId: string,
    branchId: string,
    stylistId: string,
    input: CreateBlockedSlotInput,
    userId: string
  ) {
    // Verify stylist exists and belongs to branch
    const stylist = await this.prisma.user.findFirst({
      where: {
        id: stylistId,
        tenantId,
        role: 'stylist',
        branchAssignments: {
          some: { branchId },
        },
      },
    });

    if (!stylist) {
      throw new AppError(
        'Stylist not found or not assigned to this branch',
        404,
        'STYLIST_NOT_FOUND'
      );
    }

    // Check for existing appointments if blocking time
    if (!input.isFullDay && input.startTime && input.endTime) {
      const conflictingAppointments = await this.prisma.appointment.findMany({
        where: {
          tenantId,
          stylistId,
          scheduledDate: parseToUTCDate(input.blockedDate),
          status: { notIn: ['cancelled', 'no_show', 'rescheduled'] },
          deletedAt: null,
        },
      });

      for (const apt of conflictingAppointments) {
        if (this.timesOverlap(input.startTime, input.endTime, apt.scheduledTime, apt.endTime)) {
          throw new AppError(
            'Cannot block slot - conflicts with existing appointment',
            400,
            'BLOCK_CONFLICT'
          );
        }
      }
    } else if (input.isFullDay) {
      // Check for any appointments on that day
      const dayAppointments = await this.prisma.appointment.count({
        where: {
          tenantId,
          stylistId,
          scheduledDate: parseToUTCDate(input.blockedDate),
          status: { notIn: ['cancelled', 'no_show', 'rescheduled'] },
          deletedAt: null,
        },
      });

      if (dayAppointments > 0) {
        throw new AppError(
          'Cannot block full day - existing appointments found',
          400,
          'BLOCK_CONFLICT'
        );
      }
    }

    return this.prisma.stylistBlockedSlot.create({
      data: {
        tenantId,
        branchId,
        stylistId,
        blockedDate: parseToUTCDate(input.blockedDate),
        startTime: input.isFullDay ? null : input.startTime,
        endTime: input.isFullDay ? null : input.endTime,
        isFullDay: input.isFullDay,
        reason: input.reason,
        createdBy: userId,
      },
    });
  }

  /**
   * Delete a blocked slot
   */
  async deleteBlockedSlot(tenantId: string, slotId: string) {
    const slot = await this.prisma.stylistBlockedSlot.findFirst({
      where: { id: slotId, tenantId },
    });

    if (!slot) {
      throw new AppError('Blocked slot not found', 404, 'SLOT_NOT_FOUND');
    }

    return this.prisma.stylistBlockedSlot.delete({
      where: { id: slotId },
    });
  }

  /**
   * Get all breaks for a stylist
   */
  async getStylistBreaks(tenantId: string, stylistId: string) {
    return this.prisma.stylistBreak.findMany({
      where: {
        tenantId,
        stylistId,
        isActive: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  /**
   * Get blocked slots for a stylist in a date range
   */
  async getStylistBlockedSlots(
    tenantId: string,
    stylistId: string,
    dateFrom: string,
    dateTo: string
  ) {
    return this.prisma.stylistBlockedSlot.findMany({
      where: {
        tenantId,
        stylistId,
        blockedDate: {
          gte: parseToUTCDate(dateFrom),
          lte: parseToUTCEndOfDay(dateTo),
        },
      },
      orderBy: { blockedDate: 'asc' },
    });
  }

  /**
   * Check if two time ranges overlap
   */
  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    return start1 < end2 && end1 > start2;
  }
}
