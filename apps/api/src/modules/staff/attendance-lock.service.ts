/**
 * Attendance Lock Service
 *
 * Handles attendance locking based on payroll status.
 * Once payroll is processed for a month, attendance records
 * for that month should be locked to prevent modifications.
 */

import { prisma } from '@/lib/prisma';
import { BadRequestError } from '@/lib/errors';

export interface AttendanceLockStatus {
  isLocked: boolean;
  payrollId?: string;
  payrollStatus?: string;
  lockedAt?: Date;
  lockedBy?: string;
  message: string;
}

/**
 * Check if a specific month's attendance is locked for a branch
 */
export async function isMonthLocked(
  tenantId: string,
  branchId: string | null,
  month: string // YYYY-MM format
): Promise<AttendanceLockStatus> {
  // Find payroll for the month
  const payroll = await prisma.payroll.findFirst({
    where: {
      tenantId,
      payrollMonth: month,
      ...(branchId ? { branchId } : {}),
      // Attendance is locked once payroll is processed (not draft)
      status: { in: ['processing', 'approved', 'paid'] },
    },
    select: {
      id: true,
      status: true,
      processedAt: true,
      processedBy: true,
    },
  });

  if (!payroll) {
    return {
      isLocked: false,
      message: 'Attendance is open for modifications',
    };
  }

  return {
    isLocked: true,
    payrollId: payroll.id,
    payrollStatus: payroll.status,
    lockedAt: payroll.processedAt ?? undefined,
    lockedBy: payroll.processedBy ?? undefined,
    message: `Attendance is locked. Payroll for ${month} is in ${payroll.status} status.`,
  };
}

/**
 * Validate if attendance can be modified for a specific date
 * Throws BadRequestError if locked
 */
export async function validateAttendanceModification(
  tenantId: string,
  branchId: string,
  attendanceDate: Date | string
): Promise<void> {
  const date = typeof attendanceDate === 'string' ? new Date(attendanceDate) : attendanceDate;
  const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

  const lockStatus = await isMonthLocked(tenantId, branchId, month);

  if (lockStatus.isLocked) {
    throw new BadRequestError(
      'ATTENDANCE_LOCKED',
      `Cannot modify attendance for ${month}. ${lockStatus.message}`
    );
  }
}
