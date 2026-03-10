/**
 * Staff Jobs Processor (Conditional)
 *
 * Handles background jobs for staff management:
 * - Auto-absent: Mark staff as absent at end of day if no attendance
 * - Leave balance init: Initialize leave balances for new financial year
 * - Payslip generation and distribution
 *
 * When ENABLE_REDIS is false, the worker is not created.
 */

import { Worker, Job } from 'bullmq';
import type { ConnectionOptions } from 'bullmq';
import Redis from 'ioredis';
import { parseISO, getDay } from 'date-fns';

import { env } from '@/config/env';
import { logger } from '@/lib/logger';
import { prisma } from '@/lib/prisma';
import { isRedisEnabled } from '@/lib/redis';
import {
  QUEUE_NAMES,
  STAFF_JOB_TYPES,
  AutoAbsentJobData,
  LeaveBalanceInitJobData,
  PayslipGenerateJobData,
  PayslipEmailJobData,
  PayslipWhatsAppJobData,
} from './index';

// Conditional Redis connection and worker
let connection: Redis | null = null;
let staffWorker: Worker | null = null;

/**
 * Process auto-absent job
 * Marks staff as absent at end of day if they have no attendance record
 */
async function processAutoAbsent(job: Job<AutoAbsentJobData>) {
  const { tenantId, branchId, date } = job.data;
  const attendanceDate = parseISO(date);
  const dayOfWeek = getDay(attendanceDate);

  logger.info({ tenantId, branchId, date }, 'Processing auto-absent job');

  // Get all active staff assigned to this branch
  const staffList = await prisma.staffProfile.findMany({
    where: {
      tenantId,
      isActive: true,
      user: {
        isActive: true,
        branchAssignments: {
          some: { branchId },
        },
      },
    },
    include: {
      user: {
        select: { id: true, name: true },
      },
    },
  });

  let absentCount = 0;
  let skippedCount = 0;

  for (const staff of staffList) {
    // Check if attendance record already exists
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId: staff.userId,
        branchId,
        attendanceDate,
      },
    });

    // Skip if already has attendance (present, half_day, on_leave, etc.)
    if (existingAttendance) {
      skippedCount++;
      continue;
    }

    // Check if staff is on approved leave
    const approvedLeave = await prisma.leave.findFirst({
      where: {
        userId: staff.userId,
        status: 'approved',
        startDate: { lte: attendanceDate },
        endDate: { gte: attendanceDate },
      },
    });

    if (approvedLeave) {
      // Create attendance record with on_leave status
      await prisma.attendance.create({
        data: {
          tenantId,
          branchId,
          userId: staff.userId,
          attendanceDate,
          status: 'on_leave',
          leaveId: approvedLeave.id,
          isManualEntry: true,
          notes: `Auto-marked: On ${approvedLeave.leaveType} leave`,
        },
      });
      skippedCount++;
      continue;
    }

    // Check if it's a week off day (Sunday = 0)
    // Get staff's shift to check applicable days
    const shiftAssignment = await prisma.staffShiftAssignment.findFirst({
      where: {
        userId: staff.userId,
        branchId,
        effectiveFrom: { lte: attendanceDate },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: attendanceDate } }],
      },
      include: { shift: true },
    });

    if (shiftAssignment?.shift) {
      const applicableDays = shiftAssignment.shift.applicableDays as number[];
      if (!applicableDays.includes(dayOfWeek)) {
        // It's a week off day
        await prisma.attendance.create({
          data: {
            tenantId,
            branchId,
            userId: staff.userId,
            attendanceDate,
            status: 'week_off',
            isManualEntry: true,
            notes: 'Auto-marked: Week off',
          },
        });
        skippedCount++;
        continue;
      }
    }

    // Mark as absent
    await prisma.attendance.create({
      data: {
        tenantId,
        branchId,
        userId: staff.userId,
        attendanceDate,
        status: 'absent',
        isManualEntry: true,
        notes: 'Auto-marked: No check-in recorded',
      },
    });
    absentCount++;

    logger.debug({ userId: staff.userId, userName: staff.user.name }, 'Marked staff as absent');
  }

  logger.info(
    { tenantId, branchId, date, absentCount, skippedCount, totalStaff: staffList.length },
    'Auto-absent job completed'
  );

  return { absentCount, skippedCount, totalStaff: staffList.length };
}

