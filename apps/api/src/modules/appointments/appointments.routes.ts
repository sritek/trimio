/**
 * Appointments Routes
 * API route definitions for appointment management using Zod type provider
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { AvailabilityService } from './availability.service';
import { StylistScheduleService } from './stylist-schedule.service';
import { WalkInQueueService } from './walk-in-queue.service';
import { authenticate } from '../../middleware/auth.middleware';
import { requirePermission, requireAnyPermission } from '../../middleware/permission.guard';
import { deleteResponse, successResponse } from '../../lib/response';
import { prisma } from '../../lib/prisma';

import {
  // Input schemas
  listAppointmentsSchema,
  getCalendarSchema,
  getAvailableSlotsSchema,
  getAvailableStylistsSchema,
  getStylistBusySlotsSchema,
  createWithConflictsSchema,
  updateAppointmentSchema,
  updateStatusSchema,
  updateServicesSchema,
  cancelAppointmentSchema,
  rescheduleAppointmentSchema,
  createStylistBreakSchema,
  createBlockedSlotSchema,
  getStylistScheduleSchema,
  listUnassignedQuerySchema,
  assignStylistSchema,
  assignStationSchema,
  addServiceSchema,
  updateStylistsSchema,
  // Walk-in queue schemas
  addToQueueSchema,
  getQueueSchema,
  serveQueueBodySchema,
  // Response schemas
  successResponseSchema,
  paginatedResponseSchema,
  messageResponseSchema,
  errorResponseSchema,
  // Param schemas
  idParamSchema,
  stylistIdParamSchema,
  stylistBreakParamsSchema,
  stylistSlotParamsSchema,
  UpdateAppointmentInput,
  CreateAppointmentInput,
  GetAvailableSlotsInput,
  GetCalendarInput,
  // Multi-service schemas
  serviceParamsSchema,
  startServiceSchema,
  completeServiceSchema,
  skipServiceSchema,
  updateServiceSchema,
  type StartServiceInput,
  type CompleteServiceInput,
  type SkipServiceInput,
  type UpdateServiceInput,
} from './appointments.schema';
import { MultiServiceAppointmentService } from './multi-service.service';

export async function appointmentsRoutes(fastify: FastifyInstance) {
  const appointmentsService = new AppointmentsService(prisma);
  const availabilityService = new AvailabilityService(prisma);
  const stylistScheduleService = new StylistScheduleService(prisma);
  const walkInQueueService = new WalkInQueueService(prisma, appointmentsService);
  const multiServiceService = new MultiServiceAppointmentService(prisma);
  const controller = new AppointmentsController(appointmentsService, availabilityService);

  // Cast to ZodTypeProvider for type inference
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // Apply auth middleware to all routes
  app.addHook('preHandler', authenticate);

  // =====================================================
  // APPOINTMENT CRUD
  // =====================================================

  app.get(
    '/',
    {
      preHandler: [requireAnyPermission(['appointments:read', 'appointments:read:own'])],
      schema: {
        tags: ['Appointments'],
        summary: 'List appointments',
        description: 'Get a paginated list of appointments with optional filters.',
        querystring: listAppointmentsSchema,
        response: {
          200: paginatedResponseSchema,
          401: errorResponseSchema,
          403: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId, role } = request.user!;
      const query = { ...request.query };

      // Enforce own-data scoping for stylist role
      if (role === 'stylist') {
        query.stylistId = userId;
      }

      const result = await appointmentsService.getAppointments(tenantId, query);
      return reply.send({ success: true, ...result });
    }
  );

  app.get(
    '/calendar',
    {
      preHandler: [requirePermission('appointments:read')],
      schema: {
        tags: ['Appointments'],
        summary: 'Get calendar view',
        description: 'Get appointments in calendar format.',
        querystring: getCalendarSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest<{ Querystring: GetCalendarInput }>, reply) => {
      return controller.getCalendar(request, reply);
    }
  );

  app.get(
    '/availability/slots',
    {
      preHandler: [requirePermission('appointments:read')],
      schema: {
        tags: ['Availability'],
        summary: 'Get available time slots',
        description: 'Get available time slots for booking.',
        querystring: getAvailableSlotsSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest<{ Querystring: GetAvailableSlotsInput }>, reply) => {
      return controller.getAvailableSlots(request, reply);
    }
  );

  app.get(
    '/availability/stylists',
    {
      preHandler: [requirePermission('appointments:read')],
      schema: {
        tags: ['Availability'],
        summary: 'Get available stylists for a time slot',
        description: 'Get list of stylists available for a specific time slot.',
        querystring: getAvailableStylistsSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (
      request: FastifyRequest<{
        Querystring: {
          branchId: string;
          date: string;
          time: string;
          duration: number;
          genderPreference?: string;
        };
      }>,
      reply
    ) => {
      return controller.getAvailableStylists(request, reply);
    }
  );

  app.get(
    '/stylists/:stylistId/busy-slots',
    {
      preHandler: [requirePermission('appointments:read')],
      schema: {
        tags: ['Availability'],
        summary: 'Get stylist busy slots for a date',
        description:
          'Get all time slots where the stylist is unavailable (appointments, breaks, blocked).',
        params: stylistIdParamSchema,
        querystring: getStylistBusySlotsSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId } = request.user!;
      const { stylistId } = request.params;
      const { branchId, date } = request.query;
      const result = await availabilityService.getStylistBusySlots(
        tenantId,
        stylistId,
        branchId,
        date
      );
      return reply.send({ success: true, data: result });
    }
  );

  app.post(
    '/check-conflicts',
    {
      preHandler: [requirePermission('appointments:read')],
      schema: {
        tags: ['Availability'],
        summary: 'Check for appointment conflicts',
        description: 'Check if there are any conflicting appointments for the given time slot.',
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (
      request: FastifyRequest<{
        Body: {
          branchId: string;
          scheduledDate: string;
          scheduledTime: string;
          serviceIds: string[];
          stylistId?: string;
        };
      }>,
      reply
    ) => {
      return controller.checkConflicts(request, reply);
    }
  );

  app.get(
    '/:id',
    {
      preHandler: [requirePermission('appointments:read')],
      schema: {
        tags: ['Appointments'],
        summary: 'Get appointment by ID',
        description: 'Get detailed information about a specific appointment.',
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      return controller.getById(request, reply);
    }
  );

  app.post(
    '/',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Appointments'],
        summary: 'Create a new appointment',
        description: 'Create a new appointment. Prices are locked at booking time.',
        body: createWithConflictsSchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          403: errorResponseSchema,
          409: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (
      request: FastifyRequest<{
        Body: CreateAppointmentInput & {
          forceOverride?: boolean;
          overrideReason?: string;
          conflictActions?: { appointmentId: string; action: 'keep' | 'cancel' }[];
        };
      }>,
      reply
    ) => {
      return controller.create(request, reply);
    }
  );

  app.patch(
    '/:id',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Appointments'],
        summary: 'Update an appointment',
        description: 'Update appointment details.',
        params: idParamSchema,
        body: updateAppointmentSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (
      request: FastifyRequest<{ Params: { id: string }; Body: UpdateAppointmentInput }>,
      reply
    ) => {
      return controller.update(request, reply);
    }
  );

  app.patch(
    '/:id/status',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Appointments'],
        summary: 'Update appointment status',
        description: 'Update appointment status with validation of allowed transitions.',
        params: idParamSchema,
        body: updateStatusSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user!;
      const { id } = request.params;
      const { status } = request.body;
      const result = await appointmentsService.updateAppointmentStatus(
        tenantId,
        id,
        status,
        userId
      );
      return reply.send({ success: true, data: result });
    }
  );

  app.put(
    '/:id/services',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Appointments'],
        summary: 'Update appointment services',
        description:
          'Replace all services on an appointment. Only allowed before appointment starts (booked, confirmed, checked_in).',
        params: idParamSchema,
        body: updateServicesSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user!;
      const { id } = request.params;
      const result = await appointmentsService.updateServices(tenantId, id, request.body, userId);
      return reply.send({ success: true, data: result });
    }
  );

  // =====================================================
  // APPOINTMENT ACTIONS
  // =====================================================

  app.post(
    '/:id/check-in',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Appointments'],
        summary: 'Check in customer for appointment',
        description: 'Mark customer as arrived for their appointment.',
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user!;
      const { id } = request.params;
      const result = await appointmentsService.checkIn(tenantId, id, userId);
      return reply.send({ success: true, data: result });
    }
  );

  app.post(
    '/:id/start',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Appointments'],
        summary: 'Start appointment service',
        description: 'Mark appointment as in progress.',
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user!;
      const { id } = request.params;
      const result = await appointmentsService.start(tenantId, id, userId);
      return reply.send({ success: true, data: result });
    }
  );

  app.post(
    '/:id/complete',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Appointments'],
        summary: 'Complete appointment',
        description: 'Mark appointment as completed.',
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user!;
      const { id } = request.params;
      const result = await appointmentsService.complete(tenantId, id, userId);
      return reply.send({ success: true, data: result });
    }
  );

  app.post(
    '/:id/cancel',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Appointments'],
        summary: 'Cancel appointment',
        description: 'Cancel an appointment with a reason.',
        params: idParamSchema,
        body: cancelAppointmentSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user!;
      const { id } = request.params;
      const result = await appointmentsService.cancel(tenantId, id, request.body, userId);
      return reply.send({ success: true, data: result });
    }
  );

  app.post(
    '/:id/no-show',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Appointments'],
        summary: 'Mark appointment as no-show',
        description: 'Mark customer as no-show. Affects their booking status.',
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user!;
      const { id } = request.params;
      const result = await appointmentsService.markNoShow(tenantId, id, userId);
      return reply.send({ success: true, data: result });
    }
  );

  app.post(
    '/:id/reschedule',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Appointments'],
        summary: 'Reschedule appointment',
        description: 'Reschedule appointment to a new date/time. Maximum 3 reschedules allowed.',
        params: idParamSchema,
        body: rescheduleAppointmentSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user!;
      const { id } = request.params;
      const result = await appointmentsService.reschedule(tenantId, id, request.body, userId);
      return reply.send({ success: true, data: result });
    }
  );

  app.post(
    '/:id/resolve-conflict',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Appointments'],
        summary: 'Resolve appointment conflict',
        description: 'Clear the conflict flag on an appointment after manual resolution.',
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user!;
      const { id } = request.params;
      const result = await appointmentsService.resolveConflict(tenantId, id, userId);
      return reply.send({ success: true, data: result });
    }
  );

  // =====================================================
  // UNASSIGNED APPOINTMENTS
  // =====================================================

  app.get(
    '/unassigned',
    {
      preHandler: [requirePermission('appointments:read')],
      schema: {
        tags: ['Unassigned Appointments'],
        summary: 'Get unassigned appointments',
        description: 'Get appointments without a stylist assigned for a branch. Defaults to today.',
        querystring: listUnassignedQuerySchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId } = request.user!;
      const { branchId, date } = request.query;
      const result = await appointmentsService.getUnassignedAppointments(tenantId, branchId, date);
      return reply.send({ success: true, data: result });
    }
  );

  app.get(
    '/unassigned/count',
    {
      preHandler: [requirePermission('appointments:read')],
      schema: {
        tags: ['Unassigned Appointments'],
        summary: 'Get unassigned appointments count',
        description: 'Get count of unassigned appointments for today.',
        querystring: listUnassignedQuerySchema.pick({ branchId: true }),
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId } = request.user!;
      const { branchId } = request.query as { branchId: string };
      const count = await appointmentsService.getUnassignedCount(tenantId, branchId);
      return reply.send({ success: true, data: { count } });
    }
  );

  app.post(
    '/:id/assign',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Unassigned Appointments'],
        summary: 'Assign stylist to appointment',
        description:
          'Assign a stylist to an unassigned appointment. Validates stylist availability.',
        params: idParamSchema,
        body: assignStylistSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user!;
      const { id } = request.params;
      const { stylistId } = request.body;
      const result = await appointmentsService.assignStylist(tenantId, id, stylistId, userId);
      return reply.send({ success: true, data: result });
    }
  );

  // =====================================================
  // STATION ASSIGNMENT (Floor View)
  // =====================================================

  app.patch(
    '/:id/station',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Floor View'],
        summary: 'Assign station to appointment',
        description: 'Assign a station to an appointment. Validates station availability.',
        params: idParamSchema,
        body: assignStationSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user!;
      const { id } = request.params;
      const { stationId } = request.body;
      const result = await appointmentsService.assignStation(tenantId, id, stationId, userId);
      return reply.send({ success: true, data: result });
    }
  );

  // =====================================================
  // ADD SERVICE MID-APPOINTMENT (Upsell)
  // =====================================================

  app.post(
    '/:id/services',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Floor View'],
        summary: 'Add service to appointment',
        description: 'Add a service to an in-progress appointment (upsell flow).',
        params: idParamSchema,
        body: addServiceSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user!;
      const { id } = request.params;
      const result = await appointmentsService.addService(tenantId, id, request.body, userId);
      return reply.send({ success: true, data: result });
    }
  );

  // =====================================================
  // MULTI-STYLIST SUPPORT
  // =====================================================

  app.patch(
    '/:id/stylists',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Floor View'],
        summary: 'Update appointment stylists',
        description: 'Update primary stylist and assistant stylists for an appointment.',
        params: idParamSchema,
        body: updateStylistsSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user!;
      const { id } = request.params;
      const result = await appointmentsService.updateStylists(tenantId, id, request.body, userId);
      return reply.send({ success: true, data: result });
    }
  );

  // =====================================================
  // MULTI-SERVICE: INDIVIDUAL SERVICE EXECUTION
  // =====================================================

  app.post(
    '/:id/services/:serviceId/start',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Multi-Service'],
        summary: 'Start a service within an appointment',
        description:
          'Start a specific service within a multi-service appointment. Validates station availability and sequential prerequisites.',
        params: serviceParamsSchema,
        body: startServiceSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
          409: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string; serviceId: string };
        Body: StartServiceInput;
      }>,
      reply
    ) => {
      const { tenantId, sub: userId } = request.user!;
      const { id: appointmentId, serviceId } = request.params;
      const { stationId, actualStylistId } = request.body;

      const result = await multiServiceService.startService(
        tenantId,
        appointmentId,
        serviceId,
        stationId,
        actualStylistId,
        userId
      );

      return reply.send(successResponse(result));
    }
  );

  app.post(
    '/:id/services/:serviceId/complete',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Multi-Service'],
        summary: 'Complete a service within an appointment',
        description:
          'Mark a specific service as completed. Releases the station and returns next service info if available.',
        params: serviceParamsSchema,
        body: completeServiceSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string; serviceId: string };
        Body: CompleteServiceInput;
      }>,
      reply
    ) => {
      const { tenantId, sub: userId } = request.user!;
      const { id: appointmentId, serviceId } = request.params;
      const { actualEndTime } = request.body;

      const result = await multiServiceService.completeService(
        tenantId,
        appointmentId,
        serviceId,
        actualEndTime,
        userId
      );

      return reply.send(successResponse(result));
    }
  );

  app.post(
    '/:id/services/:serviceId/skip',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Multi-Service'],
        summary: 'Skip a service within an appointment',
        description: 'Skip a specific service. Does not affect other services in the appointment.',
        params: serviceParamsSchema,
        body: skipServiceSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string; serviceId: string };
        Body: SkipServiceInput;
      }>,
      reply
    ) => {
      const { tenantId, sub: userId } = request.user!;
      const { id: appointmentId, serviceId } = request.params;
      const { reason } = request.body;

      const result = await multiServiceService.skipService(
        tenantId,
        appointmentId,
        serviceId,
        reason,
        userId
      );

      return reply.send(successResponse(result));
    }
  );

  app.patch(
    '/:id/services/:serviceId',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Multi-Service'],
        summary: 'Update a service within an appointment',
        description:
          'Update service configuration (stylist assignment, sequence, parallel flag) before service starts.',
        params: serviceParamsSchema,
        body: updateServiceSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (
      request: FastifyRequest<{
        Params: { id: string; serviceId: string };
        Body: UpdateServiceInput;
      }>,
      reply
    ) => {
      const { tenantId, sub: _userId } = request.user!;
      const { id: appointmentId, serviceId } = request.params;

      // For now, we'll implement a simple update - this can be enhanced later
      const updatedService = await prisma.appointmentService.update({
        where: {
          id: serviceId,
          tenantId,
          appointmentId,
          status: 'waiting', // Can only update waiting services
        },
        data: {
          assignedStylistId: request.body.assignedStylistId,
          sequence: request.body.sequence,
          runParallel: request.body.runParallel,
        },
        include: {
          service: { select: { id: true, name: true, sku: true } },
          assignedStylist: { select: { id: true, name: true } },
        },
      });

      return reply.send(successResponse(updatedService));
    }
  );

  // =====================================================
  // STYLIST SCHEDULE
  // =====================================================

  app.get(
    '/stylists/:stylistId/schedule',
    {
      preHandler: [requirePermission('appointments:read')],
      schema: {
        tags: ['Stylist Schedule'],
        summary: 'Get stylist schedule',
        description: 'Get schedule including breaks and blocked slots for a stylist.',
        params: stylistIdParamSchema,
        querystring: getStylistScheduleSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId } = request.user!;
      const { stylistId } = request.params;
      const result = await stylistScheduleService.getStylistSchedule(
        tenantId,
        stylistId,
        request.query
      );
      return reply.send({ success: true, data: result });
    }
  );

  app.post(
    '/stylists/:stylistId/breaks',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Stylist Schedule'],
        summary: 'Create stylist break',
        description: 'Add a recurring break to stylist schedule.',
        params: stylistIdParamSchema,
        body: createStylistBreakSchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, branchIds, sub: userId } = request.user!;
      const branchId = branchIds[0];
      const { stylistId } = request.params;
      const result = await stylistScheduleService.createBreak(
        tenantId,
        branchId,
        stylistId,
        request.body,
        userId
      );
      return reply.code(201).send(successResponse(result));
    }
  );

  app.delete(
    '/stylists/:stylistId/breaks/:breakId',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Stylist Schedule'],
        summary: 'Delete stylist break',
        description: 'Remove a break from stylist schedule.',
        params: stylistBreakParamsSchema,
        response: {
          200: messageResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId } = request.user!;
      const { breakId } = request.params;
      await stylistScheduleService.deleteBreak(tenantId, breakId);
      return reply.send(deleteResponse('Break deleted successfully'));
    }
  );

  app.post(
    '/stylists/:stylistId/blocked-slots',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Stylist Schedule'],
        summary: 'Block time slot',
        description: 'Block a specific time slot or full day for a stylist.',
        params: stylistIdParamSchema,
        body: createBlockedSlotSchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, branchIds, sub: userId } = request.user!;
      const branchId = branchIds[0];
      const { stylistId } = request.params;
      const result = await stylistScheduleService.createBlockedSlot(
        tenantId,
        branchId,
        stylistId,
        request.body,
        userId
      );
      return reply.code(201).send(successResponse(result));
    }
  );

  app.delete(
    '/stylists/:stylistId/blocked-slots/:slotId',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Stylist Schedule'],
        summary: 'Unblock time slot',
        description: 'Remove a blocked slot from stylist schedule.',
        params: stylistSlotParamsSchema,
        response: {
          200: messageResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId } = request.user!;
      const { slotId } = request.params;
      await stylistScheduleService.deleteBlockedSlot(tenantId, slotId);

      return reply.send(deleteResponse('Blocked slot removed successfully'));
    }
  );

  // =====================================================
  // WALK-IN QUEUE
  // =====================================================

  app.get(
    '/walk-in/queue',
    {
      preHandler: [requirePermission('appointments:read')],
      schema: {
        tags: ['Walk-In Queue'],
        summary: 'Get walk-in queue',
        description: 'Get the current walk-in queue for a branch.',
        querystring: getQueueSchema,
        response: {
          200: successResponseSchema,
          401: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId } = request.user!;
      const { branchId, date } = request.query;
      const result = await walkInQueueService.getQueue(tenantId, branchId, date);
      return reply.send({ success: true, data: result });
    }
  );

  app.post(
    '/walk-in/queue',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Walk-In Queue'],
        summary: 'Add to walk-in queue',
        description: 'Add a customer to the walk-in queue.',
        body: addToQueueSchema,
        response: {
          201: successResponseSchema,
          400: errorResponseSchema,
          401: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user!;
      const { branchId } = request.body;
      const result = await walkInQueueService.addToQueue(tenantId, branchId, request.body, userId);
      return reply.code(201).send({ success: true, data: result });
    }
  );

  app.patch(
    '/walk-in/queue/:id/call',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Walk-In Queue'],
        summary: 'Call customer from queue',
        description: 'Call a customer from the walk-in queue.',
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user!;
      const { id } = request.params;
      const result = await walkInQueueService.callCustomer(tenantId, id, userId);
      return reply.send({ success: true, data: result });
    }
  );

  app.patch(
    '/walk-in/queue/:id/serve',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Walk-In Queue'],
        summary: 'Start serving customer',
        description: 'Start serving a customer from the queue. Creates an appointment.',
        params: idParamSchema,
        body: serveQueueBodySchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId, sub: userId } = request.user!;
      const { id } = request.params;
      const { stylistId } = request.body;
      const result = await walkInQueueService.startServing(tenantId, id, stylistId, userId);
      return reply.send({ success: true, data: result });
    }
  );

  app.patch(
    '/walk-in/queue/:id/complete',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Walk-In Queue'],
        summary: 'Mark queue entry as complete',
        description: 'Mark a queue entry as completed.',
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId } = request.user!;
      const { id } = request.params;
      const result = await walkInQueueService.markComplete(tenantId, id);
      return reply.send({ success: true, data: result });
    }
  );

  app.patch(
    '/walk-in/queue/:id/left',
    {
      preHandler: [requirePermission('appointments:write')],
      schema: {
        tags: ['Walk-In Queue'],
        summary: 'Mark customer as left',
        description: 'Mark a customer as left without service.',
        params: idParamSchema,
        response: {
          200: successResponseSchema,
          400: errorResponseSchema,
          404: errorResponseSchema,
        },
        security: [{ bearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { tenantId } = request.user!;
      const { id } = request.params;
      const result = await walkInQueueService.markLeft(tenantId, id);
      return reply.send({ success: true, data: result });
    }
  );
}
