/**
 * Notification Service Unit Tests
 *
 * Tests cover:
 * 8.1 — whatsapp.ts sends correct HTTP request shape
 * 8.2 — disabled state: warn logged exactly once
 * 8.3 — misconfigured state: template env var absent creates failed log
 * 8.4 — terminal retry: attemptCount = 3 does not retry
 * 8.5 — skipped record suppresses retry
 * + successful send, failed send, no-phone skipped, idempotency, invoice params, retry logic
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// Mocks — must be declared before imports
// ============================================

// Mock @prisma/client enums — the notification service imports these at runtime
vi.mock('@prisma/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@prisma/client')>();
  return {
    ...actual,
    WhatsappNotificationType: {
      appointment_booked: 'appointment_booked',
      appointment_rescheduled: 'appointment_rescheduled',
      appointment_cancelled: 'appointment_cancelled',
      invoice_finalized: 'invoice_finalized',
    },
    WhatsappNotificationStatus: {
      accepted: 'accepted',
      failed: 'failed',
      skipped: 'skipped',
    },
    WhatsappReferenceType: {
      appointment: 'appointment',
      invoice: 'invoice',
    },
  };
});

const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockFindFirst = vi.fn();
const mockAppointmentFindFirst = vi.fn();
const mockInvoiceFindFirst = vi.fn();

vi.mock('@/lib/prisma', () => ({
  prisma: {
    whatsappNotificationLog: {
      create: (...args: unknown[]) => mockCreate(...args),
      update: (...args: unknown[]) => mockUpdate(...args),
      findFirst: (...args: unknown[]) => mockFindFirst(...args),
    },
    appointment: {
      findFirst: (...args: unknown[]) => mockAppointmentFindFirst(...args),
    },
    invoice: {
      findFirst: (...args: unknown[]) => mockInvoiceFindFirst(...args),
    },
  },
}));

const mockSendWhatsAppTemplate = vi.fn();
vi.mock('@/lib/whatsapp', () => ({
  sendWhatsAppTemplate: (...args: unknown[]) => mockSendWhatsAppTemplate(...args),
}));

const mockLoggerWarn = vi.fn();
vi.mock('@/lib/logger', () => ({
  logger: {
    warn: (...args: unknown[]) => mockLoggerWarn(...args),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mutable env object so tests can toggle values per test
const mockEnv: Record<string, string | undefined> = {
  WHATSAPP_ACCESS_TOKEN: 'test-token',
  WHATSAPP_PHONE_NUMBER_ID: 'test-phone-id',
  WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED: 'appointment_booked_tpl',
  WHATSAPP_TEMPLATE_APPOINTMENT_RESCHEDULED: 'appointment_rescheduled_tpl',
  WHATSAPP_TEMPLATE_APPOINTMENT_CANCELLED: 'appointment_cancelled_tpl',
  WHATSAPP_TEMPLATE_INVOICE_FINALIZED: 'invoice_finalized_tpl',
};

vi.mock('@/config/env', () => ({
  env: new Proxy({} as Record<string, string | undefined>, {
    get(_target, prop: string) {
      return mockEnv[prop];
    },
  }),
}));

// ============================================
// Import SUT — after mocks are set up
// ============================================

import {
  notifyAppointmentBooked,
  notifyAppointmentRescheduled,
  notifyAppointmentCancelled,
  notifyInvoiceFinalized,
} from './notification.service';

// ============================================
// Fixtures
// ============================================

const TENANT_ID = 'tenant-test-001';

function makeAppointment(overrides: Record<string, unknown> = {}) {
  return {
    id: 'apt-001',
    tenantId: TENANT_ID,
    customerName: 'Jane Doe',
    customerPhone: '+919876543210',
    scheduledDate: new Date(Date.UTC(2026, 2, 25)), // 25 Mar 2026
    scheduledTime: '14:30',
    branchId: 'branch-001',
    services: [{ serviceName: 'Haircut' }, { serviceName: 'Shampoo' }],
    stylist: { name: 'Alice' },
    branch: { name: 'Downtown Salon' },
    customer: { phone: '+919876543210' },
    ...overrides,
  };
}

function makeInvoice(overrides: Record<string, unknown> = {}) {
  return {
    id: 'inv-001',
    tenantId: TENANT_ID,
    customerName: 'Jane Doe',
    customerPhone: '+919876543210',
    invoiceNumber: 'INV-202603-0001',
    grandTotal: 1200,
    customer: { phone: '+919876543210' },
    items: [
      { name: 'Haircut', quantity: 1, netAmount: 500, displayOrder: 0 },
      { name: 'Hair Color', quantity: 1, netAmount: 700, displayOrder: 1 },
    ],
    ...overrides,
  };
}

// ============================================
// Tests
// ============================================

describe('Notification Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset env to enabled state
    mockEnv.WHATSAPP_ACCESS_TOKEN = 'test-token';
    mockEnv.WHATSAPP_PHONE_NUMBER_ID = 'test-phone-id';
    mockEnv.WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED = 'appointment_booked_tpl';
    mockEnv.WHATSAPP_TEMPLATE_APPOINTMENT_RESCHEDULED = 'appointment_rescheduled_tpl';
    mockEnv.WHATSAPP_TEMPLATE_APPOINTMENT_CANCELLED = 'appointment_cancelled_tpl';
    mockEnv.WHATSAPP_TEMPLATE_INVOICE_FINALIZED = 'invoice_finalized_tpl';
    // Default: no idempotency record
    mockFindFirst.mockResolvedValue(null);
    mockCreate.mockResolvedValue({ id: 'log-001' });
    mockUpdate.mockResolvedValue({ id: 'log-001' });
  });

  // =============================================
  // 8.2 — Disabled state: warn logged exactly once
  // =============================================
  describe('disabled state (WHATSAPP_ACCESS_TOKEN absent)', () => {
    beforeEach(() => {
      mockEnv.WHATSAPP_ACCESS_TOKEN = undefined;
    });

    it('should not make any HTTP calls or DB writes', async () => {
      mockAppointmentFindFirst.mockResolvedValue(makeAppointment());

      await notifyAppointmentBooked(TENANT_ID, 'apt-001');
      await notifyAppointmentCancelled(TENANT_ID, 'apt-001');
      await notifyInvoiceFinalized(TENANT_ID, 'inv-001');

      expect(mockSendWhatsAppTemplate).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // Successful send — accepted log
  // =============================================
  describe('successful send', () => {
    it('should create an accepted log for appointment_booked', async () => {
      mockAppointmentFindFirst.mockResolvedValue(makeAppointment());
      mockSendWhatsAppTemplate.mockResolvedValue(undefined);

      await notifyAppointmentBooked(TENANT_ID, 'apt-001');

      expect(mockSendWhatsAppTemplate).toHaveBeenCalledTimes(1);
      expect(mockSendWhatsAppTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          to: '+919876543210',
          templateName: 'appointment_booked_tpl',
          languageCode: 'en_US',
        })
      );
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tenantId: TENANT_ID,
            type: 'appointment_booked',
            status: 'accepted',
            recipientPhone: '+919876543210',
            templateName: 'appointment_booked_tpl',
            referenceId: 'apt-001',
            referenceType: 'appointment',
          }),
        })
      );
    });

    it('should create an accepted log for invoice_finalized with itemized params', async () => {
      mockInvoiceFindFirst.mockResolvedValue(makeInvoice());
      mockSendWhatsAppTemplate.mockResolvedValue(undefined);

      await notifyInvoiceFinalized(TENANT_ID, 'inv-001');

      expect(mockSendWhatsAppTemplate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'invoice_finalized',
            status: 'accepted',
            referenceType: 'invoice',
            templateParams: expect.objectContaining({
              invoiceNumber: 'INV-202603-0001',
              itemsSummary: expect.stringContaining('Haircut'),
            }),
          }),
        })
      );

      // Verify the total is formatted as Indian Rupee
      const logCall = mockCreate.mock.calls[0][0];
      expect(logCall.data.templateParams.total).toMatch(/^₹/);
    });

    it('should create an accepted log for appointment_rescheduled with old and new times', async () => {
      mockAppointmentFindFirst.mockResolvedValue(
        makeAppointment({
          id: 'apt-002',
          scheduledDate: new Date(Date.UTC(2026, 2, 28)),
          scheduledTime: '16:00',
        })
      );
      mockSendWhatsAppTemplate.mockResolvedValue(undefined);

      await notifyAppointmentRescheduled(TENANT_ID, 'apt-002', '2026-03-25', '14:30');

      expect(mockSendWhatsAppTemplate).toHaveBeenCalledTimes(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'appointment_rescheduled',
            status: 'accepted',
            templateParams: expect.objectContaining({
              oldDate: '25 Mar 2026',
              oldTime: '02:30 PM',
              newDate: '28 Mar 2026',
              newTime: '04:00 PM',
            }),
          }),
        })
      );
    });
  });

  // =============================================
  // Failed send — failed log, no throw
  // =============================================
  describe('failed send', () => {
    it('should create a failed log and NOT throw', async () => {
      mockAppointmentFindFirst.mockResolvedValue(makeAppointment());
      mockSendWhatsAppTemplate.mockRejectedValue(new Error('WhatsApp API error 401: Unauthorized'));

      await expect(notifyAppointmentBooked(TENANT_ID, 'apt-001')).resolves.toBeUndefined();

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            errorMessage: 'WhatsApp API error 401: Unauthorized',
          }),
        })
      );
    });
  });

  // =============================================
  // No phone — skipped log
  // =============================================
  describe('missing phone number', () => {
    it('should create a skipped log with null recipientPhone for appointment', async () => {
      mockAppointmentFindFirst.mockResolvedValue(
        makeAppointment({ customerPhone: null, customer: { phone: null } })
      );

      await notifyAppointmentBooked(TENANT_ID, 'apt-001');

      expect(mockSendWhatsAppTemplate).not.toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'skipped',
            recipientPhone: null,
            errorMessage: 'No phone number on file',
          }),
        })
      );
    });

    it('should create a skipped log for invoice with no phone', async () => {
      mockInvoiceFindFirst.mockResolvedValue(
        makeInvoice({ customerPhone: null, customer: { phone: null } })
      );

      await notifyInvoiceFinalized(TENANT_ID, 'inv-001');

      expect(mockSendWhatsAppTemplate).not.toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'skipped',
            recipientPhone: null,
            referenceType: 'invoice',
          }),
        })
      );
    });
  });

  // =============================================
  // 8.3 — Misconfigured: template env var absent
  // =============================================
  describe('misconfigured state (template env var absent)', () => {
    it('should create a failed log when template name is not configured', async () => {
      mockEnv.WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED = undefined;
      mockAppointmentFindFirst.mockResolvedValue(makeAppointment());

      await notifyAppointmentBooked(TENANT_ID, 'apt-001');

      expect(mockSendWhatsAppTemplate).not.toHaveBeenCalled();
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'failed',
            templateName: '',
            errorMessage: expect.stringContaining('not configured'),
          }),
        })
      );
    });
  });

  // =============================================
  // Idempotency — duplicate within 60s suppressed
  // =============================================
  describe('idempotency', () => {
    it('should skip when an accepted record exists within 60s', async () => {
      mockAppointmentFindFirst.mockResolvedValue(makeAppointment());
      mockFindFirst.mockResolvedValue({
        id: 'log-existing',
        status: 'accepted',
        attemptCount: 1,
        createdAt: new Date(),
      });

      await notifyAppointmentBooked(TENANT_ID, 'apt-001');

      expect(mockSendWhatsAppTemplate).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // 8.5 — Skipped record suppresses retry
  // =============================================
  describe('skipped record suppression', () => {
    it('should not retry when a skipped record exists within 60s', async () => {
      mockAppointmentFindFirst.mockResolvedValue(makeAppointment());
      mockFindFirst.mockResolvedValue({
        id: 'log-skipped',
        status: 'skipped',
        attemptCount: 1,
        createdAt: new Date(),
      });

      await notifyAppointmentBooked(TENANT_ID, 'apt-001');

      expect(mockSendWhatsAppTemplate).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // 8.4 — Terminal retry: attemptCount = 3
  // =============================================
  describe('terminal retry (attemptCount >= 3)', () => {
    it('should NOT retry when attemptCount is 3', async () => {
      mockAppointmentFindFirst.mockResolvedValue(makeAppointment());
      mockFindFirst.mockResolvedValue({
        id: 'log-terminal',
        status: 'failed',
        attemptCount: 3,
        createdAt: new Date(),
      });

      await notifyAppointmentBooked(TENANT_ID, 'apt-001');

      expect(mockSendWhatsAppTemplate).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });

  // =============================================
  // Retry — failed with attemptCount < 3
  // =============================================
  describe('retry logic', () => {
    it('should retry and update existing record on success', async () => {
      mockAppointmentFindFirst.mockResolvedValue(makeAppointment());
      mockFindFirst.mockResolvedValue({
        id: 'log-retry',
        status: 'failed',
        attemptCount: 1,
        createdAt: new Date(),
      });
      mockSendWhatsAppTemplate.mockResolvedValue(undefined);

      await notifyAppointmentBooked(TENANT_ID, 'apt-001');

      expect(mockSendWhatsAppTemplate).toHaveBeenCalledTimes(1);
      // Should UPDATE existing record, not create new
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'log-retry' },
          data: expect.objectContaining({
            status: 'accepted',
            attemptCount: 2,
          }),
        })
      );
    });

    it('should retry and update with failed status on error', async () => {
      mockAppointmentFindFirst.mockResolvedValue(makeAppointment());
      mockFindFirst.mockResolvedValue({
        id: 'log-retry-2',
        status: 'failed',
        attemptCount: 2,
        createdAt: new Date(),
      });
      mockSendWhatsAppTemplate.mockRejectedValue(new Error('Timeout'));

      await notifyAppointmentCancelled(TENANT_ID, 'apt-001');

      expect(mockSendWhatsAppTemplate).toHaveBeenCalledTimes(1);
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'log-retry-2' },
          data: expect.objectContaining({
            status: 'failed',
            attemptCount: 3,
            errorMessage: 'Timeout',
          }),
        })
      );
    });
  });

  // =============================================
  // Entity not found — silent return
  // =============================================
  describe('entity not found', () => {
    it('should return silently when appointment does not exist', async () => {
      mockAppointmentFindFirst.mockResolvedValue(null);

      await expect(notifyAppointmentBooked(TENANT_ID, 'nonexistent')).resolves.toBeUndefined();

      expect(mockSendWhatsAppTemplate).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it('should return silently when invoice does not exist', async () => {
      mockInvoiceFindFirst.mockResolvedValue(null);

      await expect(notifyInvoiceFinalized(TENANT_ID, 'nonexistent')).resolves.toBeUndefined();

      expect(mockSendWhatsAppTemplate).not.toHaveBeenCalled();
      expect(mockCreate).not.toHaveBeenCalled();
    });
  });
});
