/**
 * Appointments Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AppointmentsService } from './appointments.service';

// Mock Prisma client type
type MockPrismaClient = {
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
    update: ReturnType<typeof vi.fn>;
  };
  appointmentStatusHistory: {
    create: ReturnType<typeof vi.fn>;
  };
  service: {
    findMany: ReturnType<typeof vi.fn>;
  };
  customer: {
    findUnique: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  auditLog: {
    create: ReturnType<typeof vi.fn>;
  };
  walkInQueue: {
    findFirst: ReturnType<typeof vi.fn>;
    update: ReturnType<typeof vi.fn>;
  };
  $transaction: ReturnType<typeof vi.fn>;
};

// Mock Prisma client
const mockPrisma: MockPrismaClient = {
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
    update: vi.fn(),
  },
  appointmentStatusHistory: {
    create: vi.fn(),
  },
  service: {
    findMany: vi.fn(),
  },
  customer: {
    findUnique: vi.fn(),
    update: vi.fn(),
  },
  auditLog: {
    create: vi.fn(),
  },
  walkInQueue: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  $transaction: vi.fn((callback: unknown) =>
    (callback as (tx: MockPrismaClient) => unknown)(mockPrisma)
  ),
};

describe('AppointmentsService', () => {
  let service: AppointmentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AppointmentsService(mockPrisma as any);
  });

  describe('calculateEndTime', () => {
    it('should calculate end time correctly', () => {
      // Access private method via prototype
      const calculateEndTime = (service as any).calculateEndTime.bind(service);

      expect(calculateEndTime('09:00', 60)).toBe('10:00');
      expect(calculateEndTime('09:30', 45)).toBe('10:15');
      expect(calculateEndTime('23:00', 120)).toBe('01:00'); // Wraps around midnight
      expect(calculateEndTime('14:45', 30)).toBe('15:15');
    });

    it('should handle edge cases', () => {
      const calculateEndTime = (service as any).calculateEndTime.bind(service);

      expect(calculateEndTime('00:00', 60)).toBe('01:00');
      expect(calculateEndTime('23:59', 1)).toBe('00:00');
      expect(calculateEndTime('12:00', 0)).toBe('12:00');
    });
  });

  describe('getAppointments', () => {
    it('should return paginated appointments', async () => {
      const mockAppointments = [
        { id: '1', status: 'booked', scheduledDate: new Date() },
        { id: '2', status: 'confirmed', scheduledDate: new Date() },
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(mockAppointments);
      mockPrisma.appointment.count.mockResolvedValue(2);

      const result = await service.getAppointments('tenant-1', {
        page: 1,
        limit: 10,
      });

      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
    });

    it('should apply status filter', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.appointment.count.mockResolvedValue(0);

      await service.getAppointments('tenant-1', {
        page: 1,
        limit: 10,
        status: 'booked',
      });

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'booked',
          }),
        })
      );
    });

    it('should apply date range filter', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.appointment.count.mockResolvedValue(0);

      await service.getAppointments('tenant-1', {
        page: 1,
        limit: 10,
        dateFrom: '2026-02-01',
        dateTo: '2026-02-28',
      });

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scheduledDate: {
              gte: expect.any(Date),
              lte: expect.any(Date),
            },
          }),
        })
      );
    });
  });

  describe('getAppointmentById', () => {
    it('should return appointment with relations', async () => {
      const mockAppointment = {
        id: 'apt-1',
        tenantId: 'tenant-1',
        status: 'booked',
        customer: { id: 'cust-1', name: 'John' },
        services: [],
        statusHistory: [],
      };

      mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment);

      const result = await service.getAppointmentById('tenant-1', 'apt-1');

      expect(result).toMatchObject(mockAppointment);
      expect(mockPrisma.appointment.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            id: 'apt-1',
            tenantId: 'tenant-1',
            deletedAt: null,
          },
        })
      );
    });

    it('should throw error if appointment not found', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      await expect(service.getAppointmentById('tenant-1', 'apt-1')).rejects.toThrow(
        'Appointment not found'
      );
    });
  });

  describe('Status Transitions', () => {
    const mockAppointment = {
      id: 'apt-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      status: 'booked',
      customerId: 'cust-1',
      services: [],
    };

    beforeEach(() => {
      mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment);
      mockPrisma.appointment.findUnique.mockResolvedValue(mockAppointment);
      mockPrisma.appointment.update.mockResolvedValue({ ...mockAppointment, status: 'checked_in', services: [] });
      mockPrisma.walkInQueue.findFirst.mockResolvedValue(null);
    });

    it('should allow check-in from booked status', async () => {
      await service.checkIn('tenant-1', 'apt-1', 'user-1');

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'checked_in' },
        })
      );
    });

    it('should not allow check-in from completed status', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...mockAppointment,
        status: 'completed',
      });

      await expect(service.checkIn('tenant-1', 'apt-1', 'user-1')).rejects.toThrow(
        'Cannot check in appointment in current status'
      );
    });

    it('should allow start from checked_in status', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...mockAppointment,
        status: 'checked_in',
      });
      mockPrisma.appointment.update.mockResolvedValue({
        ...mockAppointment,
        status: 'in_progress',
        services: [],
      });

      await service.start('tenant-1', 'apt-1', 'user-1');

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'in_progress' }),
        })
      );
    });

    it('should not allow start from booked status', async () => {
      await expect(service.start('tenant-1', 'apt-1', 'user-1')).rejects.toThrow(
        'Cannot start appointment in current status'
      );
    });

    it('should allow complete from in_progress status', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...mockAppointment,
        status: 'in_progress',
      });
      mockPrisma.appointment.update.mockResolvedValue({
        ...mockAppointment,
        status: 'completed',
        services: [],
      });

      await service.complete('tenant-1', 'apt-1', 'user-1');

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'completed' }),
        })
      );
    });
  });

  describe('Reschedule', () => {
    const mockAppointment = {
      id: 'apt-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      status: 'booked',
      customerId: 'cust-1',
      customerName: 'John',
      customerPhone: '9876543210',
      scheduledDate: new Date('2026-02-10'),
      scheduledTime: '10:00',
      totalDuration: 60,
      rescheduleCount: 0,
      stylistId: 'stylist-1',
      stylistGenderPreference: null,
      bookingType: 'phone',
      bookingSource: null,
      subtotal: 500,
      taxAmount: 90,
      totalAmount: 590,
      priceLockedAt: new Date(),
      prepaymentRequired: false,
      prepaymentAmount: 0,
      prepaymentStatus: null,
      customerNotes: null,
      internalNotes: null,
      originalAppointmentId: null,
    };

    beforeEach(() => {
      mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment);
      mockPrisma.appointment.update.mockResolvedValue({
        ...mockAppointment,
        status: 'rescheduled',
      });
      mockPrisma.appointment.create.mockResolvedValue({
        ...mockAppointment,
        id: 'apt-2',
        rescheduleCount: 1,
      });
      mockPrisma.appointmentService.findMany.mockResolvedValue([]);
    });

    it('should create new appointment when rescheduling', async () => {
      const result = await service.reschedule(
        'tenant-1',
        'apt-1',
        { newDate: '2026-02-15', newTime: '14:00' },
        'user-1'
      );

      expect(result.newAppointment).toBeDefined();
      expect(result.rescheduleCount).toBe(1);
      expect(mockPrisma.appointment.create).toHaveBeenCalled();
    });

    it('should increment reschedule count', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...mockAppointment,
        rescheduleCount: 1,
      });
      mockPrisma.appointment.create.mockResolvedValue({
        ...mockAppointment,
        id: 'apt-2',
        rescheduleCount: 2,
      });

      const result = await service.reschedule(
        'tenant-1',
        'apt-1',
        { newDate: '2026-02-15', newTime: '14:00' },
        'user-1'
      );

      expect(result.rescheduleCount).toBe(2);
    });

    it('should reject reschedule when limit reached', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...mockAppointment,
        rescheduleCount: 3,
      });

      await expect(
        service.reschedule(
          'tenant-1',
          'apt-1',
          { newDate: '2026-02-15', newTime: '14:00' },
          'user-1'
        )
      ).rejects.toThrow('Maximum reschedule limit (3) reached');
    });

    it('should not allow reschedule from completed status', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue({
        ...mockAppointment,
        status: 'completed',
      });

      await expect(
        service.reschedule(
          'tenant-1',
          'apt-1',
          { newDate: '2026-02-15', newTime: '14:00' },
          'user-1'
        )
      ).rejects.toThrow('Cannot reschedule appointment in current status');
    });
  });

  describe('No-Show Policy', () => {
    const mockAppointment = {
      id: 'apt-1',
      tenantId: 'tenant-1',
      branchId: 'branch-1',
      status: 'booked',
      customerId: 'cust-1',
    };

    beforeEach(() => {
      mockPrisma.appointment.findFirst.mockResolvedValue(mockAppointment);
      mockPrisma.appointment.update.mockResolvedValue({ ...mockAppointment, status: 'no_show' });
    });

    it('should increment customer no-show count on first no-show', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({ noShowCount: 0 });

      await service.markNoShow('tenant-1', 'apt-1', 'user-1');

      expect(mockPrisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            noShowCount: 1,
            bookingStatus: 'normal',
          },
        })
      );
    });

    it('should set prepaid_only status on second no-show', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({ noShowCount: 1 });

      await service.markNoShow('tenant-1', 'apt-1', 'user-1');

      expect(mockPrisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            noShowCount: 2,
            bookingStatus: 'prepaid_only',
          },
        })
      );
    });

    it('should block customer on third no-show', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({ noShowCount: 2 });

      await service.markNoShow('tenant-1', 'apt-1', 'user-1');

      expect(mockPrisma.customer.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            noShowCount: 3,
            bookingStatus: 'blocked',
          },
        })
      );
    });

    it('should create audit log for no-show', async () => {
      mockPrisma.customer.findUnique.mockResolvedValue({ noShowCount: 0 });

      await service.markNoShow('tenant-1', 'apt-1', 'user-1');

      expect(mockPrisma.auditLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'NO_SHOW_MARKED',
            entityType: 'appointment',
          }),
        })
      );
    });
  });
});