/**
 * Process leave balance initialization job
 * Creates leave balances for all staff at the start of a new financial year
 */
async function processLeaveBalanceInit(job: Job<LeaveBalanceInitJobData>) {
  const { tenantId, financialYear } = job.data;

  logger.info({ tenantId, financialYear }, 'Processing leave balance initialization');

  // Get tenant leave policies
  const policies = await prisma.tenantLeavePolicy.findMany({
    where: { tenantId, isActive: true },
  });

  if (policies.length === 0) {
    logger.warn({ tenantId }, 'No leave policies found for tenant');
    return { created: 0, skipped: 0 };
  }

  // Get all active staff
  const staffList = await prisma.staffProfile.findMany({
    where: { tenantId, isActive: true },
    select: { userId: true },
  });

  let createdCount = 0;
  let skippedCount = 0;

  // Get previous financial year for carry forward
  const [startYear] = financialYear.split('-').map(Number);
  const prevFinancialYear = `${startYear - 1}-${(startYear % 100).toString().padStart(2, '0')}`;

  for (const staff of staffList) {
    for (const policy of policies) {
      // Check if balance already exists (idempotency)
      const existing = await prisma.leaveBalance.findFirst({
        where: {
          userId: staff.userId,
          financialYear,
          leaveType: policy.leaveType,
        },
      });

      if (existing) {
        skippedCount++;
        continue;
      }

      // Calculate carry forward for earned leave
      let carryForward = 0;
      if (policy.leaveType === 'earned' && policy.maxCarryForward.toNumber() > 0) {
        const prevBalance = await prisma.leaveBalance.findFirst({
          where: {
            userId: staff.userId,
            financialYear: prevFinancialYear,
            leaveType: 'earned',
          },
        });

        if (prevBalance) {
          const remaining = prevBalance.currentBalance.toNumber();
          carryForward = Math.min(remaining, policy.maxCarryForward.toNumber());
        }
      }

      // Create new balance
      const openingBalance = policy.annualEntitlement.toNumber() + carryForward;
      await prisma.leaveBalance.create({
        data: {
          tenantId,
          userId: staff.userId,
          financialYear,
          leaveType: policy.leaveType,
          openingBalance,
          carriedForward: carryForward,
          currentBalance: openingBalance,
          used: 0,
        },
      });
      createdCount++;
    }
  }

  logger.info(
    { tenantId, financialYear, createdCount, skippedCount },
    'Leave balance initialization completed'
  );

  return { created: createdCount, skipped: skippedCount };
}

/**
 * Process payslip generation job
 * Generates payslip PDFs for all items in a payroll
 */
async function processPayslipGenerate(job: Job<PayslipGenerateJobData>) {
  const { tenantId, payrollId } = job.data;

  logger.info({ tenantId, payrollId }, 'Processing payslip generation');

  // Get payroll with items
  const payroll = await prisma.payroll.findFirst({
    where: { id: payrollId, tenantId },
    include: {
      items: {
        include: {
          staffProfile: {
            include: {
              user: { select: { id: true, name: true, email: true, phone: true } },
            },
          },
        },
      },
    },
  });

  if (!payroll) {
    throw new Error(`Payroll not found: ${payrollId}`);
  }

  // Get branch name for payslip number prefix
  let branchCode = 'HQ';
  if (payroll.branchId) {
    const branch = await prisma.branch.findUnique({
      where: { id: payroll.branchId },
      select: { name: true },
    });
    if (branch?.name) {
      branchCode = branch.name.substring(0, 3).toUpperCase();
    }
  }

  let generatedCount = 0;

  for (const item of payroll.items) {
    // Check if payslip already exists
    const existing = await prisma.payslip.findFirst({
      where: { payrollItemId: item.id },
    });

    if (existing) {
      continue;
    }

    // Generate payslip number
    const sequence = await getNextPayslipSequence(tenantId, payroll.payrollMonth);
    const payslipNumber = `${branchCode}/${payroll.payrollMonth}/${sequence.toString().padStart(4, '0')}`;

    // Create payslip record (PDF generation will be handled separately)
    await prisma.payslip.create({
      data: {
        tenantId,
        payrollItemId: item.id,
        userId: item.userId,
        payslipNumber,
        payslipMonth: payroll.payrollMonth,
        generatedAt: new Date(),
        // PDF URL will be set after generation
      },
    });
    generatedCount++;
  }

  logger.info({ tenantId, payrollId, generatedCount }, 'Payslip generation completed');

  return { generatedCount };
}

