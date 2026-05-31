import { sendWhatsAppMessage as sendEvolutionMsg, getInstanceForEvent, createInstanceForUser, getQrCode, getConnectionStatus, disconnectInstance, listUserInstances, updateRateLimitConfig, deleteInstanceRecord } from './evolution-api/service';
import { sendEmail as sendResendEmail } from './resend-email';
import { MessageVersioner } from './message-versioner';
import { RateLimiter } from './rate-limiter';
import type { RateLimitConfig } from './evolution-api/types';

export async function sendWhatsApp(
  phone: string,
  name: string,
  code: string,
  message: string,
  eventLink: string,
  imageBuffer?: Buffer,
  imageUrl?: string,
  instanceName?: string,
  rateLimitConfig?: RateLimitConfig
): Promise<boolean> {
  try {
    const formattedMessage = message
      .replace(/\{\{code\}\}/g, code)
      .replace(/\{\{link\}\}/g, eventLink)
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{code\}/g, code)
      .replace(/\{link\}/g, eventLink)
      .replace(/\{name\}/g, name);

    const effectiveImageUrl = imageUrl || undefined;
    const recipientKey = `${instanceName || 'default'}:${phone}`;
    const variedMessage = MessageVersioner.rotateMessage(formattedMessage, recipientKey);

    const result = await sendEvolutionMsg(
      instanceName || 'default',
      phone,
      variedMessage,
      effectiveImageUrl,
      rateLimitConfig,
      recipientKey
    );

    return result;
  } catch (error) {
    console.error('Error sending WhatsApp message:', error);
    return false;
  }
}

export async function sendEmail(
  email: string,
  name: string,
  code: string,
  subject: string,
  htmlMessage: string,
  eventLink: string,
  imageBuffer?: Buffer,
  imageUrl?: string
): Promise<boolean> {
  try {
    let personalizedMessage = htmlMessage;
    if (imageBuffer && !htmlMessage.includes('{{image}}')) {
      personalizedMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin: 20px 0;">
            <a href="${eventLink}#${code}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 14px 28px; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; text-decoration: none;">
              Confirm Your Attendance
            </a>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <img src="cid:invitation-image" alt="Invitation Image" style="max-width: 100%; height: auto;"/>
          </div>
        </div>
      `;
    }

    personalizedMessage = personalizedMessage
      .replace(/\{\{name\}\}/g, name)
      .replace(/\{\{code\}\}/g, code)
      .replace(/\{\{link\}\}/g, eventLink ? `${eventLink}#${code}` : code)
      .replace(/\{\{image\}\}/g, '<img src="cid:invitation-image" alt="Invitation Image" style="max-width: 100%; height: auto;"/>')
      .replace(/\{name\}/g, name)
      .replace(/\{code\}/g, code)
      .replace(/\{link\}/g, eventLink ? `${eventLink}#${code}` : code)
      .replace(/\{image\}/g, '<img src="cid:invitation-image" alt="Invitation Image" style="max-width: 100%; height: auto;"/>');

    if (!personalizedMessage.includes('<div') && !personalizedMessage.includes('<p') && !personalizedMessage.includes('<br')) {
      personalizedMessage = personalizedMessage.replace(/\n/g, '<br>');
      personalizedMessage = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">${personalizedMessage}</div>`;
    }

    const result = await sendResendEmail({
      to: email,
      subject,
      html: personalizedMessage,
      imageUrl: imageUrl || null,
    });

    return result.success;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}

export {
  getInstanceForEvent,
  createInstanceForUser,
  getQrCode,
  getConnectionStatus as checkWhatsAppConnection,
  disconnectInstance,
  listUserInstances as listWhatsAppInstances,
  updateRateLimitConfig,
  deleteInstanceRecord,
  RateLimiter,
  MessageVersioner,
};