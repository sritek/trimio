import { PrismaClient } from '@prisma/client';
import { AppError } from '../../lib/errors';
import { AppointmentsService } from './appointments.service';
import type { AddToQueueInput } from './appointments.schema';

/**
 * Parse a date string (yyyy-MM-dd) to UTC midnight Date
 */
function parseToUTCDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/**
 * Get today's date as UTC midnight
 */
function getTodayUTC(): Date {
  const today = new Date();
  return new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0));
}

export class WalkInQueueService {
  constructor(
    private prisma: PrismaClient,
    private appointmentsService: AppointmentsService
  ) {}

  /**
   * Add customer to walk-in queue
   * If no customerId provided but phone is given, looks up or creates customer
   * If no phone is provided, no customer record is created (same as appointment creation)
   */
  async addToQueue(tenantId: string, branchId: string, input: AddToQueueInput, _userId: string) {
    const today = getTodayUTC();

    // Resolve customer ID - either use provided, or lookup/create by phone
    // If no phone is provided, we don't create a customer (matches appointment creation behavior)
    let customerId = input.customerId;
    let customerCreated = false;

    if (!customerId && input.customerPhone) {
      // Try to find existing customer by phone
      const existingCustomer = await this.prisma.customer.findFirst({
        where: {
          tenantId,
          phone: input.customerPhone,
          deletedAt: null,
        },
        select: { id: true },
      });

      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        // Create new customer
        const newCustomer = await this.prisma.customer.create({
          data: {
            tenantId,
            phone: input.customerPhone,
            name: input.customerName,
            firstVisitBranchId: branchId,
            source: 'add_walk_in',
          },
        });
        customerId = newCustomer.id;
        customerCreated = true;
      }
    }
    // If no phone provided, customerId remains undefined - no customer record created
    // The customer will be created later when the appointment is created (if phone is provided then)

    // Generate token number (sequential per branch per day)
    const tokenNumber = await this.generateToken(branchId, today);

    // Calculate estimated wait time
    const estimatedWait = await this.calculateEstimatedWait(tenantId, branchId, input.serviceIds);

    // Get current position
    const position = (await this.getCurrentQueueLength(tenantId, branchId, today)) + 1;

    // Create queue entry - always with customerId now
    const entry = await this.prisma.walkInQueue.create({
      data: {
        tenantId,
        branchId,
        queueDate: today,
        tokenNumber,
        customerId,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        serviceIds: input.serviceIds,
        stylistPreferenceId: input.stylistPreferenceId,
        genderPreference: input.genderPreference,
        status: 'waiting',
        position,
        estimatedWaitMinutes: estimatedWait,
      },
    });