/**
 * Get next payslip sequence number for a month
 */
async function getNextPayslipSequence(tenantId: string, payrollMonth: string): Promise<number> {
  const count = await prisma.payslip.count({
    where: {
      tenantId,
      payslipMonth: payrollMonth,
    },
  });
  return count + 1;
}

/**
 * Process payslip email job
 */
async function processPayslipEmail(job: Job<PayslipEmailJobData>) {
  const { tenantId, payslipId, staffEmail } = job.data;

  logger.info({ tenantId, payslipId, staffEmail }, 'Processing payslip email');

  // Get payslip with related data
  const payslip = await prisma.payslip.findFirst({
    where: { id: payslipId, tenantId },
    include: {
      payrollItem: {
        include: {
          staffProfile: {
            include: { user: { select: { name: true, email: true } } },
          },
        },
      },
    },
  });

  if (!payslip) {
    throw new Error(`Payslip not found: ${payslipId}`);
  }

  // TODO: Implement actual email sending with AWS SES
  // For now, just update the status
  await prisma.payslip.update({
    where: { id: payslipId },
    data: {
      emailedAt: new Date(),
      emailStatus: 'sent',
    },
  });

  logger.info({ payslipId, staffEmail }, 'Payslip email sent');

  return { success: true };
}

/**
 * Process payslip WhatsApp job
 */
async function processPayslipWhatsApp(job: Job<PayslipWhatsAppJobData>) {
  const { tenantId, payslipId, staffPhone } = job.data;

  logger.info({ tenantId, payslipId, staffPhone }, 'Processing payslip WhatsApp');

  // Get payslip
  const payslip = await prisma.payslip.findFirst({
    where: { id: payslipId, tenantId },
  });

  if (!payslip) {
    throw new Error(`Payslip not found: ${payslipId}`);
  }

  // TODO: Implement actual WhatsApp sending
  // For now, just update the status
  await prisma.payslip.update({
    where: { id: payslipId },
    data: {
      whatsappSentAt: new Date(),
      whatsappStatus: 'sent',
    },
  });

  logger.info({ payslipId, staffPhone }, 'Payslip WhatsApp sent');

  return { success: true };
}

// Create worker only if Redis is enabled
if (isRedisEnabled && env.REDIS_URL) {
  connection = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
  });

  staffWorker = new Worker(
    QUEUE_NAMES.STAFF,
    async (job: Job) => {
      switch (job.name) {
        case STAFF_JOB_TYPES.AUTO_ABSENT:
          return processAutoAbsent(job as Job<AutoAbsentJobData>);
        case STAFF_JOB_TYPES.LEAVE_BALANCE_INIT:
          return processLeaveBalanceInit(job as Job<LeaveBalanceInitJobData>);
        case STAFF_JOB_TYPES.PAYSLIP_GENERATE:
          return processPayslipGenerate(job as Job<PayslipGenerateJobData>);
        case STAFF_JOB_TYPES.PAYSLIP_EMAIL:
          return processPayslipEmail(job as Job<PayslipEmailJobData>);
        case STAFF_JOB_TYPES.PAYSLIP_WHATSAPP:
          return processPayslipWhatsApp(job as Job<PayslipWhatsAppJobData>);
        default:
          throw new Error(`Unknown job type: ${job.name}`);
      }
    },
    {
      connection: connection as unknown as ConnectionOptions,
      concurrency: 5,
    }
  );

  staffWorker.on('completed', (job) => {
    logger.info({ jobId: job.id, jobName: job.name }, 'Staff job completed');
  });

  staffWorker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, jobName: job?.name, error: err.message }, 'Staff job failed');
  });

  logger.info('Staff worker initialized');
} else {
  logger.warn('Redis disabled - staff worker not initialized');
}

// Export worker (may be null if Redis disabled)
export { staffWorker };

// Graceful shutdown
export async function closeStaffWorker() {
  if (!isRedisEnabled) {
    logger.info('Redis disabled - no staff worker to close');
    return;
  }

  if (staffWorker) await staffWorker.close();
  if (connection) await connection.quit();
  logger.info('Staff worker closed');
}
