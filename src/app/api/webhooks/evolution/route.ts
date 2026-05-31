import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);

    const apiKey = request.headers.get('apikey');
    const expectedApiKey = process.env.EVOLUTION_GLOBAL_API_KEY;

    if (expectedApiKey && apiKey !== expectedApiKey) {
      console.warn('Evolution webhook: Invalid API key');
    }

    const eventType = body.event;
    const instanceName = body.instance?.instanceName || body.instance;

    console.log('Evolution webhook received:', {
      event: eventType,
      instance: instanceName,
    });

    switch (eventType) {
      case 'connection.update': {
        const state = body.data?.state;
        let status = 'disconnected';

        if (state === 'open') status = 'connected';
        else if (state === 'connecting') status = 'connecting';
        else if (state === 'close' || state === 'closed') status = 'disconnected';

        if (instanceName) {
          try {
            const instance = await prisma.evolutionInstance.findFirst({
              where: { instanceName: String(instanceName) },
            });
            if (instance) {
              await prisma.evolutionInstance.update({
                where: { id: instance.id },
                data: {
                  status,
                  ...(state === 'open' ? { qrCode: null } : {}),
                  updatedAt: new Date(),
                },
              });
            }
          } catch (dbError) {
            console.error('Error updating instance status in DB:', dbError);
          }
        }

        break;
      }

      case 'messages.upsert': {
        const message = body.data?.message;
        if (message && !message.key?.fromMe) {
          const from = message.key?.remoteJid?.replace('@s.us', '') || '';
          const messageContent =
            message.message?.conversation ||
            message.message?.extendedTextMessage?.text ||
            '';

          console.log('Incoming WhatsApp message:', {
            from,
            content: messageContent,
            instance: instanceName,
          });

          // Auto-reply is handled by the instance owner's webhook configuration
          // We just log it here for now
        }
        break;
      }

      default:
        console.log(`Unhandled Evolution webhook event: ${eventType}`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Evolution webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}