/**
 * Staff Management Controller
 */

import type { FastifyRequest, FastifyReply } from 'fastify';

import { successResponse, paginatedResponse, deleteResponse } from '../../lib/response';
import {
  staffService,
  attendanceService,
  leaveService,
  commissionService,
  deductionService,
  payrollService,
  geoConfigService,
  breaksService,
} from './staff.service';
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
  ApproveLeaveInput,
  RejectLeaveInput,
  ListLeavesQuery,
  ListCommissionsQuery,
  ApproveCommissionsInput,
  AddDeductionInput,
  UpdateDeductionInput,
  GeneratePayrollInput,
  ListPayrollQuery,
  UpdateGeoConfigInput,
} from './staff.schema';

// ============================================
// Staff Profile Controllers
// ============================================

export async function createStaff(
  request: FastifyRequest<{ Body: CreateStaffInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await staffService.create(tenantId, request.body, userId);
  return reply.status(201).send(successResponse(result));
}

export async function getStaff(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const staff = await staffService.getById(tenantId, request.params.id);
  return reply.send(successResponse(staff));
}

export async function listStaff(
  request: FastifyRequest<{ Querystring: ListStaffQuery }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await staffService.list(tenantId, request.query);
  return reply.send(paginatedResponse(result.data, result.meta));
}

export async function updateStaff(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateStaffInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const staff = await staffService.update(tenantId, request.params.id, request.body, userId);
  return reply.send(successResponse(staff));
}

export async function deactivateStaff(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  await staffService.deactivate(tenantId, request.params.id, userId);
  return reply.send(deleteResponse('Staff deactivated successfully'));
}

export async function reactivateStaff(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const staff = await staffService.reactivate(tenantId, request.params.id, userId);
  return reply.send(successResponse(staff));
}

// ============================================
// Attendance Controllers
// ============================================

export async function checkIn(
  request: FastifyRequest<{ Body: CheckInInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await attendanceService.checkIn(tenantId, userId, request.body);
  return reply.send(successResponse(result));
}

export async function checkOut(
  request: FastifyRequest<{ Body: CheckOutInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await attendanceService.checkOut(tenantId, userId, request.body);
  return reply.send(successResponse(result));
}

export async function manualAttendance(
  request: FastifyRequest<{ Body: ManualAttendanceInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await attendanceService.manualEntry(tenantId, request.body, userId);
  return reply.status(201).send(successResponse(result));
}

export async function listAttendance(
  request: FastifyRequest<{ Querystring: ListAttendanceQuery }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await attendanceService.list(tenantId, request.query);
  return reply.send(paginatedResponse(result.data, result.meta));
}

export async function getDailyAttendance(
  request: FastifyRequest<{ Querystring: DailyAttendanceQuery }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await attendanceService.getDailyAttendance(tenantId, request.query);
  return reply.send(successResponse(result));
}

export async function getAttendanceSummary(
  request: FastifyRequest<{
    Params: { userId: string };
    Querystring: { startDate: string; endDate: string; branchId?: string };
  }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const { startDate, endDate, branchId } = request.query;
  const summary = await attendanceService.getSummary(
    tenantId,
    request.params.userId,
    startDate,
    endDate,
    branchId
  );
  return reply.send(successResponse(summary));
}

// ============================================
// Leave Controllers
// ============================================

export async function applyLeave(
  request: FastifyRequest<{ Body: ApplyLeaveInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const leave = await leaveService.apply(tenantId, userId, request.body);
  return reply.status(201).send(successResponse(leave));
}

export async function approveLeave(
  request: FastifyRequest<{ Params: { id: string }; Body: ApproveLeaveInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const leave = await leaveService.approve(
    tenantId,
    request.params.id,
    userId,
    request.body.comment
  );
  return reply.send(successResponse(leave));
}

export async function rejectLeave(
  request: FastifyRequest<{ Params: { id: string }; Body: RejectLeaveInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const leave = await leaveService.reject(tenantId, request.params.id, userId, request.body.reason);
  return reply.send(successResponse(leave));
}

export async function cancelLeave(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const leave = await leaveService.cancel(tenantId, request.params.id, userId);
  return reply.send(successResponse(leave));
}

export async function listLeaves(
  request: FastifyRequest<{ Querystring: ListLeavesQuery }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await leaveService.list(tenantId, request.query);
  return reply.send(paginatedResponse(result.data, result.meta));
}

export async function getLeaveBalance(
  request: FastifyRequest<{ Params: { userId: string }; Querystring: { financialYear?: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const balances = await leaveService.getBalance(
    tenantId,
    request.params.userId,
    request.query.financialYear
  );
  return reply.send(successResponse(balances));
}

// ============================================
// Commission Controllers
// ============================================

export async function listCommissions(
  request: FastifyRequest<{ Querystring: ListCommissionsQuery }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await commissionService.list(tenantId, request.query);
  return reply.send(paginatedResponse(result.data, result.meta));
}

export async function getCommissionSummary(
  request: FastifyRequest<{
    Params: { userId: string };
    Querystring: { startDate: string; endDate: string };
  }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const { startDate, endDate } = request.query;
  const summary = await commissionService.getSummary(
    tenantId,
    request.params.userId,
    startDate,
    endDate
  );
  return reply.send(successResponse(summary));
}

export async function approveCommissions(
  request: FastifyRequest<{ Body: ApproveCommissionsInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await commissionService.bulkApprove(tenantId, request.body.commissionIds, userId);
  return reply.send(successResponse(result));
}

// ============================================
// Deduction Controllers
// ============================================

export async function addDeduction(
  request: FastifyRequest<{ Params: { userId: string }; Body: AddDeductionInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: currentUserId } = request.user!;
  const deduction = await deductionService.add(
    tenantId,
    request.params.userId,
    request.body,
    currentUserId
  );
  return reply.status(201).send(successResponse(deduction));
}

export async function listDeductions(
  request: FastifyRequest<{ Params: { userId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const deductions = await deductionService.listByUser(tenantId, request.params.userId);
  return reply.send(successResponse(deductions));
}

export async function updateDeduction(
  request: FastifyRequest<{ Params: { id: string }; Body: UpdateDeductionInput }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const deduction = await deductionService.update(tenantId, request.params.id, request.body);
  return reply.send(successResponse(deduction));
}

export async function cancelDeduction(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const deduction = await deductionService.cancel(tenantId, request.params.id);
  return reply.send(successResponse(deduction));
}

// ============================================
// Payroll Controllers
// ============================================

export async function generatePayroll(
  request: FastifyRequest<{ Body: GeneratePayrollInput }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const result = await payrollService.generate(tenantId, request.body, userId);
  return reply.status(201).send(successResponse(result));
}

export async function listPayroll(
  request: FastifyRequest<{ Querystring: ListPayrollQuery }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await payrollService.list(tenantId, request.query);
  return reply.send(paginatedResponse(result.data, result.meta));
}

export async function getPayroll(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const payroll = await payrollService.getById(tenantId, request.params.id);
  return reply.send(successResponse(payroll));
}

export async function processPayroll(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const payroll = await payrollService.process(tenantId, request.params.id, userId);
  return reply.send(successResponse(payroll));
}

export async function approvePayroll(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const payroll = await payrollService.approve(tenantId, request.params.id, userId);
  return reply.send(successResponse(payroll));
}

export async function markPayrollPaid(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId, sub: userId } = request.user!;
  const payroll = await payrollService.markPaid(tenantId, request.params.id, userId);
  return reply.send(successResponse(payroll));
}

// ============================================
// Geo-config Controllers
// ============================================

export async function getGeoConfig(
  request: FastifyRequest<{ Params: { branchId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const config = await geoConfigService.getByBranch(tenantId, request.params.branchId);
  return reply.send(successResponse(config));
}

export async function updateGeoConfig(
  request: FastifyRequest<{ Params: { branchId: string }; Body: UpdateGeoConfigInput }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const config = await geoConfigService.updateByBranch(
    tenantId,
    request.params.branchId,
    request.body
  );
  return reply.send(successResponse(config));
}

// ============================================
// Attendance Lock Controllers
// ============================================

import { payslipService } from './payslip.service';
import { performanceService } from './performance.service';

// ============================================
// Payslip Controllers
// ============================================

export async function listPayslips(
  request: FastifyRequest<{
    Querystring: { page?: number; limit?: number; userId?: string; payPeriod?: string };
  }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await payslipService.list(tenantId, request.query);
  return reply.send(paginatedResponse(result.data, result.meta));
}

export async function getPayslip(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const payslip = await payslipService.getById(tenantId, request.params.id);
  return reply.send(successResponse(payslip));
}

export async function getPayslipDownload(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await payslipService.getDownloadUrl(tenantId, request.params.id);
  return reply.send(successResponse(result));
}

export async function sendPayslipEmail(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await payslipService.sendEmail(tenantId, request.params.id);
  return reply.send(successResponse(result));
}

export async function sendPayslipWhatsApp(
  request: FastifyRequest<{ Params: { id: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const result = await payslipService.sendWhatsApp(tenantId, request.params.id);
  return reply.send(successResponse(result));
}

// ============================================
// Performance Controllers
// ============================================

export async function getStaffPerformance(
  request: FastifyRequest<{
    Params: { userId: string };
    Querystring: { startDate: string; endDate: string; branchId?: string };
  }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const { startDate, endDate, branchId } = request.query;
  const summary = await performanceService.getSummary(
    tenantId,
    request.params.userId,
    startDate,
    endDate,
    branchId
  );
  return reply.send(successResponse(summary));
}

// ============================================
// Stylist Breaks Controllers
// ============================================

export async function listBreaks(
  request: FastifyRequest<{
    Params: { userId: string };
    Querystring: { branchId?: string };
  }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  const breaks = await breaksService.list(tenantId, request.params.userId, request.query.branchId);
  return reply.send(successResponse(breaks));
}

export async function createBreak(
  request: FastifyRequest<{
    Params: { userId: string };
    Body: {
      branchId: string;
      name: string;
      dayOfWeek: number | null;
      startTime: string;
      endTime: string;
    };
  }>,
  reply: FastifyReply
) {
  const { tenantId, sub: createdBy } = request.user!;
  const result = await breaksService.create(
    tenantId,
    request.params.userId,
    request.body,
    createdBy
  );
  return reply.status(201).send(successResponse(result));
}

export async function deleteBreak(
  request: FastifyRequest<{ Params: { userId: string; breakId: string } }>,
  reply: FastifyReply
) {
  const { tenantId } = request.user!;
  await breaksService.delete(tenantId, request.params.userId, request.params.breakId);
  return reply.send(successResponse({ message: 'Break deleted successfully' }));
}
