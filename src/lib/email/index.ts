export type { EmailConfig, EmailProvider, SendEmailParams, SendEmailResult } from './types';
export {
  createEmailProvider,
  emailProvider,
  getEmailProviderStatus,
  getEmailConfig,
} from './emailService';
export { EmailTemplates } from './templates';