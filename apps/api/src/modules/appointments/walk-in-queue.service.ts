import { PrismaClient } from '@prisma/client';
import { startOfDay, parseISO } from 'date-fns';
import { AppError } from '../../lib/errors';
import { AppointmentsService } from './appointments.service';
import type { AddToQueueInput } from './appointments.schema';

export class WalkInQueueService {
  constructor(
    private prisma: PrismaClient,
    private appointmentsService: AppointmentsService
  ) {}

  /**
   * Add customer to walk-in queue
   */
  async addToQueue(tenantId: string, branchId: string, input: AddToQueueInput, _userId: string) {
    const today = startOfDay(new Date());

    // Generate token number (sequential per branch per day)
    const tokenNumber = await this.generateToken(branchId, today);

    // Calculate estimated wait time
    const estimatedWait = await this.calculateEstimatedWait(tenantId, branchId, input.serviceIds);

    // Get current position
    const position = (await this.getCurrentQueueLength(tenantId, branchId, today)) + 1;

    // Create queue entry
    const entry = await this.prisma.walkInQueue.create({
      data: {
        tenantId,
        branchId,
        queueDate: today,
        tokenNumber,
        customerId: input.customerId,
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
    };
  }

  /**
   * Get current queue for a branch
   */
  async getQueue(tenantId: string, branchId: string, date?: string) {
    const queueDate = date ? startOfDay(parseISO(date)) : startOfDay(new Date());

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
      throw new AppError('Queue entry not found', 404, 'QUEUE_NOT_FOUND');
    }

    if (entry.status !== 'waiting') {
      throw new AppError('Customer is not in waiting status', 400, 'INVALID_QUEUE_STATUS');
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
      throw new AppError('Queue entry not found', 404, 'QUEUE_NOT_FOUND');
    }

    if (!['waiting', 'called'].includes(entry.status)) {
      throw new AppError(
        'Customer cannot be served in current status',
        400,
        'INVALID_QUEUE_STATUS'
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
      throw new AppError('Queue entry not found', 404, 'QUEUE_NOT_FOUND');
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
      throw new AppError('Queue entry not found', 404, 'QUEUE_NOT_FOUND');
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
   */
  private async calculateEstimatedWait(
    tenantId: string,
    branchId: string,
    serviceIds: string[]
  ): Promise<number> {
    // Get waiting customers ahead
    const today = startOfDay(new Date());

    const waitingAhead = await this.prisma.walkInQueue.count({
      where: {
        tenantId,
        branchId,
        queueDate: today,
        status: 'waiting',
      },
    });

    // Get average service time for requested services
    const services = await this.prisma.service.findMany({
      where: { id: { in: serviceIds } },
      select: { durationMinutes: true },
    });

    const avgServiceTime =
      services.length > 0
        ? services.reduce((sum, s) => sum + s.durationMinutes, 0) / services.length
        : 30; // Default 30 minutes

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

    if (availableStylists === 0) return waitingAhead * avgServiceTime;

    // Estimate: (waiting customers * avg time) / available stylists
    return Math.ceil((waitingAhead * avgServiceTime) / availableStylists);
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
