/**
 * WhatsApp HTTP Client
 *
 * Single responsibility: make HTTP calls to the Meta Cloud API.
 * No business logic, no DB access, no logging.
 *
 * Credentials are read at call time (not module load) so that:
 * - Tests can set/unset env vars between calls
 * - Template names can be swapped without restarting the process
 */

import { env } from '@/config/env';
import { logger } from '@/lib/logger';

// ============================================
// Types
// ============================================

export interface BodyParameter {
  type: 'text';
  text: string;
}

export interface TemplateComponent {
  type: 'body';
  parameters: BodyParameter[];
}

export interface SendTemplateOptions {
  /** Recipient phone number without '+' prefix (e.g. "919876543210") */
  to: string;
  templateName: string;
  languageCode: string;
  components?: TemplateComponent[];
}

// ============================================
// Helpers
// ============================================

const META_API_BASE = 'https://graph.facebook.com/v22.0';

/**
 * Normalize phone number to Meta's expected format: digits only, with country code.
 *
 * "+919876543210" → "919876543210"
 * "919876543210"  → "919876543210"
 * "9876543210"    → "919876543210"  (adds India country code)
 * "09876543210"   → "919876543210"  (strips leading 0, adds 91)
 */
function normalizePhone(phone: string): string {
  // Strip everything except digits
  let digits = phone.replace(/\D/g, '');

  // If starts with 0, strip it (local format like 09876543210)
  if (digits.startsWith('0')) {
    digits = digits.substring(1);
  }

  // If 10 digits, assume Indian number — prepend 91
  if (digits.length === 10) {
    digits = `91${digits}`;
  }

  return digits;
}

// ============================================
// Client
// ============================================

/**
 * Sends a WhatsApp template message via Meta Cloud API.
 *
 * Reads WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_NUMBER_ID from env at call time.
 *
 * @throws {Error} When ACCESS_TOKEN or PHONE_NUMBER_ID is not configured
 * @throws {Error} When Meta API returns a non-2xx response
 */
export async function sendWhatsAppTemplate(options: SendTemplateOptions): Promise<void> {
  const accessToken = env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;

  if (!accessToken) {
    throw new Error('WhatsApp client not configured: WHATSAPP_ACCESS_TOKEN not set');
  }

  if (!phoneNumberId) {
    throw new Error('WhatsApp client not configured: WHATSAPP_PHONE_NUMBER_ID not set');
  }

  const url = `${META_API_BASE}/${phoneNumberId}/messages`;

  // Build template object — only include components if provided and non-empty
  const template: Record<string, unknown> = {
    name: options.templateName,
    language: { code: options.languageCode },
  };

  if (options.components && options.components.length > 0) {
    template.components = options.components;
  }

  const body = {
    messaging_product: 'whatsapp',
    to: normalizePhone(options.to),
    type: 'template',
    template,
  };

  // ── DEBUG: log exactly what we're sending ──────────────────────────────────
  logger.info(
    {
      whatsapp_debug: true,
      url,
      phoneNumberId,
      to: body.to,
      templateName: options.templateName,
      languageCode: options.languageCode,
      hasComponents: !!(options.components && options.components.length > 0),
      requestBody: JSON.stringify(body),
    },
    '[WhatsApp] → Sending API request'
  );
  // ──────────────────────────────────────────────────────────────────────────

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  const responseText = await response.text();

  // ── DEBUG: log exactly what Meta returned ─────────────────────────────────
  logger.info(
    {
      whatsapp_debug: true,
      httpStatus: response.status,
      ok: response.ok,
      responseBody: responseText,
    },
    '[WhatsApp] ← Meta API response'
  );
  // ──────────────────────────────────────────────────────────────────────────

  if (!response.ok) {
    throw new Error(`WhatsApp API error ${response.status}: ${responseText}`);
  }
}
