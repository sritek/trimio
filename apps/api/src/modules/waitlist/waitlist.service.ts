import { PrismaClient, Prisma } from '@prisma/client';
import { NotFoundError, ConflictError } from '../../lib/errors';
import { serializeDecimals } from '../../lib/prisma';
import type { PaginatedResult } from '../../lib/types';
import type {
  CreateWaitlistEntryInput,
  UpdateWaitlistEntryInput,
  ListWaitlistQueryInput,
  MatchWaitlistQueryInput,
  ConvertWaitlistInput,
} from './waitlist.schema';

// Time period ranges (24-hour format)
const TIME_PERIODS = {
  morning: { start: '09:00', end: '12:00' },
  afternoon: { start: '12:00', end: '17:00' },
  evening: { start: '17:00', end: '21:00' },
} as const;

export class WaitlistService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new waitlist entry
   */
  async create(tenantId: string, input: CreateWaitlistEntryInput, userId: string) {
    const entry = await this.prisma.waitlistEntry.create({
      data: {
        tenantId,
        branchId: input.branchId,
        customerId: input.customerId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        serviceIds: input.serviceIds,
        preferredStylistId: input.preferredStylistId,
        preferredStartDate: new Date(input.preferredStartDate),
        preferredEndDate: new Date(input.preferredEndDate),
        timePreferences: input.timePreferences,
        notes: input.notes,
        status: 'active',
        createdBy: userId,
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    return serializeDecimals(entry);
  }

  /**
   * List waitlist entries with pagination and filtering
   */
  async list(tenantId: string, query: ListWaitlistQueryInput): Promise<PaginatedResult<unknown>> {
    const { branchId, status, startDate, endDate, search, page = 1, limit = 20 } = query;

    const where: Prisma.WaitlistEntryWhereInput = {
      tenantId,
    };

    if (branchId) where.branchId = branchId;
    if (status) where.status = status;

    // Date range filter - entries whose preferred range overlaps with filter range
    if (startDate || endDate) {
      if (startDate && endDate) {
        where.AND = [
          { preferredStartDate: { lte: new Date(endDate) } },
          { preferredEndDate: { gte: new Date(startDate) } },
        ];
      } else if (startDate) {
        where.preferredEndDate = { gte: new Date(startDate) };
      } else if (endDate) {
        where.preferredStartDate = { lte: new Date(endDate) };
      }
    }

    if (search) {
      where.OR = [
        { customerName: { contains: search, mode: 'insensitive' } },
        { customerPhone: { contains: search } },
      ];
    }

    const [entries, total] = await Promise.all([
      this.prisma.waitlistEntry.findMany({
        where,
        include: {
          customer: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.waitlistEntry.count({ where }),
    ]);

    return {
      data: serializeDecimals(entries) as unknown[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get a single waitlist entry by ID
   */
  async getById(tenantId: string, id: string) {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: { id, tenantId },
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    if (!entry) {
      throw new NotFoundError('WAITLIST_NOT_FOUND', 'Waitlist entry not found');
    }

    return serializeDecimals(entry);
  }

  /**
   * Update a waitlist entry
   */
  async update(tenantId: string, id: string, input: UpdateWaitlistEntryInput, _userId: string) {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: { id, tenantId },
    });

    if (!entry) {
      throw new NotFoundError('WAITLIST_NOT_FOUND', 'Waitlist entry not found');
    }

    if (entry.status !== 'active') {
      throw new ConflictError(
        'WAITLIST_NOT_ACTIVE',
        'Cannot update waitlist entry that is not active'
      );
    }

    const updateData: Prisma.WaitlistEntryUpdateInput = {};

    if (input.customerName !== undefined) updateData.customerName = input.customerName;
    if (input.customerPhone !== undefined) updateData.customerPhone = input.customerPhone;
    if (input.serviceIds !== undefined) updateData.serviceIds = input.serviceIds;
    if (input.preferredStylistId !== undefined) {
      updateData.preferredStylistId = input.preferredStylistId;
    }
    if (input.preferredStartDate !== undefined) {
      updateData.preferredStartDate = new Date(input.preferredStartDate);
    }
    if (input.preferredEndDate !== undefined) {
      updateData.preferredEndDate = new Date(input.preferredEndDate);
    }
    if (input.timePreferences !== undefined) updateData.timePreferences = input.timePreferences;
    if (input.notes !== undefined) updateData.notes = input.notes;

    const updated = await this.prisma.waitlistEntry.update({
      where: { id },
      data: updateData,
      include: {
        customer: {
          select: { id: true, name: true, phone: true, email: true },
        },
      },
    });

    return serializeDecimals(updated);
  }

  /**
   * Remove (soft delete) a waitlist entry
   */
  async remove(tenantId: string, id: string, _userId: string) {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: { id, tenantId },
    });

    if (!entry) {
      throw new NotFoundError('WAITLIST_NOT_FOUND', 'Waitlist entry not found');
    }

    if (entry.status === 'converted') {
      throw new ConflictError(
        'WAITLIST_ALREADY_CONVERTED',
        'Cannot remove waitlist entry that has been converted'
      );
    }

    await this.prisma.waitlistEntry.update({
      where: { id },
      data: { status: 'removed' },
    });
  }

  /**
   * Convert a waitlist entry to an appointment
   * Returns the appointment data for the caller to create the appointment
   */
  async convert(tenantId: string, id: string, input: ConvertWaitlistInput, userId: string) {
    const entry = await this.prisma.waitlistEntry.findFirst({
      where: { id, tenantId },
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
      },
    });

    if (!entry) {
      throw new NotFoundError('WAITLIST_NOT_FOUND', 'Waitlist entry not found');
    }

    if (entry.status === 'converted') {
      throw new ConflictError(
        'WAITLIST_ALREADY_CONVERTED',
        'Waitlist entry has already been converted'
      );
    }

    if (entry.status === 'expired') {
      throw new ConflictError('WAITLIST_EXPIRED', 'Waitlist entry has expired');
    }

    if (entry.status === 'removed') {
      throw new ConflictError('WAITLIST_REMOVED', 'Waitlist entry has been removed');
    }

    // Return the data needed to create an appointment
    // The actual appointment creation is handled by the appointments service
    // This allows the caller to validate availability and create the appointment
    return {
      waitlistEntry: serializeDecimals(entry),
      appointmentData: {
        branchId: entry.branchId,
        customerId: entry.customerId,
        customerName: entry.customerName,
        customerPhone: entry.customerPhone,
        serviceIds: entry.serviceIds,
        scheduledDate: input.scheduledDate,
        scheduledTime: input.scheduledTime,
        stylistId: input.stylistId || entry.preferredStylistId,
      },
      // Method to mark as converted after appointment is created
      markConverted: async (appointmentId: string) => {
        await this.prisma.waitlistEntry.update({
          where: { id },
          data: {
            status: 'converted',
            appointmentId,
            convertedAt: new Date(),
          },
        });

        // Create audit log
        await this.prisma.auditLog.create({
          data: {
            tenantId,
            branchId: entry.branchId,
            userId,
            action: 'WAITLIST_CONVERTED',
            entityType: 'waitlist_entry',
            entityId: id,
            newValues: {
              appointmentId,
              scheduledDate: input.scheduledDate,
              scheduledTime: input.scheduledTime,
            },
          },
        });
      },
    };
  }

  /**
   * Find waitlist entries that match a given time slot
   * Used for smart matching in the new appointment panel
   */
  async findMatches(tenantId: string, query: MatchWaitlistQueryInput) {
    const { branchId, date, time, durationMinutes } = query;
    const slotDate = new Date(date);

    // Get active entries for this branch where the date falls within preferred range
    const entries = await this.prisma.waitlistEntry.findMany({
      where: {
        tenantId,
        branchId,
        status: 'active',
        preferredStartDate: { lte: slotDate },
        preferredEndDate: { gte: slotDate },
      },
      include: {
        customer: {
          select: { id: true, name: true, phone: true },
        },
      },
      orderBy: { createdAt: 'asc' }, // FIFO - first come first served
    });

    // Calculate match scores
    const matches = entries.map((entry) => {
      const { score, reasons } = this.calculateMatchScore(entry, time, durationMinutes);
      return {
        ...serializeDecimals(entry),
        matchScore: score,
        matchReasons: reasons,
      };
    });

    // Filter entries that have at least some match and sort by score
    return matches.filter((m) => m.matchScore > 0).sort((a, b) => b.matchScore - a.matchScore);
  }

  /**
   * Calculate match score for a waitlist entry against a time slot
   */
  private calculateMatchScore(
    entry: { timePreferences: string[]; serviceIds: string[] },
    time: string,
    _durationMinutes: number
  ): { score: number; reasons: string[] } {
    let score = 0;
    const reasons: string[] = [];

    // Check if time falls within any preferred time period
    const timePeriod = this.getTimePeriod(time);
    if (timePeriod && entry.timePreferences.includes(timePeriod)) {
      score += 50;
      reasons.push(`Matches ${timePeriod} preference`);
    } else if (entry.timePreferences.length > 0) {
      // Partial match - time is close to preferred period
      score += 20;
      reasons.push('Time is outside preferred periods');
    }

    // Base score for being in date range (already filtered)
    score += 30;
    reasons.push('Date is within preferred range');

    // Bonus for having services specified
    if (entry.serviceIds.length > 0) {
      score += 20;
      reasons.push(`${entry.serviceIds.length} service(s) requested`);
    }

    return { score, reasons };
  }

  /**
   * Get the time period for a given time string
   */
  private getTimePeriod(time: string): string | null {
    for (const [period, range] of Object.entries(TIME_PERIODS)) {
      if (time >= range.start && time < range.end) {
        return period;
      }
    }
    return null;
  }

  /**
   * Expire old waitlist entries
   * Called by a scheduled job or manually
   */
  async expireOldEntries(tenantId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const result = await this.prisma.waitlistEntry.updateMany({
      where: {
        tenantId,
        status: 'active',
        preferredEndDate: { lt: today },
      },
      data: {
        status: 'expired',
      },
    });

    return result.count;
  }

  /**
   * Get count of active waitlist entries for a branch
   */
  async getActiveCount(tenantId: string, branchId: string): Promise<number> {
    return this.prisma.waitlistEntry.count({
      where: {
        tenantId,
        branchId,
        status: 'active',
      },
    });
  }
}
