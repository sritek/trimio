/**
 * Email Service
 * AWS SES integration for sending transactional emails
 */

import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

import { env } from '@/config/env';
import { logger } from './logger';

// SES Client - only create if AWS credentials are available
let sesClient: SESClient | null = null;

if (env.AWS_ACCESS_KEY_ID && env.AWS_SECRET_ACCESS_KEY) {
  sesClient = new SESClient({
    region: env.AWS_REGION,
    credentials: {
      accessKeyId: env.AWS_ACCESS_KEY_ID,
      secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
    },
  });
  logger.info('AWS SES client initialized');
} else {
  logger.warn('AWS credentials not configured - email sending disabled');
}

// Email configuration
const FROM_EMAIL = env.EMAIL_FROM || 'noreply@trimio.com';
const FROM_NAME = env.EMAIL_FROM_NAME || 'Trimio';

export interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Send an email via AWS SES
 */
export async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const { to, subject, html, text, replyTo } = options;
  const recipients = Array.isArray(to) ? to : [to];

  // If SES is not configured, log and return
  if (!sesClient) {
    logger.warn(
      { to: recipients, subject },
      'Email not sent - AWS SES not configured. Email content logged for development.'
    );
    logger.debug({ html, text }, 'Email content (dev mode)');
    return false;
  }

  try {
    const command = new SendEmailCommand({
      Source: `${FROM_NAME} <${FROM_EMAIL}>`,
      Destination: {
        ToAddresses: recipients,
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: html,
            Charset: 'UTF-8',
          },
          ...(text && {
            Text: {
              Data: text,
              Charset: 'UTF-8',
            },
          }),
        },
      },
      ...(replyTo && {
        ReplyToAddresses: [replyTo],
      }),
    });

    const result = await sesClient.send(command);
    logger.info(
      { messageId: result.MessageId, to: recipients, subject },
      'Email sent successfully'
    );
    return true;
  } catch (error) {
    logger.error({ error, to: recipients, subject }, 'Failed to send email');
    return false;
  }
}

/**
 * Check if email service is available
 */
export function isEmailEnabled(): boolean {
  return sesClient !== null;
}
