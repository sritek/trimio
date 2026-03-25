/**
 * WhatsApp HTTP Client Unit Tests
 *
 * 8.1 — Sends correct HTTP request shape (method, URL, headers, body)
 * + config error tests for missing credentials
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mutable env for toggling credentials per test
const mockEnv: Record<string, string | undefined> = {
  WHATSAPP_ACCESS_TOKEN: 'test-access-token',
  WHATSAPP_PHONE_NUMBER_ID: '123456789',
};

vi.mock('@/config/env', () => ({
  env: new Proxy({} as Record<string, string | undefined>, {
    get(_target, prop: string) {
      return mockEnv[prop];
    },
  }),
}));

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

import { sendWhatsAppTemplate } from './whatsapp';

describe('WhatsApp HTTP Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.WHATSAPP_ACCESS_TOKEN = 'test-access-token';
    mockEnv.WHATSAPP_PHONE_NUMBER_ID = '123456789';
  });

  it('should send correct HTTP request shape', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await sendWhatsAppTemplate({
      to: '+919876543210',
      templateName: 'appointment_booked',
      languageCode: 'en_US',
      components: [
        {
          type: 'body',
          parameters: [
            { type: 'text', text: 'Jane Doe' },
            { type: 'text', text: 'Haircut' },
          ],
        },
      ],
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);

    const [url, options] = mockFetch.mock.calls[0];

    // URL contains phoneNumberId with v22.0
    expect(url).toBe('https://graph.facebook.com/v22.0/123456789/messages');

    // Method is POST
    expect(options.method).toBe('POST');

    // Authorization header
    expect(options.headers.Authorization).toBe('Bearer test-access-token');
    expect(options.headers['Content-Type']).toBe('application/json');

    // Body structure
    const body = JSON.parse(options.body);
    expect(body.messaging_product).toBe('whatsapp');
    expect(body.to).toBe('919876543210'); // '+' stripped
    expect(body.type).toBe('template');
    expect(body.template.name).toBe('appointment_booked');
    expect(body.template.language.code).toBe('en_US');
    expect(body.template.components).toHaveLength(1);
    expect(body.template.components[0].type).toBe('body');
    expect(body.template.components[0].parameters).toHaveLength(2);
  });

  it('should omit components when empty', async () => {
    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    await sendWhatsAppTemplate({
      to: '919876543210',
      templateName: 'hello_world',
      languageCode: 'en_US',
    });

    const [, options] = mockFetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body.template.components).toBeUndefined();
  });

  it('should throw on non-2xx response with status and body', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 401,
      text: () => Promise.resolve('{"error":{"message":"Invalid token"}}'),
    });

    await expect(
      sendWhatsAppTemplate({
        to: '+919876543210',
        templateName: 'test_tpl',
        languageCode: 'en_US',
        components: [],
      })
    ).rejects.toThrow('WhatsApp API error 401');
  });

  it('should throw when WHATSAPP_ACCESS_TOKEN is not set', async () => {
    mockEnv.WHATSAPP_ACCESS_TOKEN = undefined;

    await expect(
      sendWhatsAppTemplate({
        to: '+919876543210',
        templateName: 'test_tpl',
        languageCode: 'en_US',
        components: [],
      })
    ).rejects.toThrow('WHATSAPP_ACCESS_TOKEN not set');
  });

  it('should throw when WHATSAPP_PHONE_NUMBER_ID is not set', async () => {
    mockEnv.WHATSAPP_PHONE_NUMBER_ID = undefined;

    await expect(
      sendWhatsAppTemplate({
        to: '+919876543210',
        templateName: 'test_tpl',
        languageCode: 'en_US',
        components: [],
      })
    ).rejects.toThrow('WHATSAPP_PHONE_NUMBER_ID not set');
  });
});
