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
  runParallel: boolean | null; // Can be null for older records
  status: string;
  durationMinutes: number;
  scheduledStartTime: Date | null;
  scheduledEndTime: Date | null;
  actualStartTime: Date | null;
  actualEndTime: Date | null;
  stationId: string | null;
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

    const stationIds = stations.map((s) => s.id);

    // Query today's appointments that have services on any of these stations
    // This includes appointments where:
    // 1. The appointment itself is assigned to a station (appointment.stationId)
    // 2. OR any service is assigned to a station (service.stationId)
    const todayAppointments = await prisma.appointment.findMany({
      where: {
        tenantId,
        branchId,
        scheduledDate: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: { in: ['checked_in', 'in_progress', 'booked', 'confirmed'] },
        deletedAt: null,
        OR: [
          { stationId: { in: stationIds } },
          { services: { some: { stationId: { in: stationIds } } } },
        ],
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
        scheduledDate: {
          lt: todayStart,
        },
        status: 'in_progress',
        deletedAt: null,
        OR: [
          { stationId: { in: stationIds } },
          { services: { some: { stationId: { in: stationIds } } } },
        ],
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

    // Create a map of station → appointments
    // An appointment appears on a station if:
    // 1. appointment.stationId matches, OR
    // 2. Any service.stationId matches (for multi-service appointments)
    const appointmentsByStationId = new Map<string, AppointmentData[]>();

    for (const appointment of allAppointments) {
      // Add to station based on appointment.stationId
      if (appointment.stationId && stationIds.includes(appointment.stationId)) {
        if (!appointmentsByStationId.has(appointment.stationId)) {
          appointmentsByStationId.set(appointment.stationId, []);
        }
        const existing = appointmentsByStationId.get(appointment.stationId)!;
        if (!existing.some((a) => a.id === appointment.id)) {
          existing.push(appointment);
        }
      }

      // Also add to stations based on service.stationId (for multi-service)
      for (const service of appointment.services) {
        if (service.stationId && stationIds.includes(service.stationId)) {
          if (!appointmentsByStationId.has(service.stationId)) {
            appointmentsByStationId.set(service.stationId, []);
          }
          const existing = appointmentsByStationId.get(service.stationId)!;
          if (!existing.some((a) => a.id === appointment.id)) {
            existing.push(appointment);
          }
        }
      }
    }

    // Process each station to determine status and build card data
    const stationCards: StationCard[] = stations.map((station) => {
      const stationAppointments = appointmentsByStationId.get(station.id) || [];
      const status = this.determineStationStatus(station, stationAppointments, now);
      const appointment = this.getRelevantAppointment(station.id, stationAppointments, status, now);

      // Build "Up Next" information for multi-service appointments
      const upNextServices = this.getUpNextServices(stationAppointments, now);
      const upNext = upNextServices.length > 0 ? upNextServices[0] : null;

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
        appointment: appointment ? this.buildAppointmentCard(station.id, appointment, now) : null,
        upNext,
        upNextServices,
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
   *
   * For multi-service appointments, we check if any service is in_progress
   * on THIS specific station (not just the appointment status).
   *
   * IMPORTANT: A station is occupied if:
   * 1. There's an in_progress service on it, OR
   * 2. There's a completed service on it AND the appointment has waiting services
   *    (customer is still at this station, ready to move to next service)
   *
   * When the next service starts on a DIFFERENT station, the old station becomes available.
   */
  private determineStationStatus(
    station: {
      id: string;
      status: string;
    },
    appointments: AppointmentData[],
    now: Date
  ): FloorViewStatus {
    // Out of service takes precedence
    if (station.status === 'out_of_service') {
      return 'out_of_service';
    }

    // Check for any service in_progress on THIS station
    // This is the PRIMARY check for station occupancy
    const hasInProgressServiceOnStation = appointments.some((apt) =>
      apt.services.some((s) => s.stationId === station.id && s.status === 'in_progress')
    );
    if (hasInProgressServiceOnStation) {
      return 'occupied';
    }

    // Check for completed service on THIS station with waiting services
    // This means the customer just finished a service and is ready for the next one
    // The station remains occupied until the next service starts (possibly on a different station)
    // IMPORTANT: Only show if this is the MOST RECENT station where work was done
    const hasCompletedServiceWithWaiting = appointments.some((apt) => {
      // Must be an in_progress appointment
      if (apt.status !== 'in_progress') {
        return false;
      }
      // Must have a completed service on THIS station
      const completedOnStation = apt.services.filter(
        (s) => s.stationId === station.id && s.status === 'completed'
      );
      if (completedOnStation.length === 0) {
        return false;
      }
      // Must have waiting services (next services to start)
      const hasWaitingServices = apt.services.some((s) => s.status === 'waiting');
      if (!hasWaitingServices) {
        return false;
      }
      // Must NOT have an in_progress service on ANOTHER station
      // (if next service already started elsewhere, this station is free)
      const hasInProgressElsewhere = apt.services.some(
        (s) => s.status === 'in_progress' && s.stationId && s.stationId !== station.id
      );
      if (hasInProgressElsewhere) {
        return false;
      }
      // Must NOT have a completed service on ANOTHER station that was completed AFTER
      // the last completed service on THIS station
      // This handles the case where: Service 1 completed on Station A, Service 2 completed on Station B
      // Station A should be available, Station B should show the appointment
      const lastCompletedOnStation = completedOnStation.reduce((latest, s) => {
        if (!latest) return s;
        const latestEnd = latest.actualEndTime?.getTime() || 0;
        const currentEnd = s.actualEndTime?.getTime() || 0;
        return currentEnd > latestEnd ? s : latest;
      }, completedOnStation[0]);

      const completedElsewhere = apt.services.filter(
        (s) => s.stationId && s.stationId !== station.id && s.status === 'completed'
      );
      if (completedElsewhere.length > 0) {
        const lastCompletedElsewhere = completedElsewhere.reduce((latest, s) => {
          if (!latest) return s;
          const latestEnd = latest.actualEndTime?.getTime() || 0;
          const currentEnd = s.actualEndTime?.getTime() || 0;
          return currentEnd > latestEnd ? s : latest;
        }, completedElsewhere[0]);

        // If there's a more recent completion elsewhere, this station is free
        const thisStationLastEnd = lastCompletedOnStation.actualEndTime?.getTime() || 0;
        const elsewhereLastEnd = lastCompletedElsewhere.actualEndTime?.getTime() || 0;
        if (elsewhereLastEnd > thisStationLastEnd) {
          return false;
        }
      }

      return true;
    });
    if (hasCompletedServiceWithWaiting) {
      return 'occupied';
    }

    // Check for in-progress appointment assigned to this station (legacy/single-service)
    // ONLY if the appointment has NO services with stationId set (truly legacy)
    // OR if it's a single-service appointment
    const inProgressAppointment = appointments.find((apt) => {
      if (apt.status !== 'in_progress' || apt.stationId !== station.id) {
        return false;
      }
      // For multi-service appointments, only consider this station occupied
      // if there's actually an in_progress service here (checked above)
      // If all services have moved to other stations, this station is free
      const hasAnyServiceOnThisStation = apt.services.some((s) => s.stationId === station.id);
      const hasInProgressServiceElsewhere = apt.services.some(
        (s) => s.status === 'in_progress' && s.stationId && s.stationId !== station.id
      );
      // Only occupy if: single-service OR no services have station assigned yet
      // OR there's no in_progress service on another station
      return (
        apt.services.length <= 1 ||
        !hasAnyServiceOnThisStation ||
        (!hasInProgressServiceElsewhere && !apt.services.some((s) => s.stationId))
      );
    });
    if (inProgressAppointment) {
      return 'occupied';
    }

    // Check for checked-in appointment assigned to this station
    // Only if no service has started yet (waiting to be assigned to a station)
    const checkedInAppointment = appointments.find((apt) => {
      if (apt.status !== 'checked_in' || apt.stationId !== station.id) {
        return false;
      }
      // Only occupy if no service has been started on any station yet
      const hasAnyServiceStarted = apt.services.some(
        (s) => s.status === 'in_progress' || s.status === 'completed'
      );
      return !hasAnyServiceStarted;
    });
    if (checkedInAppointment) {
      return 'occupied';
    }

    // Check for upcoming appointment within threshold
    const upcomingAppointment = appointments.find((apt) => {
      if (apt.status !== 'booked' && apt.status !== 'confirmed') {
        return false;
      }
      if (apt.stationId !== station.id) {
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
   *
   * For multi-service appointments, we find the appointment that has
   * services currently running on THIS specific station.
   */
  private getRelevantAppointment(
    stationId: string,
    appointments: AppointmentData[],
    status: FloorViewStatus,
    now: Date
  ): AppointmentData | null {
    if (status === 'available' || status === 'out_of_service') {
      return null;
    }

    if (status === 'occupied') {
      // First, find appointment with in_progress service on THIS station
      const appointmentWithServiceOnStation = appointments.find((apt) =>
        apt.services.some((s) => s.stationId === stationId && s.status === 'in_progress')
      );
      if (appointmentWithServiceOnStation) {
        return appointmentWithServiceOnStation;
      }

      // Second, find appointment with completed service on THIS station AND waiting services
      // (customer just finished a service and is ready for the next one)
      // IMPORTANT: Only show if this is the MOST RECENT station where work was done
      const appointmentWithCompletedAndWaiting = appointments.find((apt) => {
        if (apt.status !== 'in_progress') {
          return false;
        }
        const completedOnStation = apt.services.filter(
          (s) => s.stationId === stationId && s.status === 'completed'
        );
        if (completedOnStation.length === 0) {
          return false;
        }
        const hasWaitingServices = apt.services.some((s) => s.status === 'waiting');
        if (!hasWaitingServices) {
          return false;
        }
        const hasInProgressElsewhere = apt.services.some(
          (s) => s.status === 'in_progress' && s.stationId && s.stationId !== stationId
        );
        if (hasInProgressElsewhere) {
          return false;
        }
        // Check if there's a more recent completion on another station
        const lastCompletedOnStation = completedOnStation.reduce((latest, s) => {
          if (!latest) return s;
          const latestEnd = latest.actualEndTime?.getTime() || 0;
          const currentEnd = s.actualEndTime?.getTime() || 0;
          return currentEnd > latestEnd ? s : latest;
        }, completedOnStation[0]);

        const completedElsewhere = apt.services.filter(
          (s) => s.stationId && s.stationId !== stationId && s.status === 'completed'
        );
        if (completedElsewhere.length > 0) {
          const lastCompletedElsewhere = completedElsewhere.reduce((latest, s) => {
            if (!latest) return s;
            const latestEnd = latest.actualEndTime?.getTime() || 0;
            const currentEnd = s.actualEndTime?.getTime() || 0;
            return currentEnd > latestEnd ? s : latest;
          }, completedElsewhere[0]);

          const thisStationLastEnd = lastCompletedOnStation.actualEndTime?.getTime() || 0;
          const elsewhereLastEnd = lastCompletedElsewhere.actualEndTime?.getTime() || 0;
          if (elsewhereLastEnd > thisStationLastEnd) {
            return false;
          }
        }
        return true;
      });
      if (appointmentWithCompletedAndWaiting) {
        return appointmentWithCompletedAndWaiting;
      }

      // Fallback for legacy/single-service: in-progress appointment assigned to this station
      // Only if no service has started on another station
      const inProgressAppointment = appointments.find((apt) => {
        if (apt.status !== 'in_progress' || apt.stationId !== stationId) {
          return false;
        }
        // Check if this is a multi-service appointment with services on other stations
        const hasInProgressServiceElsewhere = apt.services.some(
          (s) => s.status === 'in_progress' && s.stationId && s.stationId !== stationId
        );
        return !hasInProgressServiceElsewhere;
      });
      if (inProgressAppointment) {
        return inProgressAppointment;
      }

      // Fallback for checked-in: only if no service has started yet
      const checkedInAppointment = appointments.find((apt) => {
        if (apt.status !== 'checked_in' || apt.stationId !== stationId) {
          return false;
        }
        const hasAnyServiceStarted = apt.services.some(
          (s) => s.status === 'in_progress' || s.status === 'completed'
        );
        return !hasAnyServiceStarted;
      });
      return checkedInAppointment || null;
    }

    if (status === 'reserved') {
      // Return the next upcoming appointment assigned to this station
      return (
        appointments.find((apt) => {
          if (apt.status !== 'booked' && apt.status !== 'confirmed') {
            return false;
          }
          if (apt.stationId !== stationId) {
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
   *
   * Returns an array of all parallel services (runParallel: true) that are up next
   */
  private getUpNextServices(appointments: AppointmentData[], now: Date): UpNextService[] {
    // Find in-progress or checked-in appointment
    const activeAppointment =
      appointments.find((apt) => apt.status === 'in_progress') ||
      appointments.find((apt) => apt.status === 'checked_in');

    if (!activeAppointment) {
      return [];
    }

    // Backward compatibility: Don't show "Up Next" for single-service appointments (Requirement 18.4)
    if (activeAppointment.services.length <= 1) {
      return [];
    }

    // Sort services by sequence to ensure correct order
    const sortedServices = [...activeAppointment.services].sort((a, b) => a.sequence - b.sequence);

    // Find the current in-progress services (could be multiple parallel services)
    const currentInProgressServices = sortedServices.filter((s) => s.status === 'in_progress');
    const maxInProgressSequence =
      currentInProgressServices.length > 0
        ? Math.max(...currentInProgressServices.map((s) => s.sequence))
        : 0;

    // Find the last completed service (for calculating estimated start time after completion)
    const completedServices = sortedServices.filter((s) => s.status === 'completed');
    const lastCompletedService =
      completedServices.length > 0 ? completedServices[completedServices.length - 1] : null;

    // Find the next waiting services
    // Group by runParallel flag: services with runParallel: true run with the previous service
    let nextServices: AppointmentServiceData[] = [];

    if (currentInProgressServices.length > 0) {
      // Find all waiting services after current in-progress
      const waitingServices = sortedServices.filter(
        (s) => s.sequence > maxInProgressSequence && s.status === 'waiting'
      );
      if (waitingServices.length > 0) {
        // Get the first waiting service and all subsequent services with runParallel: true
        const firstWaiting = waitingServices[0];
        nextServices = [firstWaiting];

        // Add all subsequent services that have runParallel: true
        for (let i = 1; i < waitingServices.length; i++) {
          if (waitingServices[i].runParallel) {
            nextServices.push(waitingServices[i]);
          } else {
            break; // Stop at first non-parallel service
          }
        }
      }
    } else {
      // No service in progress - find the first waiting services
      // This happens after completing a service but before starting the next one
      const waitingServices = sortedServices.filter((s) => s.status === 'waiting');
      if (waitingServices.length > 0) {
        // Get the first waiting service and all subsequent services with runParallel: true
        const firstWaiting = waitingServices[0];
        nextServices = [firstWaiting];

        // Add all subsequent services that have runParallel: true
        for (let i = 1; i < waitingServices.length; i++) {
          if (waitingServices[i].runParallel) {
            nextServices.push(waitingServices[i]);
          } else {
            break; // Stop at first non-parallel service
          }
        }
      }
    }

    if (nextServices.length === 0) {
      return [];
    }

    // Calculate estimated start time
    let estimatedStartTime: string | null = null;

    if (currentInProgressServices.length > 0) {
      // Find the service that will end last among current in-progress services
      let latestEndTime: Date | null = null;
      for (const service of currentInProgressServices) {
        if (service.actualStartTime) {
          const duration = service.durationMinutes || service.service.durationMinutes;
          const endTime = new Date(service.actualStartTime.getTime() + duration * 60 * 1000);
          if (!latestEndTime || endTime > latestEndTime) {
            latestEndTime = endTime;
          }
        }
      }
      if (latestEndTime) {
        estimatedStartTime = latestEndTime.toISOString();
      }
    } else if (lastCompletedService && lastCompletedService.actualEndTime) {
      // Previous service just completed - next service can start now
      estimatedStartTime = now.toISOString();
    }

    const customerName =
      activeAppointment.customer?.name || activeAppointment.customerName || 'Guest';
    const formattedCustomerName = this.formatCustomerName(customerName);

    // Build UpNextService for each parallel service
    return nextServices.map((service) => ({
      id: service.id,
      serviceName: service.serviceName || service.service.name,
      customerName: formattedCustomerName,
      assignedStylistId: service.assignedStylist?.id || null,
      assignedStylistName: service.assignedStylist?.name || null,
      estimatedStartTime: estimatedStartTime || service.scheduledStartTime?.toISOString() || null,
      durationMinutes: service.durationMinutes || service.service.durationMinutes,
      sequence: service.sequence,
    }));
  }

  /**
   * Build appointment card data with progress calculations and multi-service support
   *
   * @param stationId - The station ID to filter services for (for parallel services on same station)
   */
  private buildAppointmentCard(
    stationId: string,
    appointment: AppointmentData,
    now: Date
  ): StationCard['appointment'] {
    const customerName = appointment.customer?.name || appointment.customerName || 'Guest';

    // Format customer name (first name + last initial)
    const formattedName = this.formatCustomerName(customerName);

    // Sort services by sequence
    const sortedServices = [...appointment.services].sort((a, b) => a.sequence - b.sequence);

    const serviceNames = sortedServices.map((s) => s.serviceName || s.service.name);
    const totalDuration =
      appointment.totalDuration ||
      sortedServices.reduce((sum, s) => sum + (s.durationMinutes || s.service.durationMinutes), 0);

    // Multi-service fields
    const isMultiService = sortedServices.length > 1;
    const serviceCount = sortedServices.length;

    // Find ALL in-progress services on THIS station (for parallel services)
    const inProgressServicesOnStation = sortedServices.filter(
      (s) => s.status === 'in_progress' && s.stationId === stationId
    );

    // Build currentServices array
    // This includes:
    // 1. All in-progress services on this station (for parallel services)
    // 2. OR the last completed service on this station if there are waiting services (between services state)
    let currentServices: CurrentServiceInfo[] = [];
    let isPaused = false; // Timer is paused when between services

    if (inProgressServicesOnStation.length > 0) {
      // Case 1: Services are in progress on this station
      currentServices = inProgressServicesOnStation.map((s) => ({
        id: s.id,
        serviceName: s.serviceName || s.service.name,
        sequence: s.sequence,
        status: s.status,
        assignedStylistId: s.assignedStylist?.id || null,
        assignedStylistName: s.assignedStylist?.name || null,
        actualStylistId: s.actualStylist?.id || null,
        actualStylistName: s.actualStylist?.name || null,
        durationMinutes: s.durationMinutes || s.service.durationMinutes,
        actualStartTime: s.actualStartTime?.toISOString() || null,
        actualEndTime: s.actualEndTime?.toISOString() || null,
      }));
    } else if (isMultiService) {
      // Case 2: No in-progress services on this station
      // Check if we're "between services" (completed service on this station + waiting services)
      const completedServicesOnStation = sortedServices.filter(
        (s) => s.status === 'completed' && s.stationId === stationId
      );
      const waitingServices = sortedServices.filter((s) => s.status === 'waiting');

      if (completedServicesOnStation.length > 0 && waitingServices.length > 0) {
        // We're between services - show the last completed service and pause timer
        isPaused = true;
        const lastCompleted = completedServicesOnStation[completedServicesOnStation.length - 1];
        currentServices = [
          {
            id: lastCompleted.id,
            serviceName: lastCompleted.serviceName || lastCompleted.service.name,
            sequence: lastCompleted.sequence,
            status: lastCompleted.status, // 'completed'
            assignedStylistId: lastCompleted.assignedStylist?.id || null,
            assignedStylistName: lastCompleted.assignedStylist?.name || null,
            actualStylistId: lastCompleted.actualStylist?.id || null,
            actualStylistName: lastCompleted.actualStylist?.name || null,
            durationMinutes: lastCompleted.durationMinutes || lastCompleted.service.durationMinutes,
            actualStartTime: lastCompleted.actualStartTime?.toISOString() || null,
            actualEndTime: lastCompleted.actualEndTime?.toISOString() || null,
          },
        ];
      }
    }

    // For backward compatibility, also set currentService (first service in currentServices)
    let currentServiceIndex: number | null = null;
    let currentService: CurrentServiceInfo | null = null;

    if (currentServices.length > 0) {
      const firstService = currentServices[0];
      currentServiceIndex = sortedServices.findIndex((s) => s.id === firstService.id) + 1;
      currentService = firstService;
    } else if (isMultiService) {
      // Fallback: No in-progress or completed services on this station
      // Check if there are waiting services to show
      const waitingServices = sortedServices.filter((s) => s.status === 'waiting');

      if (waitingServices.length > 0) {
        // Find the first waiting service as the "current" one
        const firstWaiting = waitingServices[0];
        currentServiceIndex = sortedServices.findIndex((s) => s.id === firstWaiting.id) + 1;
        currentService = {
          id: firstWaiting.id,
          serviceName: firstWaiting.serviceName || firstWaiting.service.name,
          sequence: firstWaiting.sequence,
          status: firstWaiting.status,
          assignedStylistId: firstWaiting.assignedStylist?.id || null,
          assignedStylistName: firstWaiting.assignedStylist?.name || null,
          actualStylistId: firstWaiting.actualStylist?.id || null,
          actualStylistName: firstWaiting.actualStylist?.name || null,
          durationMinutes: firstWaiting.durationMinutes || firstWaiting.service.durationMinutes,
          actualStartTime: firstWaiting.actualStartTime?.toISOString() || null,
          actualEndTime: firstWaiting.actualEndTime?.toISOString() || null,
        };
      }
    }

    // Build serviceProgress array for multi-service progress bar
    const serviceProgress = sortedServices.map((s) => {
      const serviceDuration = s.durationMinutes || s.service.durationMinutes;
      let serviceElapsed = 0;
      let serviceProgress = 0;
      let serviceIsOvertime = false;

      if (s.status === 'completed') {
        // Completed service - 100% progress
        serviceProgress = 100;
        if (s.actualStartTime && s.actualEndTime) {
          serviceElapsed = Math.floor(
            (s.actualEndTime.getTime() - s.actualStartTime.getTime()) / (1000 * 60)
          );
          serviceIsOvertime = serviceElapsed > serviceDuration + OVERTIME_THRESHOLD_MINUTES;
        } else {
          serviceElapsed = serviceDuration;
        }
      } else if (s.status === 'in_progress' && s.actualStartTime) {
        // In-progress service - calculate based on actual start time
        serviceElapsed = Math.floor((now.getTime() - s.actualStartTime.getTime()) / (1000 * 60));
        serviceProgress = Math.min(100, Math.round((serviceElapsed / serviceDuration) * 100));
        serviceIsOvertime = serviceElapsed > serviceDuration + OVERTIME_THRESHOLD_MINUTES;
      } else if (s.status === 'skipped') {
        // Skipped service - 100% progress (but will be shown differently in UI)
        serviceProgress = 100;
        serviceElapsed = 0;
      }
      // Waiting services have 0 progress

      return {
        id: s.id,
        serviceName: s.serviceName || s.service.name,
        sequence: s.sequence,
        status: s.status as 'waiting' | 'in_progress' | 'completed' | 'skipped',
        durationMinutes: serviceDuration,
        actualStartTime: s.actualStartTime?.toISOString() || null,
        actualEndTime: s.actualEndTime?.toISOString() || null,
        progressPercent: serviceProgress,
        elapsedMinutes: serviceElapsed,
        isOvertime: serviceIsOvertime,
        // Stylist info for tooltip
        assignedStylistName: s.assignedStylist?.name || null,
        actualStylistName: s.actualStylist?.name || null,
      };
    });

    // Calculate progress if appointment has started
    let elapsedMinutes: number | null = null;
    let remainingMinutes: number | null = null;
    let progressPercent: number | null = null;
    let isOvertime = false;
    let estimatedEndTime: string | null = null;
    let delayMinutes = 0;

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

      // Calculate delay (how late the appointment started)
      const scheduledStart = this.parseScheduledTime(
        appointment.scheduledTime,
        appointment.scheduledDate
      );
      delayMinutes = Math.max(
        0,
        Math.floor((appointment.actualStartTime.getTime() - scheduledStart.getTime()) / (1000 * 60))
      );
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
      delayMinutes,
      elapsedMinutes,
      remainingMinutes,
      progressPercent,
      isOvertime,
      // Multi-service fields
      isMultiService,
      serviceCount,
      currentServiceIndex,
      currentService,
      currentServices, // All in-progress services on this station (for parallel services)
      isPaused, // Timer is paused when between services
      serviceProgress, // Progress info for each service
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
