/**
 * Staff Management Service
 *
 * Handles staff profiles, attendance, leaves, commissions, and payroll
 */

import { Prisma, UserRole } from '@prisma/client';
import bcrypt from 'bcrypt';
import { format, differenceInHours, parseISO, getDaysInMonth, getDay } from 'date-fns';

import { prisma, serializeDecimals } from '@/lib/prisma';
import { NotFoundError, ConflictError, BadRequestError } from '@/lib/errors';
import type { PaginatedResult } from '@/lib/types';
import { validateCheckInLocation, isValidCoordinates, GeoCoordinates } from './geo-validator';
import { validateAttendanceModification } from './attendance-lock.service';

import type {
  CreateStaffInput,
  UpdateStaffInput,
  ListStaffQuery,
  CheckInInput,
  CheckOutInput,
  ManualAttendanceInput,
  ListAttendanceQuery,
  DailyAttendanceQuery,
  ApplyLeaveInput,
  ListLeavesQuery,
  ListCommissionsQuery,
  AddDeductionInput,
  UpdateDeductionInput,
  GeneratePayrollInput,
  ListPayrollQuery,
} from './staff.schema';

// ============================================
// Staff Profile Service
// ============================================

export const staffService = {
  /**
   * Create a new staff member with user account and profile
   */
  async create(tenantId: string, input: CreateStaffInput, _createdBy?: string) {
    // Check if phone already exists
    const existingUser = await prisma.user.findFirst({
      where: { tenantId, phone: input.phone, deletedAt: null },
    });

    if (existingUser) {
      throw new ConflictError('STAFF_ALREADY_EXISTS', 'Staff with this phone already exists');
    }

    // Check employee code uniqueness if provided
    if (input.employeeCode) {
      const existingCode = await prisma.staffProfile.findFirst({
        where: { tenantId, employeeCode: input.employeeCode },
      });
      if (existingCode) {
        throw new ConflictError('INVALID_EMPLOYEE_CODE', 'Employee code already in use');
      }
    }

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, 10);

    // Create user and profile in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          tenantId,
          name: input.name,
          email: input.email,
          phone: input.phone,
          passwordHash,
          role: input.role,
          gender: input.gender,
          isActive: true,
        },
      });

      // Create staff profile
      const profile = await tx.staffProfile.create({
        data: {
          tenantId,
          userId: user.id,
          dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
          bloodGroup: input.bloodGroup,
          emergencyContactName: input.emergencyContactName,
          emergencyContactPhone: input.emergencyContactPhone,
          addressLine1: input.addressLine1,
          addressLine2: input.addressLine2,
          city: input.city,
          state: input.state,
          pincode: input.pincode,
          employeeCode: input.employeeCode,
          designation: input.designation,
          department: input.department,
          dateOfJoining: new Date(input.dateOfJoining),
          employmentType: input.employmentType,
          skillLevel: input.skillLevel,
          specializations: input.specializations || [],
          aadharNumber: input.aadharNumber,
          panNumber: input.panNumber,
          bankAccountNumber: input.bankAccountNumber,
          bankName: input.bankName,
          bankIfsc: input.bankIfsc,
          salaryType: input.salaryType,
          baseSalary: input.baseSalary,
          commissionEnabled: input.commissionEnabled ?? true,
          defaultCommissionType: input.defaultCommissionType,
          defaultCommissionRate: input.defaultCommissionRate,
          isActive: true,
        },
      });

      // Create branch assignments
      for (const assignment of input.branchAssignments) {
        await tx.userBranch.create({
          data: {
            userId: user.id,
            branchId: assignment.branchId,
            isPrimary: assignment.isPrimary,
          },
        });
      }

      return { user, profile };
    });

    return {
      staff: result.profile,
      user: {
        id: result.user.id,
        name: result.user.name,
        email: result.user.email,
        phone: result.user.phone,
        role: result.user.role,
      },
      credentials: {
        username: input.phone,
        temporaryPassword: true,
      },
    };
  },

  /**
   * Get staff member by ID
   */
  async getById(tenantId: string, userId: string) {
    const profile = await prisma.staffProfile.findFirst({
      where: { tenantId, userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            gender: true,
            avatarUrl: true,
            isActive: true,
            lastLoginAt: true,
            branchAssignments: {
              include: {
                branch: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundError('STAFF_NOT_FOUND', 'Staff member not found');
    }

    return profile;
  },

  /**
   * List staff members with pagination and filters
   */
  async list(tenantId: string, query: ListStaffQuery): Promise<PaginatedResult<unknown>> {
    const { page, limit, search, branchId, role, isActive, employmentType } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.StaffProfileWhereInput = {
      tenantId,
      ...(isActive !== undefined && { isActive }),
      ...(employmentType && { employmentType }),
      user: {
        deletedAt: null,
        ...(role && { role: role as UserRole }),
        ...(search && {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search } },
            { email: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(branchId && {
          branchAssignments: {
            some: { branchId },
          },
        }),
      },
    };

    const [data, total] = await Promise.all([
      prisma.staffProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              gender: true,
              avatarUrl: true,
              isActive: true,
              branchAssignments: {
                include: {
                  branch: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          },
        },
      }),
      prisma.staffProfile.count({ where }),
    ]);

    return {
      data: serializeDecimals(data) as unknown[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Update staff profile
   */
  async update(tenantId: string, userId: string, input: UpdateStaffInput, _updatedBy?: string) {
    const existing = await prisma.staffProfile.findFirst({
      where: { tenantId, userId },
    });

    if (!existing) {
      throw new NotFoundError('STAFF_NOT_FOUND', 'Staff member not found');
    }

    // Check employee code uniqueness if changing
    if (input.employeeCode && input.employeeCode !== existing.employeeCode) {
      const existingCode = await prisma.staffProfile.findFirst({
        where: { tenantId, employeeCode: input.employeeCode, userId: { not: userId } },
      });
      if (existingCode) {
        throw new ConflictError('INVALID_EMPLOYEE_CODE', 'Employee code already in use');
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update user if needed
      if (input.name || input.email || input.role || input.gender) {
        await tx.user.update({
          where: { id: userId },
          data: {
            ...(input.name && { name: input.name }),
            ...(input.email && { email: input.email }),
            ...(input.role && { role: input.role }),
            ...(input.gender && { gender: input.gender }),
          },
        });
      }

      // Update profile
      const profile = await tx.staffProfile.update({
        where: { id: existing.id },
        data: {
          ...(input.dateOfBirth && { dateOfBirth: new Date(input.dateOfBirth) }),
          ...(input.bloodGroup !== undefined && { bloodGroup: input.bloodGroup }),
          ...(input.emergencyContactName !== undefined && {
            emergencyContactName: input.emergencyContactName,
          }),
          ...(input.emergencyContactPhone !== undefined && {
            emergencyContactPhone: input.emergencyContactPhone,
          }),
          ...(input.addressLine1 !== undefined && { addressLine1: input.addressLine1 }),
          ...(input.addressLine2 !== undefined && { addressLine2: input.addressLine2 }),
          ...(input.city !== undefined && { city: input.city }),
          ...(input.state !== undefined && { state: input.state }),
          ...(input.pincode !== undefined && { pincode: input.pincode }),
          ...(input.employeeCode !== undefined && { employeeCode: input.employeeCode }),
          ...(input.designation !== undefined && { designation: input.designation }),
          ...(input.department !== undefined && { department: input.department }),
          ...(input.dateOfJoining && { dateOfJoining: new Date(input.dateOfJoining) }),
          ...(input.employmentType && { employmentType: input.employmentType }),
          ...(input.skillLevel !== undefined && { skillLevel: input.skillLevel }),
          ...(input.specializations !== undefined && { specializations: input.specializations }),
          ...(input.aadharNumber !== undefined && { aadharNumber: input.aadharNumber }),
          ...(input.panNumber !== undefined && { panNumber: input.panNumber }),
          ...(input.bankAccountNumber !== undefined && {
            bankAccountNumber: input.bankAccountNumber,
          }),
          ...(input.bankName !== undefined && { bankName: input.bankName }),
          ...(input.bankIfsc !== undefined && { bankIfsc: input.bankIfsc }),
          ...(input.salaryType && { salaryType: input.salaryType }),
          ...(input.baseSalary !== undefined && { baseSalary: input.baseSalary }),
          ...(input.commissionEnabled !== undefined && {
            commissionEnabled: input.commissionEnabled,
          }),
          ...(input.defaultCommissionType !== undefined && {
            defaultCommissionType: input.defaultCommissionType,
          }),
          ...(input.defaultCommissionRate !== undefined && {
            defaultCommissionRate: input.defaultCommissionRate,
          }),
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              role: true,
              gender: true,
            },
          },
        },
      });

      return profile;
    });

    return result;
  },

  /**
   * Deactivate staff member
   */
  async deactivate(tenantId: string, userId: string, _deactivatedBy?: string) {
    const existing = await prisma.staffProfile.findFirst({
      where: { tenantId, userId },
    });

    if (!existing) {
      throw new NotFoundError('STAFF_NOT_FOUND', 'Staff member not found');
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      await tx.staffProfile.update({
        where: { id: existing.id },
        data: { isActive: false, dateOfLeaving: new Date() },
      });
    });

    return { success: true };
  },
};

// ============================================
// Attendance Service
// ============================================

export const attendanceService = {
  /**
   * Record check-in with optional geo-location validation
   */
  async checkIn(tenantId: string, userId: string, input: CheckInInput) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    const currentTime = format(now, 'HH:mm:ss');

    // Check if attendance is locked for this month
    await validateAttendanceModification(tenantId, input.branchId, today);

    // Check if already checked in
    const existing = await prisma.attendance.findFirst({
      where: { userId, branchId: input.branchId, attendanceDate: new Date(today) },
    });

    if (existing?.checkInTime) {
      throw new ConflictError('ALREADY_CHECKED_IN', 'Already checked in today');
    }

    // Get branch for geo-validation
    const branch = await prisma.branch.findUnique({
      where: { id: input.branchId },
      select: {
        id: true,
        latitude: true,
        longitude: true,
        geoFenceRadius: true,
      },
    });

    // Perform geo-validation if branch has coordinates and location is provided
    let locationValid = true;
    let geoValidationResult: { distance: number; maxAllowedDistance: number } | undefined;

    if (
      branch?.latitude &&
      branch?.longitude &&
      input.location &&
      isValidCoordinates(input.location)
    ) {
      const branchLocation: GeoCoordinates = {
        latitude: branch.latitude.toNumber(),
        longitude: branch.longitude.toNumber(),
      };

      const validationResult = validateCheckInLocation(
        input.location,
        branchLocation,
        branch.geoFenceRadius ?? 100
      );

      locationValid = validationResult.isValid;
      geoValidationResult = {
        distance: validationResult.distance,
        maxAllowedDistance: validationResult.maxAllowedDistance,
      };

      if (!validationResult.isValid) {
        throw new BadRequestError(
          'GEO_OUTSIDE_RADIUS',
          validationResult.errorMessage || 'You are outside the allowed check-in area'
        );
      }
    }

    // Late minutes and scheduled hours are not calculated without shift data
    const lateMinutes = 0;
    const scheduledHours: number | undefined = undefined;

    // Create or update attendance
    const attendance = existing
      ? await prisma.attendance.update({
          where: { id: existing.id },
          data: {
            checkInTime: currentTime,
            status: 'present',
            lateMinutes,
            scheduledHours,
            isManualEntry: false,
            ...(input.location && {
              checkInLatitude: input.location.latitude,
              checkInLongitude: input.location.longitude,
            }),
          },
        })
      : await prisma.attendance.create({
          data: {
            tenantId,
            branchId: input.branchId,
            userId,
            attendanceDate: new Date(today),
            checkInTime: currentTime,
            status: 'present',
            lateMinutes,
            scheduledHours,
            isManualEntry: false,
            ...(input.location && {
              checkInLatitude: input.location.latitude,
              checkInLongitude: input.location.longitude,
            }),
          },
        });

    return {
      attendance,
      isLate: lateMinutes > 0,
      lateMinutes,
      locationValid,
      geoValidation: geoValidationResult,
    };
  },

  /**
   * Record check-out
   */
  async checkOut(tenantId: string, userId: string, input: CheckOutInput) {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    const currentTime = format(now, 'HH:mm:ss');

    // Check if attendance is locked for this month
    await validateAttendanceModification(tenantId, input.branchId, today);

    // Get today's attendance
    const attendance = await prisma.attendance.findFirst({
      where: { userId, branchId: input.branchId, attendanceDate: new Date(today) },
    });

    if (!attendance) {
      throw new NotFoundError('NO_CHECK_IN', 'No check-in found for today');
    }

    if (attendance.checkOutTime) {
      throw new ConflictError('ALREADY_CHECKED_OUT', 'Already checked out today');
    }

    // Calculate hours
    const checkInTime = parseISO(`${today}T${attendance.checkInTime}`);
    const actualHours = differenceInHours(now, checkInTime);

    const earlyLeaveMinutes = 0;

    // Early leave calculation skipped — no shift data

    // Determine status
    let status = attendance.status;
    const halfDayThreshold = 4;
    if (actualHours < halfDayThreshold && status === 'present') {
      status = 'half_day';
    }

    const updated = await prisma.attendance.update({
      where: { id: attendance.id },
      data: {
        checkOutTime: currentTime,
        actualHours,
        earlyLeaveMinutes,
        status,
        ...(input.location && {
          checkOutLatitude: input.location.latitude,
          checkOutLongitude: input.location.longitude,
        }),
      },
    });

    return {
      attendance: updated,
      actualHours,
      earlyLeaveMinutes,
    };
  },

  /**
   * Manual attendance entry
   */
  async manualEntry(tenantId: string, input: ManualAttendanceInput, _createdBy?: string) {
    // Check if attendance is locked for this month
    await validateAttendanceModification(tenantId, input.branchId, input.attendanceDate);

    // Check if attendance already exists
    const existing = await prisma.attendance.findFirst({
      where: {
        userId: input.userId,
        branchId: input.branchId,
        attendanceDate: new Date(input.attendanceDate),
      },
    });

    const data = {
      tenantId,
      branchId: input.branchId,
      userId: input.userId,
      attendanceDate: new Date(input.attendanceDate),
      checkInTime: input.checkInTime,
      checkOutTime: input.checkOutTime,
      status: input.status,
      notes: input.notes,
      isManualEntry: true,
    };

    const attendance = existing
      ? await prisma.attendance.update({
          where: { id: existing.id },
          data,
        })
      : await prisma.attendance.create({ data });

    return {
      attendance,
      requiresApproval: true,
    };
  },

  /**
   * List attendance records
   */
  async list(tenantId: string, query: ListAttendanceQuery): Promise<PaginatedResult<unknown>> {
    const { page, limit, branchId, userId, startDate, endDate, status } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.AttendanceWhereInput = {
      tenantId,
      ...(branchId && { branchId }),
      ...(userId && { userId }),
      ...(status && { status }),
      ...(startDate &&
        endDate && {
          attendanceDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    const [data, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { attendanceDate: 'desc' },
        include: {
          staffProfile: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
        },
      }),
      prisma.attendance.count({ where }),
    ]);

    return {
      data: serializeDecimals(data) as unknown[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get daily attendance for all staff on a specific date
   * Returns all active staff with their attendance record (or null if not marked)
   */
  async getDailyAttendance(tenantId: string, query: DailyAttendanceQuery) {
    const { branchId, date } = query;
    const targetDate = date ? new Date(date) : new Date(format(new Date(), 'yyyy-MM-dd'));

    // Build staff filter
    const staffWhere: Prisma.StaffProfileWhereInput = {
      tenantId,
      isActive: true,
      ...(branchId && {
        user: {
          branchAssignments: {
            some: { branchId },
          },
        },
      }),
    };

    // Get all active staff
    const staffList = await prisma.staffProfile.findMany({
      where: staffWhere,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            role: true,
            avatarUrl: true,
            isActive: true,
          },
        },
      },
      orderBy: { user: { name: 'asc' } },
    });

    // Get attendance records for the date
    const attendanceWhere: Prisma.AttendanceWhereInput = {
      tenantId,
      attendanceDate: targetDate,
      userId: { in: staffList.map((s) => s.userId) },
      ...(branchId && { branchId }),
    };

    const attendanceRecords = await prisma.attendance.findMany({
      where: attendanceWhere,
    });

    // Build a map of userId -> attendance
    const attendanceMap = new Map(attendanceRecords.map((a) => [a.userId, a]));

    // Merge staff with attendance
    const dailyData = staffList.map((staff) => {
      const attendance = attendanceMap.get(staff.userId);
      return {
        staffId: staff.id,
        userId: staff.userId,
        staffName: staff.user?.name ?? '-',
        role: staff.user?.role ?? '-',
        avatarUrl: staff.user?.avatarUrl ?? null,
        attendanceDate: format(targetDate, 'yyyy-MM-dd'),
        checkInTime: attendance?.checkInTime ?? null,
        checkOutTime: attendance?.checkOutTime ?? null,
        actualHours: attendance?.actualHours ? Number(attendance.actualHours) : null,
        lateMinutes: attendance?.lateMinutes ?? 0,
        earlyLeaveMinutes: attendance?.earlyLeaveMinutes ?? 0,
        status: attendance?.status ?? 'not_marked',
        isManualEntry: attendance?.isManualEntry ?? false,
        notes: attendance?.notes ?? null,
      };
    });

    // Summary counts
    const summary = {
      total: dailyData.length,
      present: dailyData.filter((d) => d.status === 'present').length,
      absent: dailyData.filter((d) => d.status === 'absent').length,
      halfDay: dailyData.filter((d) => d.status === 'half_day').length,
      onLeave: dailyData.filter((d) => d.status === 'on_leave').length,
      holiday: dailyData.filter((d) => d.status === 'holiday').length,
      weekOff: dailyData.filter((d) => d.status === 'week_off').length,
      notMarked: dailyData.filter((d) => d.status === 'not_marked').length,
    };

    return { data: dailyData, summary };
  },

  /**
   * Get attendance summary for a user
   */
  async getSummary(
    tenantId: string,
    userId: string,
    startDate: string,
    endDate: string,
    branchId?: string
  ) {
    const where: Prisma.AttendanceWhereInput = {
      tenantId,
      userId,
      attendanceDate: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      ...(branchId && { branchId }),
    };

    const records = await prisma.attendance.findMany({ where });

    const summary = {
      totalDays: records.length,
      presentDays: records.filter((r) => r.status === 'present').length,
      absentDays: records.filter((r) => r.status === 'absent').length,
      halfDays: records.filter((r) => r.status === 'half_day').length,
      leaveDays: records.filter((r) => r.status === 'on_leave').length,
      holidays: records.filter((r) => r.status === 'holiday').length,
      weekOffs: records.filter((r) => r.status === 'week_off').length,
      totalLateMinutes: records.reduce((sum, r) => sum + r.lateMinutes, 0),
    };

    return summary;
  },
};

// ============================================
// Leave Service
// ============================================

export const leaveService = {
  /**
   * Apply for leave
   */
  async apply(tenantId: string, userId: string, input: ApplyLeaveInput) {
    // Calculate total days
    const startDate = new Date(input.startDate);
    const endDate = new Date(input.endDate);
    const totalDays = input.isHalfDay
      ? 0.5
      : Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    // Check leave balance (except for unpaid)
    if (input.leaveType !== 'unpaid') {
      const financialYear = this.getCurrentFinancialYear();
      const balance = await prisma.leaveBalance.findFirst({
        where: { userId, financialYear, leaveType: input.leaveType },
      });

      if (balance && balance.currentBalance.toNumber() < totalDays) {
        throw new BadRequestError(
          'INSUFFICIENT_LEAVE_BALANCE',
          `Insufficient ${input.leaveType} leave balance. Available: ${balance.currentBalance}, Requested: ${totalDays}`
        );
      }
    }

    // Check for overlapping leaves
    const overlapping = await prisma.leave.findFirst({
      where: {
        userId,
        status: { in: ['pending', 'approved'] },
        OR: [
          {
            startDate: { lte: endDate },
            endDate: { gte: startDate },
          },
        ],
      },
    });

    if (overlapping) {
      throw new ConflictError('OVERLAPPING_LEAVE', 'Leave request overlaps with existing leave');
    }

    // Create leave request
    const leave = await prisma.leave.create({
      data: {
        tenantId,
        userId,
        branchId: input.branchId,
        leaveType: input.leaveType,
        startDate,
        endDate,
        totalDays,
        isHalfDay: input.isHalfDay || false,
        halfDayType: input.halfDayType,
        reason: input.reason,
        status: 'pending',
      },
    });

    return leave;
  },

  /**
   * Approve leave request
   */
  async approve(tenantId: string, leaveId: string, approverId: string, _comment?: string) {
    const leave = await prisma.leave.findFirst({
      where: { id: leaveId, tenantId },
    });

    if (!leave) {
      throw new NotFoundError('LEAVE_NOT_FOUND', 'Leave request not found');
    }

    if (leave.status !== 'pending') {
      throw new BadRequestError('INVALID_STATUS', 'Leave is not in pending status');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update leave status
      const updatedLeave = await tx.leave.update({
        where: { id: leaveId },
        data: {
          status: 'approved',
          approvedBy: approverId,
          approvedAt: new Date(),
        },
      });

      // Deduct from leave balance (except unpaid)
      if (leave.leaveType !== 'unpaid') {
        const financialYear = this.getCurrentFinancialYear();
        await tx.leaveBalance.updateMany({
          where: { userId: leave.userId, financialYear, leaveType: leave.leaveType },
          data: {
            used: { increment: leave.totalDays },
            currentBalance: { decrement: leave.totalDays },
          },
        });
      }

      // Create attendance records for leave days
      const startDate = new Date(leave.startDate);
      const endDate = new Date(leave.endDate);
      const currentDate = new Date(startDate);

      while (currentDate <= endDate) {
        await tx.attendance.upsert({
          where: {
            branchId_userId_attendanceDate: {
              branchId: leave.branchId,
              userId: leave.userId,
              attendanceDate: currentDate,
            },
          },
          create: {
            tenantId,
            branchId: leave.branchId,
            userId: leave.userId,
            attendanceDate: new Date(currentDate),
            status: 'on_leave',
            leaveId: leave.id,
            isManualEntry: true,
            notes: `On ${leave.leaveType} leave`,
          },
          update: {
            status: 'on_leave',
            leaveId: leave.id,
            notes: `On ${leave.leaveType} leave`,
          },
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return updatedLeave;
    });

    return result;
  },

  /**
   * Reject leave request
   */
  async reject(tenantId: string, leaveId: string, approverId: string, reason: string) {
    const leave = await prisma.leave.findFirst({
      where: { id: leaveId, tenantId },
    });

    if (!leave) {
      throw new NotFoundError('LEAVE_NOT_FOUND', 'Leave request not found');
    }

    if (leave.status !== 'pending') {
      throw new BadRequestError('INVALID_STATUS', 'Leave is not in pending status');
    }

    const updatedLeave = await prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: 'rejected',
        approvedBy: approverId,
        approvedAt: new Date(),
        rejectionReason: reason,
      },
    });

    return updatedLeave;
  },

  /**
   * Cancel leave request
   */
  async cancel(tenantId: string, leaveId: string, userId: string) {
    const leave = await prisma.leave.findFirst({
      where: { id: leaveId, tenantId, userId },
    });

    if (!leave) {
      throw new NotFoundError('LEAVE_NOT_FOUND', 'Leave request not found');
    }

    if (!['pending', 'approved'].includes(leave.status)) {
      throw new BadRequestError('INVALID_STATUS', 'Leave cannot be cancelled');
    }

    const result = await prisma.$transaction(async (tx) => {
      // If was approved, restore balance
      if (leave.status === 'approved' && leave.leaveType !== 'unpaid') {
        const financialYear = this.getCurrentFinancialYear();
        await tx.leaveBalance.updateMany({
          where: { userId: leave.userId, financialYear, leaveType: leave.leaveType },
          data: {
            used: { decrement: leave.totalDays },
            currentBalance: { increment: leave.totalDays },
          },
        });

        // Remove attendance records
        await tx.attendance.deleteMany({
          where: { leaveId: leave.id },
        });
      }

      const updatedLeave = await tx.leave.update({
        where: { id: leaveId },
        data: { status: 'cancelled' },
      });

      return updatedLeave;
    });

    return result;
  },

  /**
   * List leave requests
   */
  async list(tenantId: string, query: ListLeavesQuery): Promise<PaginatedResult<unknown>> {
    const { page, limit, userId, branchId, status, leaveType, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.LeaveWhereInput = {
      tenantId,
      ...(userId && { userId }),
      ...(branchId && { branchId }),
      ...(status && { status }),
      ...(leaveType && { leaveType }),
      ...(startDate &&
        endDate && {
          startDate: { gte: new Date(startDate) },
          endDate: { lte: new Date(endDate) },
        }),
    };

    const [data, total] = await Promise.all([
      prisma.leave.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          staffProfile: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
        },
      }),
      prisma.leave.count({ where }),
    ]);

    return {
      data: serializeDecimals(data) as unknown[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get leave balance for a user
   */
  async getBalance(tenantId: string, userId: string, financialYear?: string) {
    const year = financialYear || this.getCurrentFinancialYear();

    const balances = await prisma.leaveBalance.findMany({
      where: { tenantId, userId, financialYear: year },
    });

    return balances;
  },

  /**
   * Get current financial year (April-March)
   */
  getCurrentFinancialYear(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // If before April, use previous year
    if (month < 3) {
      return `${year - 1}-${year.toString().slice(-2)}`;
    }
    return `${year}-${(year + 1).toString().slice(-2)}`;
  },
};

// ============================================
// Commission Service
// ============================================

export const commissionService = {
  /**
   * List commissions
   */
  async list(tenantId: string, query: ListCommissionsQuery): Promise<PaginatedResult<unknown>> {
    const { page, limit, userId, branchId, status, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.CommissionWhereInput = {
      tenantId,
      ...(userId && { userId }),
      ...(branchId && { branchId }),
      ...(status && { status }),
      ...(startDate &&
        endDate && {
          commissionDate: {
            gte: new Date(startDate),
            lte: new Date(endDate),
          },
        }),
    };

    const [data, total] = await Promise.all([
      prisma.commission.findMany({
        where,
        skip,
        take: limit,
        orderBy: { commissionDate: 'desc' },
        include: {
          staffProfile: {
            include: {
              user: {
                select: { id: true, name: true, avatarUrl: true },
              },
            },
          },
        },
      }),
      prisma.commission.count({ where }),
    ]);

    return {
      data: serializeDecimals(data) as unknown[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get commission summary for a user
   */
  async getSummary(tenantId: string, userId: string, startDate: string, endDate: string) {
    const commissions = await prisma.commission.findMany({
      where: {
        tenantId,
        userId,
        commissionDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
    });

    const byStatus = commissions.reduce(
      (acc, c) => {
        acc[c.status] = (acc[c.status] || 0) + c.commissionAmount.toNumber();
        return acc;
      },
      {} as Record<string, number>
    );

    const byService = commissions.reduce(
      (acc, c) => {
        acc[c.serviceName] = (acc[c.serviceName] || 0) + c.commissionAmount.toNumber();
        return acc;
      },
      {} as Record<string, number>
    );

    return {
      totalEarned: commissions.reduce((sum, c) => sum + c.commissionAmount.toNumber(), 0),
      pending: byStatus['pending'] || 0,
      approved: byStatus['approved'] || 0,
      paid: byStatus['paid'] || 0,
      byService,
      transactionCount: commissions.length,
    };
  },

  /**
   * Bulk approve commissions
   */
  async bulkApprove(tenantId: string, commissionIds: string[], _approvedBy: string) {
    const result = await prisma.commission.updateMany({
      where: {
        id: { in: commissionIds },
        tenantId,
        status: 'pending',
      },
      data: {
        status: 'approved',
      },
    });

    return { approvedCount: result.count };
  },
};

// ============================================
// Deduction Service
// ============================================

export const deductionService = {
  /**
   * Add deduction for staff
   */
  async add(tenantId: string, userId: string, input: AddDeductionInput, createdBy?: string) {
    const deduction = await prisma.staffDeduction.create({
      data: {
        tenantId,
        userId,
        deductionType: input.deductionType,
        description: input.description,
        totalAmount: input.totalAmount,
        monthlyDeduction: input.monthlyDeduction,
        remainingAmount: input.totalAmount,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        status: 'active',
        createdBy,
      },
    });

    return deduction;
  },

  /**
   * List deductions for staff
   */
  async listByUser(tenantId: string, userId: string) {
    const deductions = await prisma.staffDeduction.findMany({
      where: { tenantId, userId },
      orderBy: { createdAt: 'desc' },
    });

    return deductions;
  },

  /**
   * Update deduction
   */
  async update(tenantId: string, deductionId: string, input: UpdateDeductionInput) {
    const existing = await prisma.staffDeduction.findFirst({
      where: { id: deductionId, tenantId },
    });

    if (!existing) {
      throw new NotFoundError('DEDUCTION_NOT_FOUND', 'Deduction not found');
    }

    if (existing.status === 'completed') {
      throw new BadRequestError('DEDUCTION_COMPLETED', 'Deduction has already been completed');
    }

    const deduction = await prisma.staffDeduction.update({
      where: { id: deductionId },
      data: {
        ...(input.monthlyDeduction !== undefined && { monthlyDeduction: input.monthlyDeduction }),
        ...(input.endDate && { endDate: new Date(input.endDate) }),
        ...(input.status && { status: input.status }),
      },
    });

    return deduction;
  },

  /**
   * Cancel deduction
   */
  async cancel(tenantId: string, deductionId: string) {
    const existing = await prisma.staffDeduction.findFirst({
      where: { id: deductionId, tenantId },
    });

    if (!existing) {
      throw new NotFoundError('DEDUCTION_NOT_FOUND', 'Deduction not found');
    }

    const deduction = await prisma.staffDeduction.update({
      where: { id: deductionId },
      data: { status: 'cancelled' },
    });

    return deduction;
  },
};

// ============================================
// Payroll Service
// ============================================

export const payrollService = {
  /**
   * Generate payroll for a month
   */
  async generate(tenantId: string, input: GeneratePayrollInput, _generatedBy?: string) {
    const { payrollMonth, branchId } = input;

    // Check if payroll already exists
    const existing = await prisma.payroll.findFirst({
      where: { tenantId, payrollMonth, branchId: branchId || null },
    });

    if (existing && existing.status !== 'draft') {
      throw new ConflictError('PAYROLL_EXISTS', 'Payroll already exists for this month');
    }

    // Parse month
    const [year, month] = payrollMonth.split('-').map(Number);
    const startDate = `${payrollMonth}-01`;
    const daysInMonth = getDaysInMonth(new Date(year, month - 1));
    const endDate = `${payrollMonth}-${daysInMonth.toString().padStart(2, '0')}`;

    // Get all active staff
    const staffQuery: Prisma.StaffProfileWhereInput = {
      tenantId,
      isActive: true,
      ...(branchId && {
        user: {
          branchAssignments: {
            some: { branchId },
          },
        },
      }),
    };

    const staffList = await prisma.staffProfile.findMany({
      where: staffQuery,
      include: {
        user: {
          select: { id: true, name: true },
        },
      },
    });

    // Calculate payroll for each staff
    const items: any[] = [];
    const warnings: string[] = [];

    for (const staff of staffList) {
      try {
        const itemData = await this.calculateStaffPayroll(
          tenantId,
          staff,
          startDate,
          endDate,
          branchId
        );
        items.push(itemData);
      } catch (error: any) {
        warnings.push(`Error calculating payroll for ${staff.user.name}: ${error.message}`);
      }
    }

    // Create or update payroll
    const payroll = await prisma.$transaction(async (tx) => {
      // Delete existing items if updating
      if (existing) {
        await tx.payrollItem.deleteMany({
          where: { payrollId: existing.id },
        });
      }

      const payrollData = {
        tenantId,
        branchId,
        payrollMonth,
        status: 'draft' as const,
        totalEmployees: items.length,
        totalGrossSalary: items.reduce((sum, i) => sum + i.grossSalary, 0),
        totalDeductions: items.reduce((sum, i) => sum + i.totalDeductions, 0),
        totalCommissions: items.reduce((sum, i) => sum + i.totalCommissions, 0),
        totalNetSalary: items.reduce((sum, i) => sum + i.netSalary, 0),
      };

      const payrollRecord = existing
        ? await tx.payroll.update({
            where: { id: existing.id },
            data: payrollData,
          })
        : await tx.payroll.create({ data: payrollData });

      // Create payroll items in bulk
      await tx.payrollItem.createMany({
        data: items.map((itemData) => ({
          tenantId,
          payrollId: payrollRecord.id,
          ...itemData,
        })),
      });

      return payrollRecord;
    });

    // Fetch with items
    const result = await prisma.payroll.findUnique({
      where: { id: payroll.id },
      include: {
        items: {
          include: {
            staffProfile: {
              include: {
                user: {
                  select: { id: true, name: true },
                },
              },
            },
          },
        },
      },
    });

    return {
      payroll: result,
      warnings,
    };
  },

  /**
   * Calculate payroll for single staff member
   */
  async calculateStaffPayroll(
    tenantId: string,
    staff: any,
    startDate: string,
    endDate: string,
    branchId?: string
  ) {
    // Get attendance summary
    const attendanceSummary = await attendanceService.getSummary(
      tenantId,
      staff.userId,
      startDate,
      endDate,
      branchId
    );

    // Calculate working days (excluding weekends)
    const start = new Date(startDate);
    const end = new Date(endDate);
    let workingDays = 0;
    const current = new Date(start);
    while (current <= end) {
      const day = getDay(current);
      if (day !== 0) {
        // Exclude Sundays
        workingDays++;
      }
      current.setDate(current.getDate() + 1);
    }

    // Get commissions for the month
    const commissions = await prisma.commission.findMany({
      where: {
        userId: staff.userId,
        commissionDate: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
        status: { in: ['pending', 'approved'] },
      },
    });
    const totalCommissions = commissions.reduce((sum, c) => sum + c.commissionAmount.toNumber(), 0);

    // Get active deductions
    const activeDeductions = await prisma.staffDeduction.findMany({
      where: { userId: staff.userId, status: 'active' },
    });
    const deductionsJson: Record<string, number> = {};
    let totalDeductions = 0;
    for (const ded of activeDeductions) {
      deductionsJson[ded.deductionType] =
        (deductionsJson[ded.deductionType] || 0) + ded.monthlyDeduction.toNumber();
      totalDeductions += ded.monthlyDeduction.toNumber();
    }

    // Calculate LOP (Loss of Pay)
    const baseSalary = staff.baseSalary.toNumber();
    const perDaySalary = baseSalary / workingDays;
    const lopDays = attendanceSummary.absentDays;
    const lopAmount = lopDays * perDaySalary;
    totalDeductions += lopAmount;

    // Calculate totals
    const earningsJson = { base_salary: baseSalary };
    const totalEarnings = baseSalary;
    const grossSalary = totalEarnings + totalCommissions;
    const netSalary = grossSalary - totalDeductions;

    return {
      userId: staff.userId,
      workingDays,
      presentDays: attendanceSummary.presentDays + attendanceSummary.halfDays * 0.5,
      absentDays: attendanceSummary.absentDays,
      leaveDays: attendanceSummary.leaveDays,
      baseSalary,
      earningsJson,
      totalEarnings,
      totalCommissions,
      commissionCount: commissions.length,
      deductionsJson,
      totalDeductions,
      lopDays,
      lopAmount,
      grossSalary,
      netSalary,
    };
  },

  /**
   * Process payroll (move from draft to processing)
   */
  async process(tenantId: string, payrollId: string, processedBy: string) {
    const payroll = await prisma.payroll.findFirst({
      where: { id: payrollId, tenantId },
    });

    if (!payroll) {
      throw new NotFoundError('PAYROLL_NOT_FOUND', 'Payroll not found');
    }

    if (payroll.status !== 'draft') {
      throw new BadRequestError('INVALID_STATUS', 'Payroll is not in draft status');
    }

    const updated = await prisma.payroll.update({
      where: { id: payrollId },
      data: {
        status: 'processing',
        processedAt: new Date(),
        processedBy,
      },
    });

    return updated;
  },

  /**
   * Approve payroll
   */
  async approve(tenantId: string, payrollId: string, approvedBy: string) {
    const payroll = await prisma.payroll.findFirst({
      where: { id: payrollId, tenantId },
    });

    if (!payroll) {
      throw new NotFoundError('PAYROLL_NOT_FOUND', 'Payroll not found');
    }

    if (payroll.status !== 'processing') {
      throw new BadRequestError('INVALID_STATUS', 'Payroll is not in processing status');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update payroll status
      const updated = await tx.payroll.update({
        where: { id: payrollId },
        data: {
          status: 'approved',
          approvedAt: new Date(),
          approvedBy,
        },
      });

      // Mark commissions as approved
      await tx.commission.updateMany({
        where: {
          tenantId,
          status: 'pending',
          payrollId: null,
        },
        data: {
          status: 'approved',
          payrollId,
        },
      });

      return updated;
    });

    return result;
  },

  /**
   * Mark payroll as paid
   */
  async markPaid(tenantId: string, payrollId: string, paidBy: string) {
    const payroll = await prisma.payroll.findFirst({
      where: { id: payrollId, tenantId },
    });

    if (!payroll) {
      throw new NotFoundError('PAYROLL_NOT_FOUND', 'Payroll not found');
    }

    if (payroll.status !== 'approved') {
      throw new BadRequestError('INVALID_STATUS', 'Payroll is not in approved status');
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update payroll status
      const updated = await tx.payroll.update({
        where: { id: payrollId },
        data: {
          status: 'paid',
          paidAt: new Date(),
          paidBy,
        },
      });

      // Mark commissions as paid
      await tx.commission.updateMany({
        where: { payrollId },
        data: {
          status: 'paid',
          paidAt: new Date(),
        },
      });

      // Update deduction remaining amounts
      const items = await tx.payrollItem.findMany({
        where: { payrollId },
      });

      for (const item of items) {
        const deductions = item.deductionsJson as Record<string, number>;
        for (const [type, amount] of Object.entries(deductions)) {
          if (type !== 'lop') {
            await tx.staffDeduction.updateMany({
              where: {
                userId: item.userId,
                deductionType: type,
                status: 'active',
              },
              data: {
                remainingAmount: { decrement: amount },
              },
            });
          }
        }
      }

      return updated;
    });

    return result;
  },

  /**
   * List payroll records
   */
  async list(tenantId: string, query: ListPayrollQuery): Promise<PaginatedResult<unknown>> {
    const { page, limit, branchId, status, payrollMonth } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.PayrollWhereInput = {
      tenantId,
      ...(branchId && { branchId }),
      ...(status && { status }),
      ...(payrollMonth && { payrollMonth }),
    };

    const [data, total] = await Promise.all([
      prisma.payroll.findMany({
        where,
        skip,
        take: limit,
        orderBy: { payrollMonth: 'desc' },
      }),
      prisma.payroll.count({ where }),
    ]);

    return {
      data: serializeDecimals(data) as unknown[],
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  /**
   * Get payroll by ID with items
   */
  async getById(tenantId: string, payrollId: string) {
    const payroll = await prisma.payroll.findFirst({
      where: { id: payrollId, tenantId },
      include: {
        items: {
          include: {
            staffProfile: {
              include: {
                user: {
                  select: { id: true, name: true, avatarUrl: true },
                },
              },
            },
          },
        },
      },
    });

    if (!payroll) {
      throw new NotFoundError('PAYROLL_NOT_FOUND', 'Payroll not found');
    }

    return payroll;
  },
};

// ============================================
// Geo-config Service
// ============================================

import type { UpdateGeoConfigInput } from './staff.schema';

export const geoConfigService = {
  /**
   * Get geo-config for a branch
   */
  async getByBranch(tenantId: string, branchId: string) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        geoFenceRadius: true,
      },
    });

    if (!branch) {
      throw new NotFoundError('BRANCH_NOT_FOUND', 'Branch not found');
    }

    return {
      branchId: branch.id,
      branchName: branch.name,
      latitude: branch.latitude?.toNumber() ?? null,
      longitude: branch.longitude?.toNumber() ?? null,
      geoFenceRadius: branch.geoFenceRadius ?? 100,
      isConfigured: branch.latitude !== null && branch.longitude !== null,
    };
  },

  /**
   * Update geo-config for a branch
   */
  async updateByBranch(tenantId: string, branchId: string, input: UpdateGeoConfigInput) {
    const branch = await prisma.branch.findFirst({
      where: { id: branchId, tenantId, deletedAt: null },
    });

    if (!branch) {
      throw new NotFoundError('BRANCH_NOT_FOUND', 'Branch not found');
    }

    const updated = await prisma.branch.update({
      where: { id: branchId },
      data: {
        ...(input.latitude !== undefined && { latitude: input.latitude }),
        ...(input.longitude !== undefined && { longitude: input.longitude }),
        ...(input.geoFenceRadius !== undefined && { geoFenceRadius: input.geoFenceRadius }),
      },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        geoFenceRadius: true,
      },
    });

    return {
      branchId: updated.id,
      branchName: updated.name,
      latitude: updated.latitude?.toNumber() ?? null,
      longitude: updated.longitude?.toNumber() ?? null,
      geoFenceRadius: updated.geoFenceRadius ?? 100,
      isConfigured: updated.latitude !== null && updated.longitude !== null,
    };
  },
};

// ============================================
// Stylist Breaks Service
// ============================================

export const breaksService = {
  /**
   * List breaks for a stylist
   */
  async list(tenantId: string, stylistId: string, branchId?: string) {
    const where: Prisma.StylistBreakWhereInput = {
      tenantId,
      stylistId,
      isActive: true,
    };

    if (branchId) {
      where.branchId = branchId;
    }

    const breaks = await prisma.stylistBreak.findMany({
      where,
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return breaks;
  },

  /**
   * Create a new break for a stylist
   */
  async create(
    tenantId: string,
    stylistId: string,
    input: {
      branchId: string;
      name: string;
      dayOfWeek: number | null;
      startTime: string;
      endTime: string;
    },
    createdBy: string
  ) {
    // Verify stylist exists
    const user = await prisma.user.findFirst({
      where: { id: stylistId, tenantId, deletedAt: null },
    });

    if (!user) {
      throw new NotFoundError('STYLIST_NOT_FOUND', 'Stylist not found');
    }

    // Verify branch exists
    const branch = await prisma.branch.findFirst({
      where: { id: input.branchId, tenantId, deletedAt: null },
    });

    if (!branch) {
      throw new NotFoundError('BRANCH_NOT_FOUND', 'Branch not found');
    }

    const breakRecord = await prisma.stylistBreak.create({
      data: {
        tenantId,
        branchId: input.branchId,
        stylistId,
        name: input.name,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        isActive: true,
        createdBy,
      },
    });

    return breakRecord;
  },

  /**
   * Delete a break
   */
  async delete(tenantId: string, stylistId: string, breakId: string) {
    const breakRecord = await prisma.stylistBreak.findFirst({
      where: { id: breakId, tenantId, stylistId },
    });

    if (!breakRecord) {
      throw new NotFoundError('BREAK_NOT_FOUND', 'Break not found');
    }

    await prisma.stylistBreak.delete({
      where: { id: breakId },
    });

    return { success: true };
  },
};
