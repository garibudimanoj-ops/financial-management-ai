export interface EmailProvider {
  name: string;
  sendEmail(params: SendEmailParams): Promise<SendEmailResult>;
}

export interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailConfig {
  provider: 'resend' | 'none';
  fromEmail: string;
  apiKey?: string;
  domain?: string;
}