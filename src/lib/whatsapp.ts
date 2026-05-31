import { getInstanceForEvent, getInstanceForUser, sendWhatsAppMessage as sendEvolutionMessage, getConnectionStatus } from './evolution-api/service';
import { MessageVersioner } from './message-versioner';
import type { RateLimitConfig } from './evolution-api/types';

export async function sendWhatsAppNotification(
  phone: string,
  message: string,
  imageUrl?: string | null,
  includeImageInWhatsApp: boolean = true,
  instanceName?: string,
  rateLimitConfig?: RateLimitConfig
): Promise<boolean> {
  try {
    const effectiveImageUrl = includeImageInWhatsApp ? imageUrl : null;
    const recipientKey = `default:${phone}`;

    const result = await sendEvolutionMessage(
      instanceName || 'default',
      phone,
      message,
      effectiveImageUrl,
      rateLimitConfig,
      recipientKey
    );

    return result;
  } catch (error) {
    console.error('Error sending WhatsApp notification via Evolution API:', error);
    return false;
  }
}

export async function checkWhatsAppConnection(instanceName: string): Promise<string> {
  try {
    const status = await getConnectionStatus(instanceName);
    return status;
  } catch (error) {
    console.error('Error checking WhatsApp connection:', error);
    return 'error';
  }
}

export { MessageVersioner };
export type { RateLimitConfig };
export { getInstanceForEvent, getInstanceForUser };

export default sendWhatsAppNotification;