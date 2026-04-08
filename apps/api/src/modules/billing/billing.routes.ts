/**
 * Billing Routes
 * API endpoints for billing operations
 */

import type { FastifyInstance } from 'fastify';
import { PERMISSIONS } from '@trimio/shared';
import { authenticate, requirePermission } from '../../middleware';
import {
  createInvoice,
  getInvoice,
  listInvoices,
  updateInvoice,
  deleteInvoice,
  addItem,
  removeItem,
  addPayment,
  finalizeInvoice,
  cancelInvoice,
  quickBill,
  calculateTotals,
  getNextInvoiceNumber,
} from './billing.controller';

export async function billingRoutes(fastify: FastifyInstance) {
  // All routes require authentication
  fastify.addHook('preHandler', authenticate);

  // ============================================
  // Invoice CRUD
  // ============================================

  // Create invoice (draft)
  fastify.post(
    '/',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_WRITE),
    },
    createInvoice
  );

  // List invoices
  fastify.get(
    '/',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_READ),
    },
    listInvoices
  );

  // Get invoice by ID
  fastify.get(
    '/:id',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_READ),
    },
    getInvoice
  );

  // Update draft invoice
  fastify.patch(
    '/:id',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_WRITE),
    },
    updateInvoice
  );

  // Delete draft invoice
  fastify.delete(
    '/:id',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_WRITE),
    },
    deleteInvoice
  );

  // ============================================
  // Invoice Items
  // ============================================

  // Add item to invoice
  fastify.post(
    '/:id/items',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_WRITE),
    },
    addItem
  );

  // Remove item from invoice
  fastify.delete(
    '/:id/items/:itemId',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_WRITE),
    },
    removeItem
  );

  // ============================================
  // Payments
  // ============================================

  // Add payment to invoice
  fastify.post(
    '/:id/payments',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_WRITE),
    },
    addPayment
  );

  // ============================================
  // Invoice Actions
  // ============================================

  // Finalize invoice
  fastify.post(
    '/:id/finalize',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_WRITE),
    },
    finalizeInvoice
  );

  // Cancel invoice
  fastify.post(
    '/:id/cancel',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_WRITE),
    },
    cancelInvoice
  );

  // ============================================
  // Quick Actions
  // ============================================

  // Quick bill (create + finalize in one step)
  fastify.post(
    '/quick-bill',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_WRITE),
    },
    quickBill
  );

  // Calculate totals (preview without saving)
  fastify.post(
    '/calculate',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_READ),
    },
    calculateTotals
  );

  // Get next invoice number
  fastify.get(
    '/invoice-number/next',
    {
      preHandler: requirePermission(PERMISSIONS.BILLS_READ),
    },
    getNextInvoiceNumber
  );
}
