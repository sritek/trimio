/**
 * Staff Management - Zod Schemas
 */

import { z } from 'zod';

// ============================================
// Enums
// ============================================

export const EmploymentType = z.enum(['full_time', 'part_time', 'contract', 'intern']);
export const SkillLevel = z.enum(['junior', 'senior', 'expert']);
export const AttendanceStatus = z.enum([
  'present',
  'absent',
  'half_day',
  'on_leave',
  'holiday',
  'week_off',
]);
export const LeaveType = z.enum([
  'casual',
  'sick',
  'earned',
  'unpaid',
  'maternity',
  'paternity',
  'comp_off',
]);
export const LeaveStatus = z.enum(['pending', 'approved', 'rejected', 'cancelled']);
export const CommissionStatus = z.enum(['pending', 'approved', 'paid', 'cancelled']);
export const PayrollStatus = z.enum(['draft', 'processing', 'approved', 'paid', 'cancelled']);
export const DeductionType = z.enum(['loan', 'advance', 'emi', 'penalty', 'other']);
export const DeductionStatus = z.enum(['active', 'completed', 'cancelled']);

// ============================================
// Staff Profile Schemas
// ============================================

export const createStaffSchema = z.object({
  // User account
  name: z.string().min(2).max(100),
  email: z.string().email().optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/),
  password: z.string().min(8).max(50),
  role: z.enum(['branch_manager', 'receptionist', 'stylist', 'accountant']),
  gender: z.enum(['male', 'female', 'other']).optional(),

  // Profile
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  bloodGroup: z.string().max(5).optional(),
  emergencyContactName: z.string().max(100).optional(),
  emergencyContactPhone: z
    .string()
    .regex(/^[6-9]\d{9}$/)
    .optional(),

  // Address
  addressLine1: z.string().max(255).optional(),
  addressLine2: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  pincode: z
    .string()
    .regex(/^\d{6}$/)
    .optional(),

  // Employment
  employeeCode: z.string().min(1, 'Employee code is required').max(50),
  designation: z.string().max(100).optional(),
  department: z.string().max(100).optional(),
  dateOfJoining: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  employmentType: EmploymentType,

  // Skills
  skillLevel: SkillLevel.optional(),
  specializations: z.array(z.string()).optional(),

  // Documents
  aadharNumber: z
    .string()
    .regex(/^\d{12}$/)
    .optional(),
  panNumber: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .optional(),
  bankAccountNumber: z.string().max(30).optional(),
  bankName: z.string().max(100).optional(),
  bankIfsc: z
    .string()
    .regex(/^[A-Z]{4}0[A-Z0-9]{6}$/)
    .optional(),

  // Salary
  salaryType: z.enum(['monthly', 'daily', 'hourly']),
  baseSalary: z.number().positive('Base salary must be greater than 0'),

  // Commission
  commissionEnabled: z.boolean().default(true),
  defaultCommissionType: z.enum(['percentage', 'flat']).optional(),
  defaultCommissionRate: z.number().min(0).max(100).optional(),

  // Branch assignments
  branchAssignments: z
    .array(
      z.object({
        branchId: z.string().uuid(),
        isPrimary: z.boolean(),
      })
    )
    .min(1),
});

export const updateStaffSchema = createStaffSchema.partial().omit({
  password: true,
  phone: true,
  branchAssignments: true,
});

export const listStaffQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  branchId: z.string().uuid().optional(),
  role: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  employmentType: EmploymentType.optional(),
});

// ============================================
// Shift Schemas
// ============================================

export const createShiftSchema = z.object({
  name: z.string().min(2).max(100),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  breakDurationMinutes: z.number().int().min(0).max(120).default(0),
  applicableDays: z.array(z.number().int().min(0).max(6)).min(1),
});

export const updateShiftSchema = createShiftSchema.partial();

