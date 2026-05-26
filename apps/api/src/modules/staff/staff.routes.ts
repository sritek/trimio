/**
 * Staff Management Routes
 */

import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';

import { authenticate } from '@/middleware';

import {
  createStaffSchema,
  updateStaffSchema,
  listStaffQuerySchema,
  checkInSchema,
  checkOutSchema,
  manualAttendanceSchema,
  listAttendanceQuerySchema,
  dailyAttendanceQuerySchema,
  applyLeaveSchema,
  listLeavesQuerySchema,
  listCommissionsQuerySchema,
  approveCommissionsSchema,
  addDeductionSchema,
  updateDeductionSchema,
  generatePayrollSchema,
  listPayrollQuerySchema,
  updateGeoConfigSchema,
  createBreakSchema,
  listBreaksQuerySchema,
} from './staff.schema';
import * as controller from './staff.controller';

export async function staffRoutes(fastify: FastifyInstance) {
  const app = fastify.withTypeProvider<ZodTypeProvider>();

  // All routes require authentication
  app.addHook('preHandler', authenticate);

  // ============================================
  // Staff Profile Routes
  // ============================================

  app.post('/', { schema: { tags: ['Staff'], body: createStaffSchema } }, controller.createStaff);

  app.get(
    '/',
    { schema: { tags: ['Staff'], querystring: listStaffQuerySchema } },
    controller.listStaff
  );

  // ============================================
  // Attendance Routes (registered before /:id to avoid parametric conflicts)
  // ============================================

  app.post(
    '/attendance/check-in',
    { schema: { tags: ['Attendance'], body: checkInSchema } },
    controller.checkIn
  );

  app.post(
    '/attendance/check-out',
    { schema: { tags: ['Attendance'], body: checkOutSchema } },
    controller.checkOut
  );

  app.post(
    '/attendance/manual',
    { schema: { tags: ['Attendance'], body: manualAttendanceSchema } },
    controller.manualAttendance
  );

  app.get(
    '/attendance',
    { schema: { tags: ['Attendance'], querystring: listAttendanceQuerySchema } },
    controller.listAttendance
  );

  app.get(
    '/attendance/daily',
    { schema: { tags: ['Attendance'], querystring: dailyAttendanceQuerySchema } },
    controller.getDailyAttendance
  );

  // ============================================
  // Leave Routes (static paths before parametric /:id)
  // ============================================

  app.post(
    '/leaves',
    { schema: { tags: ['Leaves'], body: applyLeaveSchema } },
    controller.applyLeave
  );

  app.get(
    '/leaves',
    { schema: { tags: ['Leaves'], querystring: listLeavesQuerySchema } },
    controller.listLeaves
  );

  app.post('/leaves/:id/cancel', { schema: { tags: ['Leaves'] } }, controller.cancelLeave);

  // ============================================
  // Commission Routes (static paths before parametric /:id)
  // ============================================

  app.get(
    '/commissions',
    { schema: { tags: ['Commissions'], querystring: listCommissionsQuerySchema } },
    controller.listCommissions
  );

  app.post(
    '/commissions/approve',
    { schema: { tags: ['Commissions'], body: approveCommissionsSchema } },
    controller.approveCommissions
  );

  // ============================================
  // Payroll Routes (static paths before parametric /:id)
  // ============================================

  app.post(
    '/payroll/generate',
    { schema: { tags: ['Payroll'], body: generatePayrollSchema } },
    controller.generatePayroll
  );

  app.get(
    '/payroll',
    { schema: { tags: ['Payroll'], querystring: listPayrollQuerySchema } },
    controller.listPayroll
  );

  app.get('/payroll/:id', { schema: { tags: ['Payroll'] } }, controller.getPayroll);

  app.post('/payroll/:id/process', { schema: { tags: ['Payroll'] } }, controller.processPayroll);

  app.post('/payroll/:id/approve', { schema: { tags: ['Payroll'] } }, controller.approvePayroll);

  app.post('/payroll/:id/pay', { schema: { tags: ['Payroll'] } }, controller.markPayrollPaid);

  // ============================================
  // Payslip Routes (static paths before parametric /:id)
  // ============================================

  app.get('/payslips', { schema: { tags: ['Payslips'] } }, controller.listPayslips);

  app.get('/payslips/:id', { schema: { tags: ['Payslips'] } }, controller.getPayslip);

  app.get(
    '/payslips/:id/download',
    { schema: { tags: ['Payslips'] } },
    controller.getPayslipDownload
  );

  app.post(
    '/payslips/:id/send-email',
    { schema: { tags: ['Payslips'] } },
    controller.sendPayslipEmail
  );

  app.post(
    '/payslips/:id/send-whatsapp',
    { schema: { tags: ['Payslips'] } },
    controller.sendPayslipWhatsApp
  );

  // ============================================
  // Deduction Routes (static paths before parametric /:id)
  // ============================================

  app.patch(
    '/deductions/:id',
    { schema: { tags: ['Deductions'], body: updateDeductionSchema } },
    controller.updateDeduction
  );

  app.delete('/deductions/:id', { schema: { tags: ['Deductions'] } }, controller.cancelDeduction);

  // ============================================
  // Geo-config Routes
  // ============================================

  app.get(
    '/branches/:branchId/geo-config',
    { schema: { tags: ['Geo-config'] } },
    controller.getGeoConfig
  );

  app.patch(
    '/branches/:branchId/geo-config',
    { schema: { tags: ['Geo-config'], body: updateGeoConfigSchema } },
    controller.updateGeoConfig
  );

  // ============================================
  // Staff Profile (parametric /:id routes - MUST be after all static routes)
  // ============================================

  app.get('/:id', { schema: { tags: ['Staff'] } }, controller.getStaff);

  app.patch(
    '/:id',
    { schema: { tags: ['Staff'], body: updateStaffSchema } },
    controller.updateStaff
  );

  app.delete('/:id', { schema: { tags: ['Staff'] } }, controller.deactivateStaff);

  app.post(
    '/:id/reactivate',
    { schema: { tags: ['Staff'], description: 'Reactivate a deactivated staff member' } },
    controller.reactivateStaff
  );

  // ============================================
  // Parametric /:userId routes
  // ============================================

  app.get(
    '/:userId/attendance/summary',
    { schema: { tags: ['Attendance'] } },
    controller.getAttendanceSummary
  );

  app.get('/:userId/leave-balance', { schema: { tags: ['Leaves'] } }, controller.getLeaveBalance);

  app.get(
    '/:userId/commissions/summary',
    { schema: { tags: ['Commissions'] } },
    controller.getCommissionSummary
  );

  app.post(
    '/:userId/deductions',
    { schema: { tags: ['Deductions'], body: addDeductionSchema } },
    controller.addDeduction
  );

  app.get('/:userId/deductions', { schema: { tags: ['Deductions'] } }, controller.listDeductions);

  app.get(
    '/:userId/performance',
    { schema: { tags: ['Performance'] } },
    controller.getStaffPerformance
  );

  app.get(
    '/:userId/breaks',
    { schema: { tags: ['Breaks'], querystring: listBreaksQuerySchema } },
    controller.listBreaks
  );

  app.post(
    '/:userId/breaks',
    { schema: { tags: ['Breaks'], body: createBreakSchema } },
    controller.createBreak
  );

  app.delete('/:userId/breaks/:breakId', { schema: { tags: ['Breaks'] } }, controller.deleteBreak);
}
