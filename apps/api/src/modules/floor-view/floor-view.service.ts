/**
 * Floor View Service
 * Business logic for floor view data aggregation and status calculation
 */

import { prisma } from '../../lib/prisma';

import type {
  FloorViewStatus,
  StationCard,
  FloorViewResponse,
  UpNextService,
  CurrentServiceInfo,
} from './floor-view.schema';

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

// Type for appointment service with all needed fields
interface AppointmentServiceData {
  id: string;
  serviceName: string;
  sequence: number;
  status: string;
  durationMinutes: number;
  scheduledStartTime: Date | null;
  scheduledEndTime: Date | null;
  actualStartTime: Date | null;
  actualEndTime: Date | null;
  service: { name: string; durationMinutes: number };
  assignedStylist: { id: string; name: string } | null;
  actualStylist: { id: string; name: string } | null;
  station: { id: string; name: string } | null;
}

// Type for appointment with all needed fields
interface AppointmentData {
  id: string;
  status: string;
  scheduledTime: string;
  scheduledDate: Date;
  actualStartTime: Date | null;
  customerName: string | null;
  totalDuration: number;
  stationId: string | null;
  customer: { name: string } | null;
  stylist: { name: string } | null;
  services: AppointmentServiceData[];
}

export class FloorViewService {
  /**
   * Get floor view data for a branch
   */
  async getFloorView(tenantId: string, branchId: string): Promise<FloorViewResponse> {
    const now = new Date();
    const todayStart = getTodayUTC();
    const todayEnd = getTodayEndUTC();

    // Get all active stations for the branch (lightweight query)
    const stations = await prisma.station.findMany({
      where: {
        tenantId,
        branchId,
        deletedAt: null,
      },
      orderBy: [{ displayOrder: 'asc' }, { name: 'asc' }],
      include: {
        stationType: true,
      },
    });

    // Query today's appointments
    const todayAppointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        branchId,
        stationId: { in: stations.map((s) => s.id) },
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
            assignedStylist: {
              select: { id: true, name: true },
            },
            actualStylist: {
              select: { id: true, name: true },
            },
            station: {
              select: { id: true, name: true },
            },
          },
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    // Query pending appointments from previous days (still in_progress)
    const pendingAppointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        branchId,
        stationId: { in: stations.map((s) => s.id) },
        scheduledDate: {
          lt: todayStart,
        },
        status: 'in_progress',
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
            assignedStylist: {
              select: { id: true, name: true },
            },
            actualStylist: {
              select: { id: true, name: true },
            },
            station: {
              select: { id: true, name: true },
            },
          },
          orderBy: { sequence: 'asc' },
        },
      },
      orderBy: { scheduledTime: 'asc' },
    });

    // Combine all appointments
    const allAppointments: AppointmentData[] = [...todayAppointments, ...pendingAppointments];

    // Create a map of station appointments for quick lookup
    const appointmentsByStationId = new Map<string, AppointmentData[]>();
    for (const appointment of allAppointments) {
      if (!appointmentsByStationId.has(appointment.stationId!)) {
        appointmentsByStationId.set(appointment.stationId!, []);
      }
      appointmentsByStationId.get(appointment.stationId!)!.push(appointment);
    }

    // Process each station to determine status and build card data
    const stationCards: StationCard[] = stations.map((station) => {
      const stationAppointments = appointmentsByStationId.get(station.id) || [];
      const status = this.determineStationStatus(station, stationAppointments, now);
      const appointment = this.getRelevantAppointment(stationAppointments, status, now);

      // Build "Up Next" information for multi-service appointments
      const upNext = this.getUpNextService(stationAppointments, now);

      return {
        id: station.id,
        name: station.name,
        stationType: {
          id: station.stationType.id,
          name: station.stationType.name,
          color: station.stationType.color,
        },
        displayOrder: station.displayOrder,
        status,
        appointment: appointment ? this.buildAppointmentCard(appointment, now) : null,
        upNext,
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
    },
    appointments: AppointmentData[],
    now: Date
  ): FloorViewStatus {
    // Out of service takes precedence
    if (station.status === 'out_of_service') {
      return 'out_of_service';
    }

    // Check for in-progress appointment
    const inProgressAppointment = appointments.find((apt) => apt.status === 'in_progress');
    if (inProgressAppointment) {
      return 'occupied';
    }

    // Check for checked-in appointment (also considered occupied)
    const checkedInAppointment = appointments.find((apt) => apt.status === 'checked_in');
    if (checkedInAppointment) {
      return 'occupied';
    }

    // Check for upcoming appointment within threshold
    const upcomingAppointment = appointments.find((apt) => {
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
    appointments: AppointmentData[],
    status: FloorViewStatus,
    now: Date
  ): AppointmentData | null {
    if (status === 'available' || status === 'out_of_service') {
      return null;
    }

    if (status === 'occupied') {
      // Return in-progress or checked-in appointment
      return (
        appointments.find((apt) => apt.status === 'in_progress') ||
        appointments.find((apt) => apt.status === 'checked_in') ||
        null
      );
    }

    if (status === 'reserved') {
      // Return the next upcoming appointment
      return (
        appointments.find((apt) => {
          if (apt.status !== 'booked' && apt.status !== 'confirmed') {
            return false;
          }

          const appointmentTime = this.parseScheduledTime(apt.scheduledTime, now);
          const minutesUntilStart = (appointmentTime.getTime() - now.getTime()) / (1000 * 60);

          return minutesUntilStart >= 0 && minutesUntilStart <= RESERVED_THRESHOLD_MINUTES;
        }) || null
      );
    }

    return null;
  }

  /**
   * Get "Up Next" service information for multi-service appointments
   * Shows the next service in sequence that is waiting to be started
   *
   * Requirements 11.3, 11.4, 11.5: Show next service name, customer name,
   * assigned stylist, and estimated start time
   *
   * Requirement 18.4: Do NOT display "Up Next" for single-service appointments
   */
  private getUpNextService(appointments: AppointmentData[], _now: Date): UpNextService | null {
    // Find in-progress or checked-in appointment
    const activeAppointment =
      appointments.find((apt) => apt.status === 'in_progress') ||
      appointments.find((apt) => apt.status === 'checked_in');

    if (!activeAppointment) {
      return null;
    }

    // Backward compatibility: Don't show "Up Next" for single-service appointments (Requirement 18.4)
    if (activeAppointment.services.length <= 1) {
      return null;
    }

    // Find the current in-progress service
    const currentService = activeAppointment.services.find((s) => s.status === 'in_progress');

    // Find the next waiting service in sequence
    let nextService: AppointmentServiceData | undefined;

    if (currentService) {
      // Find next service after the current one
      nextService = activeAppointment.services.find(
        (s) => s.sequence > currentService.sequence && s.status === 'waiting'
      );
    } else {
      // No service in progress yet, find the first waiting service
      nextService = activeAppointment.services.find((s) => s.status === 'waiting');
    }

    if (!nextService) {
      return null;
    }

    // Calculate estimated start time
    let estimatedStartTime: string | null = null;

    if (currentService && currentService.actualStartTime) {
      // Estimate based on current service duration
      const currentDuration =
        currentService.durationMinutes || currentService.service.durationMinutes;
      const estimatedEnd = new Date(
        currentService.actualStartTime.getTime() + currentDuration * 60 * 1000
      );
      estimatedStartTime = estimatedEnd.toISOString();
    } else if (nextService.scheduledStartTime) {
      // Use scheduled start time if available
      estimatedStartTime = nextService.scheduledStartTime.toISOString();
    }

    const customerName =
      activeAppointment.customer?.name || activeAppointment.customerName || 'Guest';

    return {
      id: nextService.id,
      serviceName: nextService.serviceName || nextService.service.name,
      customerName: this.formatCustomerName(customerName),
      assignedStylistId: nextService.assignedStylist?.id || null,
      assignedStylistName: nextService.assignedStylist?.name || null,
      estimatedStartTime,
      durationMinutes: nextService.durationMinutes || nextService.service.durationMinutes,
      sequence: nextService.sequence,
    };
  }

  /**
   * Build appointment card data with progress calculations and multi-service support
   */
  private buildAppointmentCard(
    appointment: AppointmentData,
    now: Date
  ): StationCard['appointment'] {
    const customerName = appointment.customer?.name || appointment.customerName || 'Guest';

    // Format customer name (first name + last initial)
    const formattedName = this.formatCustomerName(customerName);

    const serviceNames = appointment.services.map((s) => s.serviceName || s.service.name);
    const totalDuration =
      appointment.totalDuration ||
      appointment.services.reduce(
        (sum, s) => sum + (s.durationMinutes || s.service.durationMinutes),
        0
      );

    // Multi-service fields
    const isMultiService = appointment.services.length > 1;
    const serviceCount = appointment.services.length;

    // Find current in-progress service and calculate index
    let currentServiceIndex: number | null = null;
    let currentService: CurrentServiceInfo | null = null;

    const inProgressService = appointment.services.find((s) => s.status === 'in_progress');
    if (inProgressService) {
      // 1-based index
      currentServiceIndex =
        appointment.services.findIndex((s) => s.id === inProgressService.id) + 1;
      currentService = {
        id: inProgressService.id,
        serviceName: inProgressService.serviceName || inProgressService.service.name,
        sequence: inProgressService.sequence,
        status: inProgressService.status,
        assignedStylistId: inProgressService.assignedStylist?.id || null,
        assignedStylistName: inProgressService.assignedStylist?.name || null,
        actualStylistId: inProgressService.actualStylist?.id || null,
        actualStylistName: inProgressService.actualStylist?.name || null,
      };
    } else if (isMultiService) {
      // For multi-service appointments without an in-progress service,
      // find the first waiting service as the "current" one
      const firstWaiting = appointment.services.find((s) => s.status === 'waiting');
      if (firstWaiting) {
        currentServiceIndex = appointment.services.findIndex((s) => s.id === firstWaiting.id) + 1;
      }
    }

    // Calculate progress if appointment has started
    let elapsedMinutes: number | null = null;
    let remainingMinutes: number | null = null;
    let progressPercent: number | null = null;
    let isOvertime = false;
    let estimatedEndTime: string | null = null;

    if (appointment.actualStartTime) {
      elapsedMinutes = Math.floor(
        (now.getTime() - appointment.actualStartTime.getTime()) / (1000 * 60)
      );
      remainingMinutes = Math.max(0, totalDuration - elapsedMinutes);
      progressPercent = Math.min(100, Math.round((elapsedMinutes / totalDuration) * 100));
      isOvertime = elapsedMinutes > totalDuration + OVERTIME_THRESHOLD_MINUTES;

      // Calculate estimated end time
      const endTime = new Date(appointment.actualStartTime.getTime() + totalDuration * 60 * 1000);
      estimatedEndTime = endTime.toISOString();
    }

    return {
      id: appointment.id,
      customerName: formattedName,
      stylistName: appointment.stylist?.name || null,
      assistantNames: [], // TODO: Add assistant support when multi-stylist is implemented
      services: serviceNames,
      startedAt: appointment.actualStartTime?.toISOString() || null,
      estimatedEndTime,
      scheduledTime: appointment.scheduledTime,
      scheduledDate: appointment.scheduledDate.toISOString().split('T')[0], // Format as YYYY-MM-DD
      elapsedMinutes,
      remainingMinutes,
      progressPercent,
      isOvertime,
      // Multi-service fields
      isMultiService,
      serviceCount,
      currentServiceIndex,
      currentService,
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
