import { Resend } from 'resend';

const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@greenvites.online';
const RESEND_FROM_NAME = process.env.RESEND_FROM_NAME || 'Greenvites';

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  return new Resend(apiKey);
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  imageUrl?: string | null;
  attachments?: any[];
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export async function sendEmail({
  to,
  subject,
  html,
  imageUrl,
  attachments = [],
}: EmailOptions): Promise<EmailResult> {
  if (!process.env.RESEND_API_KEY) {
    console.error('Resend API key is not configured');
    return { success: false, error: 'RESEND_API_KEY_NOT_CONFIGURED' };
  }

  const { html: processedHtml, attachments: imageAttachments } =
    processEmailTemplate(html, imageUrl);

  const allAttachments = [...attachments, ...imageAttachments];

  const maxRetries = 3;
  let retryCount = 0;
  let lastError: string | null = null;

  while (retryCount < maxRetries) {
    try {
      console.log(`Attempt ${retryCount + 1} to send email to ${to} via Resend`);

      const resend = getResendClient();

      const emailPayload: any = {
        from: `${RESEND_FROM_NAME} <${RESEND_FROM_EMAIL}>`,
        to,
        subject,
        html: processedHtml,
      };

      if (allAttachments.length > 0) {
        emailPayload.attachments = allAttachments.map((att: any) => ({
          filename: att.filename || att.name || 'attachment',
          content: att.content || att.path,
          ...(att.cid ? { contentId: att.cid } : {}),
        }));
      }

      const { data, error } = await resend.emails.send(emailPayload);

      if (error) {
        console.error('Resend error:', error);
        lastError = error.message || String(error);
        retryCount++;

        if (retryCount < maxRetries) {
          const delayMs = 1000 * retryCount;
          console.log(`Retrying in ${delayMs}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
        continue;
      }

      console.log(`Email sent successfully to ${to} via Resend: ${data?.id}`);
      return { success: true, messageId: data?.id };
    } catch (error: any) {
      lastError = error?.message || 'Unknown error';
      console.error(`Failed to send email to ${to} (attempt ${retryCount + 1}/${maxRetries}):`, lastError);
      retryCount++;

      if (retryCount < maxRetries) {
        const delayMs = 1000 * retryCount;
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error(`All ${maxRetries} attempts to send email to ${to} failed.`);
  return {
    success: false,
    error: 'MAX_RETRIES_EXCEEDED',
  };
}

export function processEmailTemplate(
  template: string,
  imageUrl?: string | null
): { html: string; attachments: any[] } {
  const attachments: any[] = [];
  let processedHtml = template;

  if (imageUrl) {
    const contentId = 'invitation-image';

    if (template.includes('{{image}}')) {
      processedHtml = template.replace(
        '{{image}}',
        `<img src="cid:${contentId}" style="max-width: 100%; height: auto;" alt="Invitation Image" />`
      );
    } else if (!template.includes(`cid:${contentId}`)) {
      processedHtml = `${template}\n<div style="margin-top: 20px;"><img src="cid:${contentId}" style="max-width: 100%; height: auto;" alt="Invitation Image" /></div>`;
    }

    attachments.push({
      filename: 'invitation-image.jpg',
      path: imageUrl,
      cid: contentId,
    });
  } else {
    processedHtml = template.replace('{{image}}', '');
  }

  return { html: processedHtml, attachments };
}