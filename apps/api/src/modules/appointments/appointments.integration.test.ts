/**
 * Appointments Module Integration Tests
 * Tests appointment CRUD, double-booking prevention, walk-in queue flow, and reschedule flow
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AppointmentsService } from './appointments.service';
import { AvailabilityService } from './availability.service';
import { WalkInQueueService } from './walk-in-queue.service';

// Mock Prisma client type
type MockPrisma = {
  appointment: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    findUnique: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  appointmentService: {
    findMany: ReturnType<typeof vi.fn>;
    createMany: ReturnType<typeof vi.fn>;
  };
  appointmentStatusHistory: {
    create: ReturnType<typeof vi.fn>;
  };
  service: {
    findMany: ReturnType<typeof vi.fn>;
  };
  customer: {
    findUnique: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  branch: {
    findUnique: ReturnType<typeof vi.fn>;
  };
  user: {
    findMany: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  stylistBreak: {
    findMany: ReturnType<typeof vi.fn>;
  };
  stylistBlockedSlot: {
    findMany: ReturnType<typeof vi.fn>;
  };
  walkInQueue: {
    findMany: ReturnType<typeof vi.fn>;
    findFirst: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
  };
  auditLog: {
    create: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

// Mock Prisma client with comprehensive mocking
const createMockPrisma = (): MockPrisma => ({
  appointment: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  appointmentService: {
    findMany: vi.fn(),
    createMany: vi.fn(),
  },
  appointmentStatusHistory: {
    create: vi.fn(),
  },
  service: {
    findMany: vi.fn(),
  },
  customer: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  branch: {
    findUnique: vi.fn(),
  },
  user: {
    findMany: vi.fn(),
    count: vi.fn(),
  },
  stylistBreak: {
    findMany: vi.fn(),
  },
  stylistBlockedSlot: {
    findMany: vi.fn(),
  },
  walkInQueue: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  $transaction: vi.fn((callback: unknown) =>
    (callback as (tx: MockPrisma) => unknown)(createMockPrisma())
  ),
});

describe('Appointments Integration Tests', () => {
  let mockPrisma: MockPrisma;
  let appointmentsService: AppointmentsService;
  let availabilityService: AvailabilityService;
  let walkInQueueService: WalkInQueueService;

  const tenantId = 'tenant-123';
  const branchId = 'branch-123';
  const userId = 'user-123';
  const stylistId = 'stylist-123';
  const customerId = 'customer-123';

  beforeEach(() => {
    vi.clearAllMocks();
    mockPrisma = createMockPrisma();
    appointmentsService = new AppointmentsService(mockPrisma as any);
    availabilityService = new AvailabilityService(mockPrisma as any);
    walkInQueueService = new WalkInQueueService(mockPrisma as any, appointmentsService);
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  // ============================================
  // Appointment CRUD Integration Tests
  // ============================================

  describe('Appointment CRUD Flow', () => {
    const mockService = {
      id: 'service-1',
      name: 'Haircut',
      sku: 'HC001',
      durationMinutes: 30,
      activeTimeMinutes: 30,
      processingTimeMinutes: 0,
      basePrice: 500,
      taxRate: 18,
      commissionValue: 10,
      isActive: true,
      branchPrices: [{ branchId, price: 500 }],
    };

    const mockAppointment = {
      id: 'apt-1',
      tenantId,
      branchId,
      customerId,
      customerName: 'John Doe',
      customerPhone: '9876543210',
      scheduledDate: new Date('2026-02-10'),
      scheduledTime: '10:00',
      endTime: '10:30',
      totalDuration: 30,
      stylistId,
      status: 'booked',
      subtotal: 500,
      taxAmount: 90,
      totalAmount: 590,
      rescheduleCount: 0,
      services: [],
      customer: { id: customerId, name: 'John Doe', phone: '9876543210' },
      branch: { id: branchId, name: 'Main Branch' },
    };

    it('should create appointment and lock prices at booking time', async () => {
      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      mockPrisma.customer.findUnique.mockResolvedValue({ bookingStatus: 'normal' });
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          appointment: {
            create: vi.fn().mockResolvedValue({
              ...mockAppointment,
              priceLockedAt: new Date(),
            }),
          },
          appointmentStatusHistory: { create: vi.fn() },
          auditLog: { create: vi.fn() },
        };
        return callback(tx);
      });

      const result = await appointmentsService.createAppointment(
        tenantId,
        branchId,
        {
          branchId,
          customerId,
          customerName: 'John Doe',
          customerPhone: '9876543210',
          scheduledDate: '2026-02-10',
          scheduledTime: '10:00',
          services: [{ serviceId: 'service-1', quantity: 1 }],
          stylistId,
          bookingType: 'phone',
          assignLater: false,
        },
        userId
      );

      expect(result.appointment).toBeDefined();
      expect(result.appointment.priceLockedAt).toBeDefined();
    });

    it('should complete full appointment lifecycle: booked -> checked_in -> in_progress -> completed', async () => {
      // Setup mock for each status transition
      let currentStatus = 'booked';

      mockPrisma.appointment.findFirst.mockImplementation(() =>
        Promise.resolve({ ...mockAppointment, status: currentStatus })
      );
      mockPrisma.appointment.findUnique.mockImplementation(() =>
        Promise.resolve({ ...mockAppointment, status: currentStatus })
      );

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          appointment: {
            update: vi.fn().mockImplementation(({ data }) => {
              currentStatus = data.status || currentStatus;
              return Promise.resolve({ ...mockAppointment, status: currentStatus, services: [] });
            }),
          },
          appointmentService: { update: vi.fn() },
          appointmentStatusHistory: { create: vi.fn() },
          walkInQueue: { findFirst: vi.fn().mockResolvedValue(null) },
          auditLog: { create: vi.fn() },
        };
        return callback(tx);
      });

      // Check-in
      await appointmentsService.checkIn(tenantId, 'apt-1', userId);
      expect(currentStatus).toBe('checked_in');

      // Start
      await appointmentsService.start(tenantId, 'apt-1', userId);
      expect(currentStatus).toBe('in_progress');

      // Complete
      await appointmentsService.complete(tenantId, 'apt-1', userId);
      expect(currentStatus).toBe('completed');
    });

    it('should reject invalid status transitions', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...mockAppointment,
        status: 'completed',
      });

      await expect(appointmentsService.checkIn(tenantId, 'apt-1', userId)).rejects.toThrow(
        'Cannot check in appointment in current status'
      );

      await expect(appointmentsService.start(tenantId, 'apt-1', userId)).rejects.toThrow(
        'Cannot start appointment in current status'
      );
    });

    it('should block online booking for blocked customers', async () => {
      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.customer.findUnique.mockResolvedValue({ bookingStatus: 'blocked' });

      await expect(
        appointmentsService.createAppointment(
          tenantId,
          branchId,
          {
            branchId,
            customerId,
            customerName: 'John Doe',
            scheduledDate: '2026-02-10',
            scheduledTime: '10:00',
            services: [{ serviceId: 'service-1', quantity: 1 }],
            bookingType: 'online',
            assignLater: false,
          },
          userId
        )
      ).rejects.toThrow('Customer is blocked from online booking');
    });
  });

  // ============================================
  // Double-Booking Prevention Tests
  // ============================================

  describe('Double-Booking Prevention', () => {
    beforeEach(() => {
      mockPrisma.branch.findUnique.mockResolvedValue({
        workingHours: {
          monday: { start: '09:00', end: '18:00' },
          tuesday: { start: '09:00', end: '18:00' },
          wednesday: { start: '09:00', end: '18:00' },
          thursday: { start: '09:00', end: '18:00' },
          friday: { start: '09:00', end: '18:00' },
          saturday: { start: '10:00', end: '16:00' },
          sunday: { closed: true },
        },
      });
      mockPrisma.stylistBreak.findMany.mockResolvedValue([]);
      mockPrisma.stylistBlockedSlot.findMany.mockResolvedValue([]);
    });

    it('should detect conflict when booking overlaps existing appointment', async () => {
      // Existing appointment from 10:00 to 11:00
      mockPrisma.appointment.findMany.mockResolvedValue([
        { scheduledTime: '10:00', endTime: '11:00' },
      ]);

      // Try to book 10:30 - should conflict
      const isAvailable = await availabilityService.isSlotAvailable(
        tenantId,
        branchId,
        stylistId,
        '2026-02-09', // Monday
        '10:30',
        30
      );

      expect(isAvailable).toBe(false);
    });

    it('should allow booking adjacent slot (no gap)', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([
        { scheduledTime: '10:00', endTime: '11:00' },
      ]);

      // Book 11:00 - should be allowed (starts exactly when previous ends)
      const isAvailable = await availabilityService.isSlotAvailable(
        tenantId,
        branchId,
        stylistId,
        '2026-02-09',
        '11:00',
        30
      );

      expect(isAvailable).toBe(true);
    });

    it('should prevent booking during stylist break', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.stylistBreak.findMany.mockResolvedValue([
        { dayOfWeek: null, startTime: '12:00', endTime: '13:00', isActive: true },
      ]);

      const isAvailable = await availabilityService.isSlotAvailable(
        tenantId,
        branchId,
        stylistId,
        '2026-02-09',
        '12:30',
        30
      );

      expect(isAvailable).toBe(false);
    });

    it('should prevent booking on blocked day', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.stylistBlockedSlot.findMany.mockResolvedValue([{ isFullDay: true }]);

      const isAvailable = await availabilityService.isSlotAvailable(
        tenantId,
        branchId,
        stylistId,
        '2026-02-09',
        '10:00',
        30
      );

      expect(isAvailable).toBe(false);
    });

    it('should prevent booking outside working hours', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      // Before opening
      const beforeOpen = await availabilityService.isSlotAvailable(
        tenantId,
        branchId,
        stylistId,
        '2026-02-09',
        '08:00',
        30
      );
      expect(beforeOpen).toBe(false);

      // After closing
      const afterClose = await availabilityService.isSlotAvailable(
        tenantId,
        branchId,
        stylistId,
        '2026-02-09',
        '18:00',
        30
      );
      expect(afterClose).toBe(false);
    });

    it('should prevent booking on closed day (Sunday)', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      const isAvailable = await availabilityService.isSlotAvailable(
        tenantId,
        branchId,
        stylistId,
        '2026-02-08', // Sunday
        '10:00',
        30
      );

      expect(isAvailable).toBe(false);
    });
  });

  // ============================================
  // Walk-in Queue Flow Tests
  // ============================================

  describe('Walk-in Queue Flow', () => {
    const mockQueueEntry = {
      id: 'queue-1',
      tenantId,
      branchId,
      queueDate: new Date('2026-02-10'),
      tokenNumber: 1,
      customerId,
      customerName: 'John Doe',
      customerPhone: '9876543210',
      serviceIds: ['service-1'],
      status: 'waiting',
      position: 1,
      estimatedWaitMinutes: 30,
    };

    it('should add customer to queue with sequential token', async () => {
      mockPrisma.walkInQueue.findFirst.mockResolvedValue(null); // No existing tokens
      mockPrisma.walkInQueue.count.mockResolvedValue(0);
      mockPrisma.service.findMany.mockResolvedValue([{ durationMinutes: 30 }]);
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.customer.findFirst.mockResolvedValue(null);
      mockPrisma.customer.create.mockResolvedValue({ id: 'new-cust-1', name: 'John Doe', phone: '9876543210' });
      mockPrisma.walkInQueue.create.mockResolvedValue({
        ...mockQueueEntry,
        tokenNumber: 1,
      });

      const result = await walkInQueueService.addToQueue(
        tenantId,
        branchId,
        {
          branchId,
          customerName: 'John Doe',
          customerPhone: '9876543210',
          serviceIds: ['service-1'],
        },
        userId
      );

      expect(result.tokenNumber).toBe(1);
      expect(result.position).toBe(1);
    });

    it('should generate incremental tokens for same day', async () => {
      mockPrisma.walkInQueue.findFirst.mockResolvedValue({ tokenNumber: 5 });
      mockPrisma.walkInQueue.count.mockResolvedValue(3);
      mockPrisma.service.findMany.mockResolvedValue([{ durationMinutes: 30 }]);
      mockPrisma.user.count.mockResolvedValue(2);
      mockPrisma.walkInQueue.create.mockResolvedValue({
        ...mockQueueEntry,
        tokenNumber: 6,
        position: 4,
      });

      const result = await walkInQueueService.addToQueue(
        tenantId,
        branchId,
        {
          branchId,
          customerName: 'Jane Doe',
          serviceIds: ['service-1'],
        },
        userId
      );

      expect(result.tokenNumber).toBe(6);
      expect(result.position).toBe(4);
    });

    it('should call customer and update status', async () => {
      mockPrisma.walkInQueue.findFirst.mockResolvedValue(mockQueueEntry);
      mockPrisma.walkInQueue.update.mockResolvedValue({
        ...mockQueueEntry,
        status: 'called',
        calledAt: new Date(),
      });
      mockPrisma.walkInQueue.findMany.mockResolvedValue([]);

      const result = await walkInQueueService.callCustomer(tenantId, 'queue-1', userId);

      expect(result.status).toBe('called');
      expect(result.calledAt).toBeDefined();
    });

    it('should reject calling non-waiting customer', async () => {
      mockPrisma.walkInQueue.findFirst.mockResolvedValue({
        ...mockQueueEntry,
        status: 'serving',
      });

      await expect(walkInQueueService.callCustomer(tenantId, 'queue-1', userId)).rejects.toThrow(
        'Customer is not in waiting status'
      );
    });

    it('should convert queue entry to appointment when serving', async () => {
      const mockService = {
        id: 'service-1',
        name: 'Haircut',
        sku: 'HC001',
        durationMinutes: 30,
        activeTimeMinutes: 30,
        processingTimeMinutes: 0,
        basePrice: 500,
        taxRate: 18,
        commissionValue: 10,
        isActive: true,
        branchPrices: [],
      };

      mockPrisma.walkInQueue.findFirst.mockResolvedValue({
        ...mockQueueEntry,
        status: 'called',
      });
      mockPrisma.service.findMany.mockResolvedValue([mockService]);
      mockPrisma.customer.findUnique.mockResolvedValue({ bookingStatus: 'normal' });
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      mockPrisma.appointment.findMany.mockResolvedValue([]);

      const mockCreatedAppointment = {
        id: 'apt-walk-1',
        tenantId,
        branchId,
        bookingType: 'walk_in',
        tokenNumber: 1,
        status: 'booked',
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          appointment: {
            create: vi.fn().mockResolvedValue(mockCreatedAppointment),
          },
          appointmentStatusHistory: { create: vi.fn() },
          auditLog: { create: vi.fn() },
        };
        return callback(tx);
      });

      mockPrisma.walkInQueue.update.mockResolvedValue({
        ...mockQueueEntry,
        status: 'serving',
        appointmentId: 'apt-walk-1',
      });
      mockPrisma.walkInQueue.findMany.mockResolvedValue([]);

      const result = await walkInQueueService.startServing(tenantId, 'queue-1', stylistId, userId);

      expect(result.queueEntry.status).toBe('serving');
      expect(result.queueEntry.appointmentId).toBe('apt-walk-1');
      expect(result.appointment).toBeDefined();
    });

    it('should mark customer as left and recalculate positions', async () => {
      mockPrisma.walkInQueue.findFirst.mockResolvedValue(mockQueueEntry);
      mockPrisma.walkInQueue.update.mockResolvedValue({
        ...mockQueueEntry,
        status: 'left',
      });
      mockPrisma.walkInQueue.findMany.mockResolvedValue([]);

      const result = await walkInQueueService.markLeft(tenantId, 'queue-1');

      expect(result.status).toBe('left');
    });

    it('should get queue with statistics', async () => {
      mockPrisma.walkInQueue.findMany.mockResolvedValue([
        { ...mockQueueEntry, status: 'waiting' },
        { ...mockQueueEntry, id: 'queue-2', tokenNumber: 2, status: 'serving' },
      ]);
      mockPrisma.walkInQueue.count
        .mockResolvedValueOnce(1) // waiting
        .mockResolvedValueOnce(1) // serving
        .mockResolvedValueOnce(2) // completed
        .mockResolvedValueOnce(0); // left

      const result = await walkInQueueService.getQueue(tenantId, branchId);

      expect(result.queue).toHaveLength(2);
      expect(result.stats.waiting).toBe(1);
      expect(result.stats.serving).toBe(1);
    });
  });

  // ============================================
  // Reschedule Flow Tests
  // ============================================

  describe('Reschedule Flow', () => {
    const mockAppointment = {
      id: 'apt-1',
      tenantId,
      branchId,
      customerId,
      customerName: 'John Doe',
      customerPhone: '9876543210',
      scheduledDate: new Date('2026-02-10'),
      scheduledTime: '10:00',
      endTime: '10:30',
      totalDuration: 30,
      stylistId,
      stylistGenderPreference: null,
      bookingType: 'phone',
      bookingSource: null,
      status: 'booked',
      subtotal: 500,
      taxAmount: 90,
      totalAmount: 590,
      priceLockedAt: new Date(),
      prepaymentRequired: false,
      prepaymentAmount: 0,
      prepaymentStatus: null,
      customerNotes: null,
      internalNotes: null,
      rescheduleCount: 0,
      originalAppointmentId: null,
      services: [],
      statusHistory: [],
      customer: { id: customerId, name: 'John Doe', phone: '9876543210' },
      branch: { id: branchId, name: 'Main Branch' },
    };

    it('should create new appointment when rescheduling', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment);
      mockPrisma.appointmentService.findMany.mockResolvedValue([]);

      const newAppointment = {
        ...mockAppointment,
        id: 'apt-2',
        scheduledDate: new Date('2026-02-15'),
        scheduledTime: '14:00',
        endTime: '14:30',
        rescheduleCount: 1,
        originalAppointmentId: 'apt-1',
      };

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          appointment: {
            update: vi.fn().mockResolvedValue({ ...mockAppointment, status: 'rescheduled' }),
            create: vi.fn().mockResolvedValue(newAppointment),
          },
          appointmentService: {
            findMany: vi.fn().mockResolvedValue([]),
            createMany: vi.fn(),
          },
          appointmentStatusHistory: { create: vi.fn() },
          auditLog: { create: vi.fn() },
        };
        return callback(tx);
      });

      const result = await appointmentsService.reschedule(
        tenantId,
        'apt-1',
        { newDate: '2026-02-15', newTime: '14:00' },
        userId
      );

      expect(result.newAppointment).toBeDefined();
      expect(result.newAppointment.id).toBe('apt-2');
      expect(result.rescheduleCount).toBe(1);
    });

    it('should preserve original prices when rescheduling', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment);
      mockPrisma.appointmentService.findMany.mockResolvedValue([]);

      let capturedCreateData: any = null;

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          appointment: {
            update: vi.fn().mockResolvedValue({ ...mockAppointment, status: 'rescheduled' }),
            create: vi.fn().mockImplementation((args) => {
              capturedCreateData = args.data;
              return Promise.resolve({
                ...mockAppointment,
                id: 'apt-2',
                rescheduleCount: 1,
              });
            }),
          },
          appointmentService: {
            findMany: vi.fn().mockResolvedValue([]),
            createMany: vi.fn(),
          },
          appointmentStatusHistory: { create: vi.fn() },
          auditLog: { create: vi.fn() },
        };
        return callback(tx);
      });

      await appointmentsService.reschedule(
        tenantId,
        'apt-1',
        { newDate: '2026-02-15', newTime: '14:00' },
        userId
      );

      // Verify prices are preserved from original
      expect(capturedCreateData.subtotal).toBe(mockAppointment.subtotal);
      expect(capturedCreateData.taxAmount).toBe(mockAppointment.taxAmount);
      expect(capturedCreateData.totalAmount).toBe(mockAppointment.totalAmount);
      expect(capturedCreateData.priceLockedAt).toBe(mockAppointment.priceLockedAt);
    });

    it('should reject reschedule when limit reached (3 times)', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...mockAppointment,
        rescheduleCount: 3,
      });

      await expect(
        appointmentsService.reschedule(
          tenantId,
          'apt-1',
          { newDate: '2026-02-15', newTime: '14:00' },
          userId
        )
      ).rejects.toThrow('Maximum reschedule limit (3) reached');
    });

    it('should reject reschedule from completed status', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...mockAppointment,
        status: 'completed',
      });

      await expect(
        appointmentsService.reschedule(
          tenantId,
          'apt-1',
          { newDate: '2026-02-15', newTime: '14:00' },
          userId
        )
      ).rejects.toThrow('Cannot reschedule appointment in current status');
    });

    it('should reject reschedule from cancelled status', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...mockAppointment,
        status: 'cancelled',
      });

      await expect(
        appointmentsService.reschedule(
          tenantId,
          'apt-1',
          { newDate: '2026-02-15', newTime: '14:00' },
          userId
        )
      ).rejects.toThrow('Cannot reschedule appointment in current status');
    });

    it('should allow reschedule from confirmed status', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...mockAppointment,
        status: 'confirmed',
      });
      mockPrisma.appointmentService.findMany.mockResolvedValue([]);

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          appointment: {
            update: vi.fn().mockResolvedValue({ ...mockAppointment, status: 'rescheduled' }),
            create: vi.fn().mockResolvedValue({
              ...mockAppointment,
              id: 'apt-2',
              rescheduleCount: 1,
            }),
          },
          appointmentService: {
            findMany: vi.fn().mockResolvedValue([]),
            createMany: vi.fn(),
          },
          appointmentStatusHistory: { create: vi.fn() },
          auditLog: { create: vi.fn() },
        };
        return callback(tx);
      });

      const result = await appointmentsService.reschedule(
        tenantId,
        'apt-1',
        { newDate: '2026-02-15', newTime: '14:00' },
        userId
      );

      expect(result.newAppointment).toBeDefined();
    });

    it('should track reschedule chain via originalAppointmentId', async () => {
      // First reschedule
      mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment);
      mockPrisma.appointmentService.findMany.mockResolvedValue([]);

      let capturedOriginalId: string | null = null;

      mockPrisma.$transaction.mockImplementation(async (callback: any) => {
        const tx = {
          appointment: {
            update: vi.fn().mockResolvedValue({ ...mockAppointment, status: 'rescheduled' }),
            create: vi.fn().mockImplementation((args) => {
              capturedOriginalId = args.data.originalAppointmentId;
              return Promise.resolve({
                ...mockAppointment,
                id: 'apt-2',
                rescheduleCount: 1,
                originalAppointmentId: args.data.originalAppointmentId,
              });
            }),
          },
          appointmentService: {
            findMany: vi.fn().mockResolvedValue([]),
            createMany: vi.fn(),
          },
          appointmentStatusHistory: { create: vi.fn() },
          auditLog: { create: vi.fn() },
        };
        return callback(tx);
      });

      await appointmentsService.reschedule(
        tenantId,
        'apt-1',
        { newDate: '2026-02-15', newTime: '14:00' },
        userId
      );

      expect(capturedOriginalId).toBe('apt-1');
    });
  });
});
