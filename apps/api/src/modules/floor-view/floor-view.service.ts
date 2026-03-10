/**
 * Floor View Service
 * Business logic for floor view data aggregation and status calculation
 */

import { prisma } from '../../lib/prisma';

import type { FloorViewStatus, StationCard, FloorViewResponse } from './floor-view.schema';

// Reserved threshold in minutes (appointments starting within this time are "reserved")
const RESERVED_THRESHOLD_MINUTES = 15;

// Overtime threshold in minutes (appointments exceeding duration by this much show overtime alert)
const OVERTIME_THRESHOLD_MINUTES = 10;

/**
 * Parse a date string (yyyy-MM-dd) to UTC midnight Date
 * This ensures consistent date handling regardless of server timezone
 */
function parseToUTCDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Get today's date as UTC midnight
 */
function getTodayUTC(): Date {
  const now = new Date();
  return parseToUTCDate(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  );
}

/**
 * Get end of today as UTC (23:59:59.999)
 */
function getTodayEndUTC(): Date {
  const now = new Date();
  const [year, month, day] = [now.getFullYear(), now.getMonth() + 1, now.getDate()];
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

export class FloorViewService {
  /**
   * Get floor view data for a branch
   */
  async getFloorView(tenantId: string, branchId: string): Promise<FloorViewResponse> {
    const now = new Date();
    const todayStart = getTodayUTC();
    const todayEnd = getTodayEndUTC();

    // Get all active stations for the branch
    const stations = await prisma.station.findMany({
      where: {
        tenantId,
        branchId,
        deletedAt: null,
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        stationType: true,
        appointments: {
          where: {
            // Use date range to handle timezone issues with PostgreSQL DATE type
            scheduledDate: {
              gte: todayStart,
              lte: todayEnd,
            },
            status: { in: ['checked_in', 'in_progress', 'booked', 'confirmed'] },
            deletedAt: null,
          },
          include: {
            customer: {
              select: { name: true },
            },
            stylist: {
              select: { name: true },
            },
            services: {
              include: {
                service: {
                  select: { name: true, durationMinutes: true },
                },
              },
            },
          },
          orderBy: { scheduledTime: 'asc' },
        },
      },
    });

    // Process each station to determine status and build card data
    const stationCards: StationCard[] = stations.map((station) => {
      const status = this.determineStationStatus(station, now);
      const appointment = this.getRelevantAppointment(station, status, now);

      return {
        id: station.id,
        name: station.name,
        stationType: {
          id: station.stationType.id,
          name: station.stationType.name,
          icon: station.stationType.icon,
          color: station.stationType.color,
        },
        displayOrder: station.displayOrder,
        status,
        appointment: appointment ? this.buildAppointmentCard(appointment, now) : null,
      };
    });

    // Calculate summary
    const summary = {
      total: stationCards.length,
      available: stationCards.filter((s) => s.status === 'available').length,
      occupied: stationCards.filter((s) => s.status === 'occupied').length,
      reserved: stationCards.filter((s) => s.status === 'reserved').length,
      outOfService: stationCards.filter((s) => s.status === 'out_of_service').length,
    };

    return { stations: stationCards, summary };
  }

  /**
   * Determine station status based on current state and appointments
   */
  private determineStationStatus(
    station: {
      status: string;
      appointments: Array<{
        status: string;
        scheduledTime: string;
        startedAt: Date | null;
      }>;
    },
    now: Date
  ): FloorViewStatus {
    // Out of service takes precedence
    if (station.status === 'out_of_service') {
      return 'out_of_service';
    }

    // Check for in-progress appointment
    const inProgressAppointment = station.appointments.find((apt) => apt.status === 'in_progress');
    if (inProgressAppointment) {
      return 'occupied';
    }

    // Check for checked-in appointment (also considered occupied)
    const checkedInAppointment = station.appointments.find((apt) => apt.status === 'checked_in');
    if (checkedInAppointment) {
      return 'occupied';
    }

    // Check for upcoming appointment within threshold
    const upcomingAppointment = station.appointments.find((apt) => {
      if (apt.status !== 'booked' && apt.status !== 'confirmed') {
        return false;
      }

      const appointmentTime = this.parseScheduledTime(apt.scheduledTime, now);
      const minutesUntilStart = (appointmentTime.getTime() - now.getTime()) / (1000 * 60);

      return minutesUntilStart >= 0 && minutesUntilStart <= RESERVED_THRESHOLD_MINUTES;
    });

    if (upcomingAppointment) {
      return 'reserved';
    }

    return 'available';
  }

  /**
   * Get the relevant appointment for display based on station status
   */
  private getRelevantAppointment(
    station: {
      appointments: Array<any>;
    },
    status: FloorViewStatus,
    now: Date
  ): any | null {
    if (status === 'available' || status === 'out_of_service') {
      return null;
    }

    if (status === 'occupied') {
      // Return in-progress or checked-in appointment
      return (
        station.appointments.find((apt) => apt.status === 'in_progress') ||
        station.appointments.find((apt) => apt.status === 'checked_in')
      );
    }

    if (status === 'reserved') {
      // Return the next upcoming appointment
      return station.appointments.find((apt) => {
        if (apt.status !== 'booked' && apt.status !== 'confirmed') {
          return false;
        }

        const appointmentTime = this.parseScheduledTime(apt.scheduledTime, now);
        const minutesUntilStart = (appointmentTime.getTime() - now.getTime()) / (1000 * 60);

        return minutesUntilStart >= 0 && minutesUntilStart <= RESERVED_THRESHOLD_MINUTES;
      });
    }

    return null;
  }

  /**
   * Build appointment card data with progress calculations
   */
  private buildAppointmentCard(
    appointment: {
      id: string;
      customerName: string | null;
      customer: { name: string } | null;
      stylist: { name: string } | null;
      scheduledTime: string;
      startedAt: Date | null;
      totalDuration: number;
      services: Array<{
        service: { name: string; durationMinutes: number };
      }>;
    },
    now: Date
  ): StationCard['appointment'] {
    const customerName = appointment.customer?.name || appointment.customerName || 'Guest';

    // Format customer name (first name + last initial)
    const formattedName = this.formatCustomerName(customerName);

    const serviceNames = appointment.services.map((s) => s.service.name);
    const totalDuration =
      appointment.totalDuration ||
      appointment.services.reduce((sum, s) => sum + s.service.durationMinutes, 0);

    // Calculate progress if appointment has started
    let elapsedMinutes: number | null = null;
    let remainingMinutes: number | null = null;
    let progressPercent: number | null = null;
    let isOvertime = false;
    let estimatedEndTime: string | null = null;

    if (appointment.startedAt) {
      elapsedMinutes = Math.floor((now.getTime() - appointment.startedAt.getTime()) / (1000 * 60));
      remainingMinutes = Math.max(0, totalDuration - elapsedMinutes);
      progressPercent = Math.min(100, Math.round((elapsedMinutes / totalDuration) * 100));
      isOvertime = elapsedMinutes > totalDuration + OVERTIME_THRESHOLD_MINUTES;

      // Calculate estimated end time
      const endTime = new Date(appointment.startedAt.getTime() + totalDuration * 60 * 1000);
      estimatedEndTime = endTime.toISOString();
    }

    return {
      id: appointment.id,
      customerName: formattedName,
      stylistName: appointment.stylist?.name || null,
      assistantNames: [], // TODO: Add assistant support when multi-stylist is implemented
      services: serviceNames,
      startedAt: appointment.startedAt?.toISOString() || null,
      estimatedEndTime,
      scheduledTime: appointment.scheduledTime,
      elapsedMinutes,
      remainingMinutes,
      progressPercent,
      isOvertime,
    };
  }

  /**
   * Format customer name as "First L."
   */
  private formatCustomerName(fullName: string): string {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length === 1) {
      return parts[0];
    }
    const firstName = parts[0];
    const lastInitial = parts[parts.length - 1].charAt(0).toUpperCase();
    return `${firstName} ${lastInitial}.`;
  }

  /**
   * Parse scheduled time string (HH:mm) to Date object for today
   */
  private parseScheduledTime(timeStr: string, referenceDate: Date): Date {
    const [hours, minutes] = timeStr.split(':').map(Number);
    const result = new Date(referenceDate);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }
}

export const floorViewService = new FloorViewService();
