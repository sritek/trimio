/**
 * Calendar Service
 * Business logic for resource calendar operations
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { AppError } from '../../lib/errors';
import { serializeDecimals } from '../../lib/prisma';

/**
 * Parse a date string (yyyy-MM-dd) to UTC midnight Date
 * This ensures consistent date handling regardless of server timezone
 */
function parseToUTCDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Get day of week from a date string (0 = Sunday, 6 = Saturday)
 */
function getDayOfWeek(dateStr: string): number {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getDay();
}

/**
 * Get start of week (Monday) for a date string
 */
function getStartOfWeekUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  // Adjust to Monday (1 = Monday, 0 = Sunday becomes 7)
  const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const monday = new Date(year, month - 1, day - diff);
  return new Date(Date.UTC(monday.getFullYear(), monday.getMonth(), monday.getDate(), 0, 0, 0, 0));
}

/**
 * Get end of week (Sunday) for a date string
 */
function getEndOfWeekUTC(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();
  // Adjust to Sunday
  const diff = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
  const sunday = new Date(year, month - 1, day + diff);
  return new Date(
    Date.UTC(sunday.getFullYear(), sunday.getMonth(), sunday.getDate(), 23, 59, 59, 999)
  );
}

// Day-specific working hours structure from branch settings
interface DayWorkingHours {
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

interface BranchWorkingHours {
  monday?: DayWorkingHours;
  tuesday?: DayWorkingHours;
  wednesday?: DayWorkingHours;
  thursday?: DayWorkingHours;
  friday?: DayWorkingHours;
  saturday?: DayWorkingHours;
  sunday?: DayWorkingHours;
}

const DAY_NAMES = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;
const DEFAULT_HOURS = { start: '09:00', end: '21:00' };

/**
 * Extract simple working hours from day-specific branch configuration
 * Returns { start, end } for the specific day of the week
 */
function extractSimpleWorkingHours(
  branchWorkingHours: BranchWorkingHours | null | undefined,
  date: string
): { start: string; end: string } {
  if (!branchWorkingHours) {
    return DEFAULT_HOURS;
  }

  // Get day of week from date (0 = Sunday, 1 = Monday, etc.)
  const dayIndex = getDayOfWeek(date);
  const dayName = DAY_NAMES[dayIndex] as keyof BranchWorkingHours;
  const dayHours = branchWorkingHours[dayName];

  if (!dayHours || !dayHours.isOpen) {
    return DEFAULT_HOURS;
  }

  return {
    start: dayHours.openTime || DEFAULT_HOURS.start,
    end: dayHours.closeTime || DEFAULT_HOURS.end,
  };
}
import type {
  GetResourceCalendarInput,
  MoveAppointmentInput,
  CalendarStylist,
  CalendarAppointment,
  ResourceCalendarResponse,
  ConflictInfo,
} from './calendar.schema';

// Stylist colors for visual distinction
const STYLIST_COLORS = [
  '#6366f1', // indigo
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#10b981', // emerald
  '#f97316', // orange
  '#06b6d4', // cyan
];

export class CalendarService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Get resource calendar data for a branch
   */
  async getResourceCalendar(
    tenantId: string,
    input: GetResourceCalendarInput
  ): Promise<ResourceCalendarResponse> {
    const { branchId, date, view } = input;

    // Calculate date range based on view
    let startDate: Date;
    let endDate: Date;

    if (view === 'week') {
      startDate = getStartOfWeekUTC(date); // Monday
      endDate = getEndOfWeekUTC(date); // Sunday
    } else {
      // Day view - use UTC midnight for consistent date comparison
      startDate = parseToUTCDate(date);
      endDate = parseToUTCDate(date);
    }

    // Get branch working hours
    const branch = await this.prisma.branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null },
      select: { workingHours: true },
    });

    if (!branch) {
      throw new AppError('Branch not found', 404, 'CAL_001');
    }

    // Extract simple working hours for the requested date from day-specific config
    const workingHours = extractSimpleWorkingHours(
      branch.workingHours as BranchWorkingHours | null,
      date
    );

    // Get stylists assigned to this branch
    const userBranches = await this.prisma.userBranch.findMany({
      where: {
        branchId,
        user: {
          tenantId,
          role: 'stylist',
          isActive: true,
          deletedAt: null,
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
          },
        },
      },
    });

    // Get stylist breaks and blocked slots
    const stylistIds = userBranches.map((ub) => ub.user.id);

    const [breaks, blockedSlots] = await Promise.all([
      this.prisma.stylistBreak.findMany({
        where: {
          tenantId,
          stylistId: { in: stylistIds },
          isActive: true,
        },
      }),
      this.prisma.stylistBlockedSlot.findMany({
        where: {
          tenantId,
          stylistId: { in: stylistIds },
          blockedDate: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
    ]);

    // Build stylists array with availability info, sorted alphabetically by name
    const stylists: CalendarStylist[] = userBranches
      .slice() // Create a copy to avoid mutating original
      .sort((a, b) => a.user.name.localeCompare(b.user.name))
      .map((ub, index) => {
        const stylistBreaks = breaks
          .filter((b) => b.stylistId === ub.user.id)
          .map((b) => ({
            id: b.id,
            start: b.startTime,
            end: b.endTime,
            name: b.name,
          }));

        const stylistBlocked = blockedSlots
          .filter((bs) => bs.stylistId === ub.user.id)
          .map((bs) => ({
            id: bs.id,
            start: bs.startTime || '00:00',
            end: bs.endTime || '23:59',
            reason: bs.reason,
            isFullDay: bs.isFullDay,
          }));

        // Check if stylist has full day blocked for the requested date
        // Since we already filtered blockedSlots by date range, just check isFullDay
        const isFullDayBlocked = stylistBlocked.some((bs) => bs.isFullDay);

        return {
          id: ub.user.id,
          name: ub.user.name,
          avatar: ub.user.avatarUrl,
          color: STYLIST_COLORS[index % STYLIST_COLORS.length],
          isAvailable: !isFullDayBlocked,
          workingHours: workingHours,
          breaks: stylistBreaks,
          blockedSlots: stylistBlocked,
        };
      });

    // Get appointments for the date range
    const appointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        branchId,
        scheduledDate: {
          gte: startDate,
          lte: endDate,
        },
        status: { notIn: ['cancelled', 'no_show', 'rescheduled'] },
        deletedAt: null,
      },
      include: {
        services: {
          select: { serviceName: true },
        },
        customer: {
          select: { name: true, phone: true },
        },
      },
      orderBy: [{ scheduledDate: 'asc' }, { scheduledTime: 'asc' }],
    });

    // Build conflict info for each appointment
    const appointmentConflicts = this.computeConflictInfo(appointments);

    const calendarAppointments: CalendarAppointment[] = appointments.map((apt) => {
      const conflictData = appointmentConflicts.get(apt.id);
      return {
        id: apt.id,
        stylistId: apt.stylistId,
        date: format(apt.scheduledDate, 'yyyy-MM-dd'),
        startTime: apt.scheduledTime,
        endTime: apt.endTime,
        customerName: apt.customer?.name || apt.customerName || 'Guest',
        customerPhone: apt.customer?.phone || apt.customerPhone,
        services: apt.services.map((s) => s.serviceName),
        status: apt.status,
        bookingType: apt.bookingType,
        totalAmount: Number(apt.totalAmount),
        hasConflict: conflictData ? conflictData.conflictingAppointmentIds.length > 0 : false,
        conflictInfo:
          conflictData && conflictData.conflictingAppointmentIds.length > 0 ? conflictData : null,
      };
    });

    return {
      date,
      view,
      stylists,
      appointments: serializeDecimals(calendarAppointments) as CalendarAppointment[],
      workingHours,
    };
  }

  /**
   * Move an appointment to a new time/stylist (drag-drop)
   */
  async moveAppointment(
    tenantId: string,
    appointmentId: string,
    input: MoveAppointmentInput,
    userId: string
  ) {
    const { newStylistId, newDate, newTime } = input;

    // Get the appointment
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId,
        deletedAt: null,
      },
      include: {
        services: true,
      },
    });

    if (!appointment) {
      throw new AppError('Appointment not found', 404, 'CAL_002');
    }

    // Check if appointment can be moved (only allow booked, confirmed, checked_in statuses)
    const movableStatuses = ['booked', 'confirmed', 'checked_in'];
    if (!movableStatuses.includes(appointment.status)) {
      throw new AppError(
        `Cannot move appointment with status "${appointment.status}". Only booked, confirmed, or checked-in appointments can be moved.`,
        400,
        'CAL_003'
      );
    }

    // Get duration from appointment or calculate from existing times
    let duration = appointment.totalDuration;
    if (!duration || duration <= 0) {
      // Calculate duration from existing start and end times
      const [startHours, startMins] = appointment.scheduledTime.split(':').map(Number);
      const [endHours, endMins] = appointment.endTime.split(':').map(Number);
      const startTotalMins = startHours * 60 + startMins;
      const endTotalMins = endHours * 60 + endMins;
      duration = endTotalMins - startTotalMins;
      // Handle overnight appointments (rare but possible)
      if (duration <= 0) {
        duration = 60; // Default to 1 hour if calculation fails
      }
    }

    // Calculate new end time
    const newEndTime = this.calculateEndTime(newTime, duration);

    // Check for conflicts at new time/stylist
    const targetStylistId = newStylistId || appointment.stylistId;

    if (targetStylistId) {
      const conflicts = await this.checkConflicts(
        tenantId,
        appointment.branchId,
        newDate,
        newTime,
        duration,
        targetStylistId,
        appointmentId
      );

      if (conflicts.length > 0) {
        throw new AppError('Time slot conflicts with existing appointments', 409, 'CAL_CONFLICT', {
          conflicts,
        });
      }

      // Check if stylist is blocked at this time
      const isBlocked = await this.isStylistBlocked(
        tenantId,
        targetStylistId,
        newDate,
        newTime,
        newEndTime
      );

      if (isBlocked) {
        throw new AppError('Stylist is not available at this time', 400, 'CAL_004');
      }
    }

    // Update the appointment
    return this.prisma.$transaction(async (tx) => {
      const oldDate = format(appointment.scheduledDate, 'yyyy-MM-dd');
      const oldTime = appointment.scheduledTime;
      const oldStylistId = appointment.stylistId;

      const updated = await tx.appointment.update({
        where: { id: appointmentId },
        data: {
          scheduledDate: parseToUTCDate(newDate),
          scheduledTime: newTime,
          endTime: newEndTime,
          stylistId: targetStylistId,
          // Also update totalDuration if it was missing/incorrect
          totalDuration: duration,
          updatedAt: new Date(),
        },
        include: {
          services: true,
          customer: {
            select: { id: true, name: true, phone: true },
          },
        },
      });

      // Create audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          branchId: appointment.branchId,
          userId,
          action: 'APPOINTMENT_MOVED',
          entityType: 'appointment',
          entityId: appointmentId,
          oldValues: {
            scheduledDate: oldDate,
            scheduledTime: oldTime,
            stylistId: oldStylistId,
          },
          newValues: {
            scheduledDate: newDate,
            scheduledTime: newTime,
            stylistId: targetStylistId,
          },
        },
      });

      return serializeDecimals(updated);
    });
  }

  /**
   * Check for conflicting appointments
   */
  private async checkConflicts(
    tenantId: string,
    branchId: string,
    date: string,
    startTime: string,
    duration: number,
    stylistId: string,
    excludeAppointmentId?: string
  ) {
    const endTime = this.calculateEndTime(startTime, duration);
    const dateObj = parseToUTCDate(date);

    const where: Prisma.AppointmentWhereInput = {
      tenantId,
      branchId,
      stylistId,
      scheduledDate: dateObj,
      status: { notIn: ['cancelled', 'no_show', 'rescheduled'] },
      deletedAt: null,
    };

    if (excludeAppointmentId) {
      where.id = { not: excludeAppointmentId };
    }

    const existingAppointments = await this.prisma.appointment.findMany({
      where,
      select: {
        id: true,
        scheduledTime: true,
        endTime: true,
        customerName: true,
        status: true,
      },
    });

    return existingAppointments.filter((apt) => {
      return this.timesOverlap(startTime, endTime, apt.scheduledTime, apt.endTime);
    });
  }

  /**
   * Check if stylist is blocked at a specific time
   */
  private async isStylistBlocked(
    tenantId: string,
    stylistId: string,
    date: string,
    startTime: string,
    endTime: string
  ): Promise<boolean> {
    const dateObj = parseToUTCDate(date);

    const blockedSlots = await this.prisma.stylistBlockedSlot.findMany({
      where: {
        tenantId,
        stylistId,
        blockedDate: dateObj,
      },
    });

    return blockedSlots.some((slot) => {
      if (slot.isFullDay) return true;
      const slotStart = slot.startTime || '00:00';
      const slotEnd = slot.endTime || '23:59';
      return this.timesOverlap(startTime, endTime, slotStart, slotEnd);
    });
  }

  /**
   * Helper: Check if two time ranges overlap
   */
  private timesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
    return start1 < end2 && end1 > start2;
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

  /**
   * Compute conflict info for all appointments
   * Groups by stylist and date, then checks for overlaps
   */
  private computeConflictInfo(
    appointments: Array<{
      id: string;
      stylistId: string | null;
      scheduledDate: Date;
      scheduledTime: string;
      endTime: string;
    }>
  ): Map<string, ConflictInfo> {
    const conflictMap = new Map<string, ConflictInfo>();

    // Group appointments by stylist and date
    const groupedByStylistDate = new Map<string, typeof appointments>();

    for (const apt of appointments) {
      if (!apt.stylistId) continue; // Skip unassigned appointments

      const dateStr = format(apt.scheduledDate, 'yyyy-MM-dd');
      const key = `${apt.stylistId}-${dateStr}`;

      if (!groupedByStylistDate.has(key)) {
        groupedByStylistDate.set(key, []);
      }
      groupedByStylistDate.get(key)!.push(apt);
    }

    // Check for conflicts within each group
    for (const [, group] of groupedByStylistDate) {
      for (let i = 0; i < group.length; i++) {
        const apt1 = group[i];
        const conflictingIds: string[] = [];
        let maxOverlapMinutes = 0;

        for (let j = 0; j < group.length; j++) {
          if (i === j) continue;

          const apt2 = group[j];
          const overlapMinutes = this.calculateOverlapMinutes(
            apt1.scheduledTime,
            apt1.endTime,
            apt2.scheduledTime,
            apt2.endTime
          );

          if (overlapMinutes > 0) {
            conflictingIds.push(apt2.id);
            maxOverlapMinutes = Math.max(maxOverlapMinutes, overlapMinutes);
          }
        }

        if (conflictingIds.length > 0) {
          // Calculate appointment duration to determine severity
          const apt1Duration =
            this.timeToMinutes(apt1.endTime) - this.timeToMinutes(apt1.scheduledTime);
          const overlapPercentage = (maxOverlapMinutes / apt1Duration) * 100;

          conflictMap.set(apt1.id, {
            conflictingAppointmentIds: conflictingIds,
            overlapMinutes: maxOverlapMinutes,
            severity: overlapPercentage >= 50 ? 'severe' : 'warning',
          });
        }
      }
    }

    return conflictMap;
  }

  /**
   * Helper: Calculate overlap in minutes between two time ranges
   */
  private calculateOverlapMinutes(
    start1: string,
    end1: string,
    start2: string,
    end2: string
  ): number {
    const start1Mins = this.timeToMinutes(start1);
    const end1Mins = this.timeToMinutes(end1);
    const start2Mins = this.timeToMinutes(start2);
    const end2Mins = this.timeToMinutes(end2);

    const overlapStart = Math.max(start1Mins, start2Mins);
    const overlapEnd = Math.min(end1Mins, end2Mins);

    return Math.max(0, overlapEnd - overlapStart);
  }

  /**
   * Helper: Convert time string to minutes
   */
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }
}
