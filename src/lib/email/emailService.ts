import type { EmailConfig, EmailProvider, SendEmailParams, SendEmailResult } from './types';

const RESEND_API_URL = 'https://api.resend.com/emails';

function getEmailConfig(): EmailConfig {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;
  const domain = process.env.RESEND_DOMAIN;

  if (!apiKey || !fromEmail || !domain) {
    return {
      provider: 'none',
      fromEmail: fromEmail || '',
    };
  }

  return {
    provider: 'resend',
    fromEmail,
    apiKey,
    domain,
  };
}

export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';

  constructor(private readonly config: EmailConfig) {}

  async sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
    if (this.config.provider !== 'resend' || !this.config.apiKey) {
      return {
        success: false,
        error: 'Email provider is not configured. Set RESEND_API_KEY, RESEND_FROM_EMAIL, and RESEND_DOMAIN.',
      };
    }

    try {
      const response = await fetch(RESEND_API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: params.from ?? `${this.config.fromEmail}`,
          to: [params.to],
          subject: params.subject,
          html: params.html,
          text: params.text,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: errorText || `Resend API returned ${response.status}`,
        };
      }

      const result = (await response.json()) as { id?: string };
      return {
        success: true,
        messageId: result.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send email',
      };
    }
  }
}

export function createEmailProvider(config = getEmailConfig()): EmailProvider {
  if (config.provider === 'resend') {
    return new ResendEmailProvider(config);
  }

  return {
    name: 'none',
    async sendEmail() {
      return {
        success: false,
        error: 'Email provider is not configured. Set RESEND_API_KEY, RESEND_FROM_EMAIL, and RESEND_DOMAIN.',
      };
    },
  };
}

export const emailProvider = createEmailProvider();

export function getEmailProviderStatus() {
  return {
    configured: emailProvider.name !== 'none',
    provider: emailProvider.name,
  };
}

export { getEmailConfig };