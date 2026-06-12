import { prisma } from '@/lib/prisma';
import * as evolutionClient from './client';
import { RateLimiter } from '@/lib/rate-limiter';
import { MessageVersioner } from '@/lib/message-versioner';
import type { InstanceStatus, RateLimitConfig } from './types';

const DEFAULT_RATE_LIMIT: RateLimitConfig = {
  messagesPerMinute: 5,
  delayBetweenMs: 3000,
  maxBurst: 3,
};

export async function getInstanceForEvent(
  eventId: string
): Promise<{ instanceName: string; rateLimitConfig: RateLimitConfig } | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { evolutionInstance: true },
  });

  if (!event?.evolutionInstance) {
    return null;
  }

  return {
    instanceName: event.evolutionInstance.instanceName,
    rateLimitConfig: {
      messagesPerMinute: event.evolutionInstance.messagesPerMinute,
      delayBetweenMs: event.evolutionInstance.delayBetweenMs,
      maxBurst: event.evolutionInstance.maxBurst,
    },
  };
}

export async function getInstanceForUser(
  userId: string,
  instanceName?: string
): Promise<{ instanceName: string; rateLimitConfig: RateLimitConfig } | null> {
  const where: any = { ownerId: userId };
  if (instanceName) {
    where.instanceName = instanceName;
  }
  const instance = await prisma.evolutionInstance.findFirst({ where });

  if (!instance) {
    return null;
  }

  return {
    instanceName: instance.instanceName,
    rateLimitConfig: {
      messagesPerMinute: instance.messagesPerMinute,
      delayBetweenMs: instance.delayBetweenMs,
      maxBurst: instance.maxBurst,
    },
  };
}

export async function createInstanceForUser(
  userId: string,
  instanceName: string
): Promise<{ instanceName: string; qrCode: string | null; status: InstanceStatus }> {
  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'https://greenvite.vercel.app')}/api/webhooks/evolution`;

  const result = await evolutionClient.createInstance({
    instanceName,
    webhookUrl,
    webhookByEvent: true,
    events: ['connection.update', 'messages.upsert'],
  });

  let qrCode: string | null = null;
  let status: InstanceStatus = 'disconnected';

  try {
    const connectResult = await evolutionClient.connectInstance(instanceName);
    qrCode = connectResult.base64 || null;
    status = 'connecting';
  } catch (error) {
    console.error('Error getting QR code after instance creation:', error);
  }

  await prisma.evolutionInstance.create({
    data: {
      instanceName,
      status,
      qrCode,
      ownerId: userId,
    },
  });

  return { instanceName, qrCode, status };
}

export async function getQrCode(
  instanceName: string
): Promise<{ qrCode: string | null; status: InstanceStatus }> {
  try {
    const connectResult = await evolutionClient.connectInstance(instanceName);
    const qrCode = connectResult.base64 || null;

    await updateInstanceByName(instanceName, { qrCode, status: 'connecting' });

    return { qrCode, status: 'connecting' };
  } catch (error: any) {
    if (error.response?.data?.message?.includes('already connected')) {
      await updateInstanceByName(instanceName, { status: 'connected', qrCode: null });
      return { qrCode: null, status: 'connected' };
    }
    throw error;
  }
}

export async function getConnectionStatus(
  instanceName: string
): Promise<InstanceStatus> {
  try {
    const result = await evolutionClient.getConnectionState(instanceName);
    const state = result.instance?.state || result.instance?.status || 'disconnected';

    let status: InstanceStatus = 'disconnected';
    if (state === 'open') status = 'connected';
    else if (state === 'connecting') status = 'connecting';
    else if (state === 'close' || state === 'closed') status = 'disconnected';
    else status = 'disconnected';

    await updateInstanceByName(instanceName, { status });

    return status;
  } catch (error) {
    console.error('Error checking connection status:', error);
    return 'error';
  }
}

export async function disconnectInstance(instanceName: string): Promise<void> {
  await evolutionClient.logoutInstance(instanceName);

  await updateInstanceByName(instanceName, { status: 'disconnected', qrCode: null });
}

export async function sendWhatsAppMessage(
  instanceName: string,
  phone: string,
  message: string,
  imageUrl?: string | null,
  rateLimitConfig?: RateLimitConfig,
  recipientKey?: string
): Promise<boolean> {
  const config = rateLimitConfig || DEFAULT_RATE_LIMIT;

  await RateLimiter.waitIfNeeded(instanceName, config);

  const formattedPhone = formatPhone(phone);

  const finalMessage = recipientKey
    ? MessageVersioner.rotateMessage(message, recipientKey)
    : message;

  try {
    if (imageUrl) {
      await evolutionClient.sendMediaMessage(instanceName, {
        number: formattedPhone,
        mediatype: 'image',
        media: imageUrl,
        caption: finalMessage,
        delay: config.delayBetweenMs,
      });
    } else {
      await evolutionClient.sendTextMessage(instanceName, {
        number: formattedPhone,
        text: finalMessage,
        delay: config.delayBetweenMs,
      });
    }

    RateLimiter.recordSend(instanceName);
    return true;
  } catch (error: any) {
    console.error('Error sending WhatsApp message via Evolution API:', error?.response?.data || error?.message);

    if (error?.response?.status === 429) {
      console.warn('Rate limited by Evolution API, backing off...');
      await RateLimiter.backoff(instanceName);
    }

    return false;
  }
}

function formatPhone(phone: string): string {
  let formatted = phone.replace(/[^\d+]/g, '');
  if (formatted.startsWith('+')) {
    formatted = formatted.substring(1);
  }
  if (formatted.startsWith('0')) {
    formatted = '234' + formatted.substring(1);
  }

  return formatted;
}

export async function updateRateLimitConfig(
  instanceName: string,
  config: Partial<RateLimitConfig>
): Promise<void> {
  await updateInstanceByName(instanceName, {
    ...(config.messagesPerMinute !== undefined && { messagesPerMinute: config.messagesPerMinute }),
    ...(config.delayBetweenMs !== undefined && { delayBetweenMs: config.delayBetweenMs }),
    ...(config.maxBurst !== undefined && { maxBurst: config.maxBurst }),
  });
}

export async function listUserInstances(userId: string) {
  return prisma.evolutionInstance.findMany({
    where: { ownerId: userId },
    orderBy: { createdAt: 'desc' },
  });
}

async function updateInstanceByName(instanceName: string, data: any) {
  const instance = await prisma.evolutionInstance.findFirst({
    where: { instanceName },
  });
  if (!instance) {
    throw new Error(`Instance ${instanceName} not found`);
  }
  return prisma.evolutionInstance.update({
    where: { id: instance.id },
    data,
  });
}

async function deleteInstanceByName(instanceName: string) {
  const instance = await prisma.evolutionInstance.findFirst({
    where: { instanceName },
  });
  if (!instance) {
    throw new Error(`Instance ${instanceName} not found`);
  }
  return prisma.evolutionInstance.delete({
    where: { id: instance.id },
  });
}

export async function deleteInstanceRecord(instanceName: string) {
  try {
    await evolutionClient.deleteInstance(instanceName);
  } catch (error) {
    console.error('Error deleting instance from Evolution API:', error);
  }

  await deleteInstanceByName(instanceName);
}