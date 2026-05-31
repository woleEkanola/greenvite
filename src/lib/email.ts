import { sendEmail as sendResendEmail } from './resend-email';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: any[];
  imageUrl?: string | null;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail(options: EmailOptions): Promise<EmailResult> {
  return sendResendEmail(options);
}

export { processEmailTemplate } from './resend-email';