/**
 * Multi-Service Appointment Service
 *
 * Handles validation and operations specific to multi-service appointments:
 * - Per-service stylist availability validation
 * - Station availability validation
 * - Sequential prerequisite enforcement
 * - Service execution (start, complete, skip)
 */

import { PrismaClient } from '@prisma/client';
import { BadRequestError, ConflictError, NotFoundError } from '../../lib/errors';
import {
  deriveAppointmentStatus,
  validateServiceStatusTransition,
  canStartService,
  type ServiceForStylistValidation,
  type StylistAvailabilityResult,
  type StylistConflict,
  type StationAvailabilityResult,
  timeRangesOverlap,
  dateToTimeString,
} from './multi-service.utils';

/**
 * Get day of week from a Date (0 = Sunday, 6 = Saturday)
 */
function getDayOfWeek(date: Date): number {
  return date.getUTCDay();
}

export class MultiServiceAppointmentService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Validate stylist availability for each service in a multi-service appointment
   *
   * Property 6: For any service with an assignedStylistId, the system SHALL reject
   * the booking if the stylist has a conflicting appointment or blocked slot during
   * the service's scheduled time.
   *
   * @param tenantId - Tenant ID
   * @param services - Array of services with stylist assignments and scheduled times
   * @param excludeAppointmentId - Optional appointment ID to exclude from conflict check (for updates)
   * @returns Validation result with any conflicts found
   */
  async validateStylistAvailability(
    tenantId: string,
    services: ServiceForStylistValidation[],
    excludeAppointmentId?: string
  ): Promise<StylistAvailabilityResult> {
    const conflicts: StylistConflict[] = [];

    for (const service of services) {
      // Skip services without assigned stylist (allowed per requirement 2.3)
      if (!service.assignedStylistId) {
        continue;
      }

      const serviceConflicts = await this.checkStylistConflicts(
        tenantId,
        service.assignedStylistId,
        service.scheduledStartTime,
        service.scheduledEndTime,
        excludeAppointmentId
      );

      for (const conflict of serviceConflicts) {
        conflicts.push({
          serviceId: service.serviceId,
          serviceName: service.serviceName,
          stylistId: service.assignedStylistId,
          scheduledStartTime: service.scheduledStartTime,
          scheduledEndTime: service.scheduledEndTime,
          conflictType: conflict.type,
          conflictDetails: conflict.details,
        });
      }
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
    };
  }

  /**
   * Check for conflicts for a specific stylist during a time window
   */
  private async checkStylistConflicts(
    tenantId: string,
    stylistId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string
  ): Promise<{ type: 'appointment' | 'blocked_slot' | 'break'; details: string }[]> {
    const conflicts: { type: 'appointment' | 'blocked_slot' | 'break'; details: string }[] = [];

    // Get the date for the scheduled time
    const scheduledDate = new Date(
      Date.UTC(startTime.getUTCFullYear(), startTime.getUTCMonth(), startTime.getUTCDate())
    );

    const startTimeStr = dateToTimeString(startTime);
    const endTimeStr = dateToTimeString(endTime);

    // 1. Check for conflicting appointments
    const existingAppointments = await this.prisma.appointment.findMany({
      where: {
        tenantId,
        stylistId,
        scheduledDate,
        status: { notIn: ['cancelled', 'no_show', 'rescheduled'] },
        deletedAt: null,
        ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
      },
      select: {
        id: true,
        scheduledTime: true,
        scheduledEndTime: true,
        customerName: true,
      },
    });

    for (const apt of existingAppointments) {
      if (timeRangesOverlap(startTimeStr, endTimeStr, apt.scheduledTime, apt.scheduledEndTime)) {
        conflicts.push({
          type: 'appointment',
          details: `Conflicting appointment with ${apt.customerName || 'customer'} at ${apt.scheduledTime}-${apt.scheduledEndTime}`,
        });
      }
    }

    // 2. Check for blocked slots
    const blockedSlots = await this.prisma.stylistBlockedSlot.findMany({
      where: {
        tenantId,
        stylistId,
        blockedDate: scheduledDate,
      },
    });

    for (const block of blockedSlots) {
      if (block.isFullDay) {
        conflicts.push({
          type: 'blocked_slot',
          details: `Stylist is blocked for the entire day: ${block.reason || 'No reason provided'}`,
        });
      } else if (block.startTime && block.endTime) {
        if (timeRangesOverlap(startTimeStr, endTimeStr, block.startTime, block.endTime)) {
          conflicts.push({
            type: 'blocked_slot',
            details: `Stylist is blocked from ${block.startTime} to ${block.endTime}: ${block.reason || 'No reason provided'}`,
          });
        }
      }
    }

    // 3. Check for breaks
    const dayOfWeek = getDayOfWeek(scheduledDate);
    const breaks = await this.prisma.stylistBreak.findMany({
      where: {
        tenantId,
        stylistId,
        isActive: true,
        OR: [{ dayOfWeek: null }, { dayOfWeek }],
      },
    });

    for (const brk of breaks) {
      if (timeRangesOverlap(startTimeStr, endTimeStr, brk.startTime, brk.endTime)) {
        conflicts.push({
          type: 'break',
          details: `Stylist has a break (${brk.name}) from ${brk.startTime} to ${brk.endTime}`,
        });
      }
    }

    return conflicts;
  }

  /**
   * Validate station availability for starting a service
   *
   * Property 8: For any attempt to start a service at a station, the system SHALL
   * reject the request if the station has another service with status "in_progress".
   *
   * @param tenantId - Tenant ID
   * @param stationId - Station ID to check
   * @param excludeServiceId - Optional service ID to exclude (for the service being started)
   * @returns Availability result
   */
  async validateStationAvailability(
    tenantId: string,
    stationId: string,
    excludeServiceId?: string
  ): Promise<StationAvailabilityResult> {
    // Check if station exists and is active
    const station = await this.prisma.station.findFirst({
      where: {
        id: stationId,
        tenantId,
        status: 'active',
        deletedAt: null,
      },
    });

    if (!station) {
      return {
        isAvailable: false,
        errorCode: 'STATION_NOT_FOUND',
        errorMessage: 'Station not found or is out of service',
      };
    }

    // Check for services currently in progress at this station
    const occupyingService = await this.prisma.appointmentService.findFirst({
      where: {
        tenantId,
        stationId,
        status: 'in_progress',
        ...(excludeServiceId ? { id: { not: excludeServiceId } } : {}),
      },
      select: {
        id: true,
        serviceName: true,
        appointment: {
          select: {
            customerName: true,
          },
        },
      },
    });

    if (occupyingService) {
      return {
        isAvailable: false,
        errorCode: 'STATION_OCCUPIED',
        errorMessage: `Station is currently occupied by ${occupyingService.serviceName} for ${occupyingService.appointment.customerName || 'a customer'}`,
        occupyingServiceId: occupyingService.id,
      };
    }

    return { isAvailable: true };
  }

  /**
   * Start a service within a multi-service appointment
   *
   * @param tenantId - Tenant ID
   * @param appointmentId - Appointment ID
   * @param serviceId - Service ID to start
   * @param stationId - Station to use
   * @param actualStylistId - Optional override stylist (if different from assigned)
   * @param userId - User performing the action
   * @returns Updated service and appointment
   */
  async startService(
    tenantId: string,
    appointmentId: string,
    serviceId: string,
    stationId: string,
    actualStylistId: string | undefined,
    userId: string
  ) {
    // 1. Get the appointment and all its services
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId,
        deletedAt: null,
      },
      include: {
        services: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundError('APPOINTMENT_NOT_FOUND', 'Appointment not found');
    }

    // 2. Find the service to start
    const serviceToStart = appointment.services.find((s) => s.id === serviceId);
    if (!serviceToStart) {
      throw new NotFoundError('SERVICE_NOT_FOUND', 'Service not found in this appointment');
    }

    // 3. Validate status transition
    const transitionResult = validateServiceStatusTransition(serviceToStart.status, 'in_progress');
    if (!transitionResult.isValid) {
      throw new BadRequestError(
        transitionResult.errorCode || 'INVALID_STATUS_TRANSITION',
        transitionResult.errorMessage || 'Cannot start service in current status'
      );
    }

    // 4. Validate sequential prerequisites (Property 24)
    const prerequisiteResult = canStartService(serviceToStart, appointment.services);
    if (!prerequisiteResult.canStart) {
      throw new BadRequestError(
        prerequisiteResult.errorCode || 'PREREQUISITE_NOT_COMPLETE',
        prerequisiteResult.errorMessage || 'Previous services must be completed first'
      );
    }

    // 5. Validate station availability (Property 8)
    const stationResult = await this.validateStationAvailability(tenantId, stationId);
    if (!stationResult.isAvailable) {
      throw new ConflictError(
        stationResult.errorCode || 'STATION_OCCUPIED',
        stationResult.errorMessage || 'Station is not available'
      );
    }

    // 6. Determine the actual stylist
    const resolvedStylistId = actualStylistId || serviceToStart.assignedStylistId;
    const stylistOverride =
      actualStylistId != null && actualStylistId !== serviceToStart.assignedStylistId;

    // 7. Update service and appointment in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update the service
      const updatedService = await tx.appointmentService.update({
        where: { id: serviceId },
        data: {
          status: 'in_progress',
          stationId,
          actualStylistId: resolvedStylistId,
          actualStartTime: new Date(),
        },
        include: {
          service: { select: { id: true, name: true, sku: true } },
          assignedStylist: { select: { id: true, name: true } },
          actualStylist: { select: { id: true, name: true } },
          station: {
            include: { stationType: { select: { id: true, name: true, color: true } } },
          },
        },
      });

      // Get all services to derive appointment status
      const allServices = await tx.appointmentService.findMany({
        where: { appointmentId },
      });

      // Derive new appointment status
      const derivedStatus = deriveAppointmentStatus(
        allServices,
        appointment.checkedInAt != null,
        appointment.status
      );

      // Update appointment status if changed
      let updatedAppointment = appointment;
      if (derivedStatus !== appointment.status) {
        updatedAppointment = await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            status: derivedStatus,
            actualStartTime: appointment.actualStartTime || new Date(),
          },
          include: {
            services: {
              include: {
                service: { select: { id: true, name: true, sku: true } },
                assignedStylist: { select: { id: true, name: true } },
                actualStylist: { select: { id: true, name: true } },
                station: {
                  include: { stationType: { select: { id: true, name: true, color: true } } },
                },
              },
            },
            customer: { select: { id: true, name: true, phone: true } },
            branch: { select: { id: true, name: true } },
          },
        });

        // Create status history
        await tx.appointmentStatusHistory.create({
          data: {
            tenantId,
            appointmentId,
            fromStatus: appointment.status,
            toStatus: derivedStatus,
            changedBy: userId,
            notes: `Service "${serviceToStart.serviceName}" started`,
          },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          branchId: appointment.branchId,
          userId,
          action: 'SERVICE_STARTED',
          entityType: 'appointment_service',
          entityId: serviceId,
          newValues: {
            status: 'in_progress',
            stationId,
            actualStylistId: resolvedStylistId,
            stylistOverride,
          },
        },
      });

      return {
        service: updatedService,
        appointment: updatedAppointment,
        stylistOverride,
      };
    });

    return result;
  }

  /**
   * Complete a service within a multi-service appointment
   *
   * @param tenantId - Tenant ID
   * @param appointmentId - Appointment ID
   * @param serviceId - Service ID to complete
   * @param actualEndTime - Optional end time (defaults to now)
   * @param userId - User performing the action
   * @returns Updated service, appointment, and next service info
   */
  async completeService(
    tenantId: string,
    appointmentId: string,
    serviceId: string,
    actualEndTime: Date | undefined,
    userId: string
  ) {
    // 1. Get the appointment and all its services
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId,
        deletedAt: null,
      },
      include: {
        services: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundError('APPOINTMENT_NOT_FOUND', 'Appointment not found');
    }

    // 2. Find the service to complete
    const serviceToComplete = appointment.services.find((s) => s.id === serviceId);
    if (!serviceToComplete) {
      throw new NotFoundError('SERVICE_NOT_FOUND', 'Service not found in this appointment');
    }

    // 3. Validate status transition
    const transitionResult = validateServiceStatusTransition(serviceToComplete.status, 'completed');
    if (!transitionResult.isValid) {
      throw new BadRequestError(
        transitionResult.errorCode || 'INVALID_STATUS_TRANSITION',
        transitionResult.errorMessage || 'Cannot complete service in current status'
      );
    }

    // 4. Update service and appointment in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update the service (Property 9: release station on completion)
      const updatedService = await tx.appointmentService.update({
        where: { id: serviceId },
        data: {
          status: 'completed',
          actualEndTime: actualEndTime || new Date(),
          // Note: We keep stationId for historical tracking, but the station is now available
        },
        include: {
          service: { select: { id: true, name: true, sku: true } },
          assignedStylist: { select: { id: true, name: true } },
          actualStylist: { select: { id: true, name: true } },
          station: {
            include: { stationType: { select: { id: true, name: true, color: true } } },
          },
        },
      });

      // Get all services to derive appointment status
      const allServices = await tx.appointmentService.findMany({
        where: { appointmentId },
      });

      // Derive new appointment status
      const derivedStatus = deriveAppointmentStatus(
        allServices,
        appointment.checkedInAt != null,
        appointment.status
      );

      // Check if all services are complete
      const allServicesComplete = allServices.every(
        (s) => s.status === 'completed' || s.status === 'skipped'
      );

      // Find next service in sequence
      const nextService = appointment.services.find(
        (s) => s.sequence > serviceToComplete.sequence && s.status === 'waiting'
      );

      // Update appointment status if changed
      let updatedAppointment = appointment;
      if (derivedStatus !== appointment.status) {
        updatedAppointment = await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            status: derivedStatus,
            actualEndTime: allServicesComplete ? actualEndTime || new Date() : undefined,
          },
          include: {
            services: {
              include: {
                service: { select: { id: true, name: true, sku: true } },
                assignedStylist: { select: { id: true, name: true } },
                actualStylist: { select: { id: true, name: true } },
                station: {
                  include: { stationType: { select: { id: true, name: true, color: true } } },
                },
              },
            },
            customer: { select: { id: true, name: true, phone: true } },
            branch: { select: { id: true, name: true } },
          },
        });

        // Create status history
        await tx.appointmentStatusHistory.create({
          data: {
            tenantId,
            appointmentId,
            fromStatus: appointment.status,
            toStatus: derivedStatus,
            changedBy: userId,
            notes: `Service "${serviceToComplete.serviceName}" completed`,
          },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          branchId: appointment.branchId,
          userId,
          action: 'SERVICE_COMPLETED',
          entityType: 'appointment_service',
          entityId: serviceId,
          newValues: {
            status: 'completed',
            actualEndTime: actualEndTime || new Date(),
          },
        },
      });

      return {
        service: updatedService,
        appointment: updatedAppointment,
        nextService: nextService
          ? {
              id: nextService.id,
              serviceName: nextService.serviceName,
              sequence: nextService.sequence,
              assignedStylistId: nextService.assignedStylistId,
              durationMinutes: nextService.durationMinutes,
            }
          : undefined,
        allServicesComplete,
      };
    });

    return result;
  }

  /**
   * Skip a service within a multi-service appointment
   *
   * Property 20: Skipping a service shall not affect other services
   *
   * @param tenantId - Tenant ID
   * @param appointmentId - Appointment ID
   * @param serviceId - Service ID to skip
   * @param reason - Optional reason for skipping
   * @param userId - User performing the action
   * @returns Updated service and appointment
   */
  async skipService(
    tenantId: string,
    appointmentId: string,
    serviceId: string,
    reason: string | undefined,
    userId: string
  ) {
    // 1. Get the appointment and all its services
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id: appointmentId,
        tenantId,
        deletedAt: null,
      },
      include: {
        services: {
          orderBy: { sequence: 'asc' },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundError('APPOINTMENT_NOT_FOUND', 'Appointment not found');
    }

    // 2. Find the service to skip
    const serviceToSkip = appointment.services.find((s) => s.id === serviceId);
    if (!serviceToSkip) {
      throw new NotFoundError('SERVICE_NOT_FOUND', 'Service not found in this appointment');
    }

    // 3. Validate status transition
    const transitionResult = validateServiceStatusTransition(serviceToSkip.status, 'skipped');
    if (!transitionResult.isValid) {
      throw new BadRequestError(
        transitionResult.errorCode || 'INVALID_STATUS_TRANSITION',
        transitionResult.errorMessage || 'Cannot skip service in current status'
      );
    }

    // 4. Update service and appointment in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // Update the service
      const updatedService = await tx.appointmentService.update({
        where: { id: serviceId },
        data: {
          status: 'skipped',
        },
        include: {
          service: { select: { id: true, name: true, sku: true } },
          assignedStylist: { select: { id: true, name: true } },
          actualStylist: { select: { id: true, name: true } },
          station: {
            include: { stationType: { select: { id: true, name: true, color: true } } },
          },
        },
      });

      // Get all services to derive appointment status
      const allServices = await tx.appointmentService.findMany({
        where: { appointmentId },
      });

      // Derive new appointment status
      const derivedStatus = deriveAppointmentStatus(
        allServices,
        appointment.checkedInAt != null,
        appointment.status
      );

      // Update appointment status if changed
      let updatedAppointment = appointment;
      if (derivedStatus !== appointment.status) {
        updatedAppointment = await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            status: derivedStatus,
          },
          include: {
            services: {
              include: {
                service: { select: { id: true, name: true, sku: true } },
                assignedStylist: { select: { id: true, name: true } },
                actualStylist: { select: { id: true, name: true } },
                station: {
                  include: { stationType: { select: { id: true, name: true, color: true } } },
                },
              },
            },
            customer: { select: { id: true, name: true, phone: true } },
            branch: { select: { id: true, name: true } },
          },
        });

        // Create status history
        await tx.appointmentStatusHistory.create({
          data: {
            tenantId,
            appointmentId,
            fromStatus: appointment.status,
            toStatus: derivedStatus,
            changedBy: userId,
            notes: `Service "${serviceToSkip.serviceName}" skipped${reason ? `: ${reason}` : ''}`,
          },
        });
      }

      // Create audit log
      await tx.auditLog.create({
        data: {
          tenantId,
          branchId: appointment.branchId,
          userId,
          action: 'SERVICE_SKIPPED',
          entityType: 'appointment_service',
          entityId: serviceId,
          newValues: {
            status: 'skipped',
            reason,
          },
        },
      });

      return {
        service: updatedService,
        appointment: updatedAppointment,
      };
    });

    return result;
  }
}