export const assignShiftSchema = z.object({
  shiftId: z.string().uuid(),
  effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  effectiveUntil: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// ============================================
// Attendance Schemas
// ============================================

export const checkInSchema = z.object({
  branchId: z.string().uuid(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
});

export const checkOutSchema = z.object({
  branchId: z.string().uuid(),
  location: z
    .object({
      latitude: z.number().min(-90).max(90),
      longitude: z.number().min(-180).max(180),
    })
    .optional(),
});

export const manualAttendanceSchema = z.object({
  userId: z.string().uuid(),
  branchId: z.string().uuid(),
  attendanceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkInTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional(),
  checkOutTime: z
    .string()
    .regex(/^\d{2}:\d{2}(:\d{2})?$/)
    .optional(),
  status: AttendanceStatus,
  notes: z.string().max(500).optional(),
});

export const listAttendanceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  branchId: z.string().uuid().optional(),
  userId: z.string().uuid().optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: AttendanceStatus.optional(),
});

export const dailyAttendanceQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// ============================================
// Leave Schemas
// ============================================

export const applyLeaveSchema = z
  .object({
    branchId: z.string().uuid(),
    leaveType: LeaveType,
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isHalfDay: z.boolean().default(false),
    halfDayType: z.enum(['first_half', 'second_half']).optional(),
    reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
  })
  .refine(
    (data) => {
      if (data.isHalfDay && !data.halfDayType) {
        return false;
      }
      return true;
    },
    { message: 'halfDayType is required when isHalfDay is true' }
  )
  .refine(
    (data) => {
      return new Date(data.startDate) <= new Date(data.endDate);
    },
    { message: 'startDate must be before or equal to endDate' }
  );

export const approveLeaveSchema = z.object({
  comment: z.string().max(500).optional(),
});

export const rejectLeaveSchema = z.object({
  reason: z.string().min(10, 'Reason must be at least 10 characters').max(500),
});

export const listLeavesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  status: LeaveStatus.optional(),
  leaveType: LeaveType.optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

// ============================================
// Commission Schemas
// ============================================

export const listCommissionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  userId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  status: CommissionStatus.optional(),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const approveCommissionsSchema = z.object({
  commissionIds: z.array(z.string().uuid()).min(1),
});

// ============================================
// Deduction Schemas
// ============================================

export const addDeductionSchema = z
  .object({
    deductionType: DeductionType,
    description: z.string().min(5).max(255),
    totalAmount: z.number().min(0),
    monthlyDeduction: z.number().min(0),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .refine(
    (data) => {
      return data.monthlyDeduction <= data.totalAmount;
    },
    { message: 'monthlyDeduction cannot exceed totalAmount' }
  );

export const updateDeductionSchema = z.object({
  monthlyDeduction: z.number().min(0).optional(),
  endDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  status: DeductionStatus.optional(),
});

// ============================================
// Payroll Schemas
// ============================================

export const generatePayrollSchema = z.object({
  branchId: z.string().uuid().optional(),
  payrollMonth: z.string().regex(/^\d{4}-\d{2}$/),
});

export const processPayrollSchema = z.object({
  adjustments: z
    .array(
      z.object({
        userId: z.string().uuid(),
        adjustmentType: z.enum(['bonus', 'deduction', 'correction']),
        amount: z.number(),
        reason: z.string().min(10, 'Reason must be at least 10 characters').max(255),
      })
    )
    .optional(),
});

export const listPayrollQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  branchId: z.string().uuid().optional(),
  status: PayrollStatus.optional(),
  payrollMonth: z
    .string()
    .regex(/^\d{4}-\d{2}$/)
    .optional(),
});

// ============================================
// Geo-config Schemas
// ============================================

export const updateGeoConfigSchema = z.object({
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  geoFenceRadius: z.number().int().min(10).max(5000).optional(), // 10m to 5km
});

// ============================================
// Attendance Lock Schemas
// ============================================

export const attendanceLockStatusQuerySchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/), // YYYY-MM format
  branchId: z.string().uuid().optional(),
});

// ============================================
// Stylist Breaks Schemas
// ============================================

export const createBreakSchema = z.object({
  branchId: z.string().uuid(),
  name: z.string().min(1).max(100),
  dayOfWeek: z.number().int().min(0).max(6).nullable(), // null = all days
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export const updateBreakSchema = createBreakSchema.partial().omit({ branchId: true });

export const listBreaksQuerySchema = z.object({
  branchId: z.string().uuid().optional(),
});

// Type exports
export type CreateStaffInput = z.infer<typeof createStaffSchema>;
export type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
export type ListStaffQuery = z.infer<typeof listStaffQuerySchema>;
export type CreateShiftInput = z.infer<typeof createShiftSchema>;
export type UpdateShiftInput = z.infer<typeof updateShiftSchema>;
export type AssignShiftInput = z.infer<typeof assignShiftSchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type ManualAttendanceInput = z.infer<typeof manualAttendanceSchema>;
export type ListAttendanceQuery = z.infer<typeof listAttendanceQuerySchema>;
export type DailyAttendanceQuery = z.infer<typeof dailyAttendanceQuerySchema>;
export type ApplyLeaveInput = z.infer<typeof applyLeaveSchema>;
export type ApproveLeaveInput = z.infer<typeof approveLeaveSchema>;
export type RejectLeaveInput = z.infer<typeof rejectLeaveSchema>;
export type ListLeavesQuery = z.infer<typeof listLeavesQuerySchema>;
export type ListCommissionsQuery = z.infer<typeof listCommissionsQuerySchema>;
export type ApproveCommissionsInput = z.infer<typeof approveCommissionsSchema>;
export type AddDeductionInput = z.infer<typeof addDeductionSchema>;
export type UpdateDeductionInput = z.infer<typeof updateDeductionSchema>;
export type GeneratePayrollInput = z.infer<typeof generatePayrollSchema>;
export type ProcessPayrollInput = z.infer<typeof processPayrollSchema>;
export type ListPayrollQuery = z.infer<typeof listPayrollQuerySchema>;
export type UpdateGeoConfigInput = z.infer<typeof updateGeoConfigSchema>;
export type AttendanceLockStatusQuery = z.infer<typeof attendanceLockStatusQuerySchema>;
export type CreateBreakInput = z.infer<typeof createBreakSchema>;
export type UpdateBreakInput = z.infer<typeof updateBreakSchema>;
export type ListBreaksQuery = z.infer<typeof listBreaksQuerySchema>;