    return {
      queueEntry: entry,
      tokenNumber,
      position,
      estimatedWaitMinutes: estimatedWait,
      customerCreated,
    };
  }

  /**
   * Get current queue for a branch
   */
  async getQueue(tenantId: string, branchId: string, date?: string) {
    const queueDate = date ? parseToUTCDate(date) : getTodayUTC();

    const queue = await this.prisma.walkInQueue.findMany({
      where: {
        tenantId,
        branchId,
        queueDate,
        status: { in: ['waiting', 'called', 'serving'] },
      },
      orderBy: { position: 'asc' },
    });

    const stats = await this.getQueueStats(tenantId, branchId, queueDate);

    // Get currently serving
    const currentlyServing = await this.prisma.walkInQueue.findMany({
      where: {
        tenantId,
        branchId,
        queueDate,
        status: 'serving',
      },
      select: {
        tokenNumber: true,
        stylistPreferenceId: true,
      },
    });

    return {
      branchId,
      date: queueDate.toISOString().split('T')[0],
      queue,
      stats,
      currentlyServing: currentlyServing.map((s) => ({
        tokenNumber: s.tokenNumber,
        stylistId: s.stylistPreferenceId,
      })),
    };
  }

  /**
   * Call customer from queue
   */
  async callCustomer(tenantId: string, queueEntryId: string, _userId: string) {
    const entry = await this.prisma.walkInQueue.findFirst({
      where: { id: queueEntryId, tenantId },
    });

    if (!entry) {
      throw new AppError('QUEUE_NOT_FOUND', 'Queue entry not found', 404);
    }

    if (entry.status !== 'waiting') {
      throw new AppError('INVALID_QUEUE_STATUS', 'Customer is not in waiting status', 400);
    }

    const updated = await this.prisma.walkInQueue.update({
      where: { id: queueEntryId },
      data: {
        status: 'called',
        calledAt: new Date(),
      },
    });

    // Recalculate positions for remaining queue
    await this.recalculatePositions(tenantId, entry.branchId, entry.queueDate);

    return updated;
  }

  /**
   * Start serving customer (creates appointment)
   */
  async startServing(tenantId: string, queueEntryId: string, stylistId: string, userId: string) {
    const entry = await this.prisma.walkInQueue.findFirst({
      where: { id: queueEntryId, tenantId },
    });

    if (!entry) {
      throw new AppError('QUEUE_NOT_FOUND', 'Queue entry not found', 404);
    }

    if (!['waiting', 'called'].includes(entry.status)) {
      throw new AppError(
        'INVALID_QUEUE_STATUS',
        'Customer cannot be served in current status',
        400
      );
    }

    // Create walk-in appointment
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    const result = await this.appointmentsService.createAppointment(
      tenantId,
      entry.branchId,
      {
        branchId: entry.branchId,
        customerId: entry.customerId || undefined,
        customerName: entry.customerName,
        customerPhone: entry.customerPhone || undefined,
        scheduledDate: entry.queueDate.toISOString().split('T')[0],
        scheduledTime: currentTime,
        services: entry.serviceIds.map((id) => ({ serviceId: id, quantity: 1 })),
        stylistId,
        bookingType: 'walk_in',
        assignLater: false,
      },
      userId
    );

    // Update queue entry
    const updatedEntry = await this.prisma.walkInQueue.update({
      where: { id: queueEntryId },
      data: {
        status: 'serving',
        appointmentId: result.appointment.id,
      },
    });

    // Recalculate positions
    await this.recalculatePositions(tenantId, entry.branchId, entry.queueDate);

    return {
      queueEntry: updatedEntry,
      appointment: result.appointment,
    };
  }

  /**
   * Mark queue entry as complete
   */
  async markComplete(tenantId: string, queueEntryId: string) {
    const entry = await this.prisma.walkInQueue.findFirst({
      where: { id: queueEntryId, tenantId },
    });

    if (!entry) {
      throw new AppError('QUEUE_NOT_FOUND', 'Queue entry not found', 404);
    }

    return this.prisma.walkInQueue.update({
      where: { id: queueEntryId },
      data: { status: 'completed' },
    });
  }

  /**
   * Mark customer as left without service
   */
  async markLeft(tenantId: string, queueEntryId: string) {
    const entry = await this.prisma.walkInQueue.findFirst({
      where: { id: queueEntryId, tenantId },
    });

    if (!entry) {
      throw new AppError('QUEUE_NOT_FOUND', 'Queue entry not found', 404);
    }

    const updated = await this.prisma.walkInQueue.update({
      where: { id: queueEntryId },
      data: { status: 'left' },
    });

    // Recalculate positions
    await this.recalculatePositions(tenantId, entry.branchId, entry.queueDate);

    return updated;
  }

  /**
   * Generate sequential token number for the day
   */
  private async generateToken(branchId: string, date: Date): Promise<number> {
    const lastToken = await this.prisma.walkInQueue.findFirst({
      where: { branchId, queueDate: date },
      orderBy: { tokenNumber: 'desc' },
      select: { tokenNumber: true },
    });

    return (lastToken?.tokenNumber ?? 0) + 1;
  }

  /**
   * Get current queue length
   */
  private async getCurrentQueueLength(
    tenantId: string,
    branchId: string,
    date: Date
  ): Promise<number> {
    return this.prisma.walkInQueue.count({
      where: {
        tenantId,
        branchId,
        queueDate: date,
        status: { in: ['waiting', 'called'] },
      },
    });
  }

  /**
   * Calculate estimated wait time
   * For multi-service appointments, uses parallel optimization when services can run in parallel
   */
  private async calculateEstimatedWait(
    tenantId: string,
    branchId: string,
    serviceIds: string[]
  ): Promise<number> {
    // Get waiting customers ahead
    const today = getTodayUTC();

    const waitingAhead = await this.prisma.walkInQueue.count({
      where: {
        tenantId,
        branchId,
        queueDate: today,
        status: 'waiting',
      },
    });

    // Get service details including duration and parallel settings
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { id: true, durationMinutes: true, defaultRunParallel: true },
    });

    // Calculate total duration considering parallel services
    // For walk-ins, we assume sequential execution by default unless services are marked as "always" parallel
    let totalServiceTime = 0;
    if (services.length > 0) {
      // Group services that can run in parallel
      const parallelServices = services.filter((s) => s.defaultRunParallel === 'always');
      const sequentialServices = services.filter((s) => s.defaultRunParallel !== 'always');

      // Sequential services: sum of durations
      const sequentialTime = sequentialServices.reduce((sum, s) => sum + s.durationMinutes, 0);

      // Parallel services: max duration (they run at the same time)
      const parallelTime =
        parallelServices.length > 0
          ? Math.max(...parallelServices.map((s) => s.durationMinutes))
          : 0;

      totalServiceTime = sequentialTime + parallelTime;
    } else {
      totalServiceTime = 30; // Default 30 minutes
    }

    // Get number of available stylists (simplified - count active stylists at branch)
    const availableStylists = await this.prisma.user.count({
      where: {
        tenantId,
        role: 'stylist',
        isActive: true,
        branchAssignments: {
          some: { branchId },
        },
      },
    });

    if (availableStylists === 0) return waitingAhead * totalServiceTime;

    // Estimate: (waiting customers * total service time) / available stylists
    return Math.ceil((waitingAhead * totalServiceTime) / availableStylists);
  }

  /**
   * Get queue statistics
   */
  private async getQueueStats(tenantId: string, branchId: string, date: Date) {
    const [waiting, serving, completed, left] = await Promise.all([
      this.prisma.walkInQueue.count({
        where: { tenantId, branchId, queueDate: date, status: 'waiting' },
      }),
      this.prisma.walkInQueue.count({
        where: { tenantId, branchId, queueDate: date, status: 'serving' },
      }),
      this.prisma.walkInQueue.count({
        where: { tenantId, branchId, queueDate: date, status: 'completed' },
      }),
      this.prisma.walkInQueue.count({
        where: { tenantId, branchId, queueDate: date, status: 'left' },
      }),
    ]);

    // Calculate average wait time from completed entries
    const completedEntries = await this.prisma.walkInQueue.findMany({
      where: {
        tenantId,
        branchId,
        queueDate: date,
        status: 'completed',
        calledAt: { not: null },
      },
      select: { createdAt: true, calledAt: true },
    });

    let averageWaitTime = 0;
    if (completedEntries.length > 0) {
      const totalWait = completedEntries.reduce((sum, entry) => {
        if (entry.calledAt) {
          return sum + (entry.calledAt.getTime() - entry.createdAt.getTime()) / 60000;
        }
        return sum;
      }, 0);
      averageWaitTime = Math.round(totalWait / completedEntries.length);
    }

    return {
      waiting,
      serving,
      completed,
      left,
      averageWaitTime,
    };
  }

  /**
   * Recalculate positions for waiting customers
   */
  private async recalculatePositions(tenantId: string, branchId: string, date: Date) {
    const waitingEntries = await this.prisma.walkInQueue.findMany({
      where: {
        tenantId,
        branchId,
        queueDate: date,
        status: 'waiting',
      },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    // Update positions
    for (let i = 0; i < waitingEntries.length; i++) {
      await this.prisma.walkInQueue.update({
        where: { id: waitingEntries[i].id },
        data: { position: i + 1 },
      });
    }
  }
}
