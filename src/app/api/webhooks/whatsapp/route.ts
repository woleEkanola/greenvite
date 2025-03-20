import { NextResponse } from 'next/server';
import { sendWhatsApp } from '@/lib/communications';

// Store your security tokens in environment variables
const SECURITY_TOKENS: { [key: string]: string } = {
  [process.env.WAAPI_INSTANCE_ID || '']: process.env.WAAPI_TOKEN || '',
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const instanceId = body.instanceId;
    const eventName = body.event;
    const eventData = body.data;
    
    // Extract security token from Authorization header
    const authHeader = request.headers.get('Authorization');
    const securityToken = authHeader?.replace('Bearer ', '');

    if (!securityToken || !instanceId || !eventName || !eventData) {
      console.log('Invalid request');
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Validate security token
    if (SECURITY_TOKENS[instanceId] !== securityToken) {
      console.log('Authentication failed');
      return NextResponse.json({ error: 'Authentication failed' }, { status: 401 });
    }

    // Handle message event
    if (eventName === 'message') {
      const messageData = eventData.message;
      
      if (messageData.type === 'chat') {
        const messageSenderId = messageData.from;
        const messageContent = messageData.body;
        const phoneNumber = messageSenderId.replace('@c.us', '');

        // Send auto-response
        const autoResponse = "Thank you for reaching out, kindly message or call +234-8168480564 for more information";
        
        await sendWhatsApp(
          phoneNumber,
          '', // name (not needed for auto-response)
          '', // code (not needed for auto-response)
          autoResponse,
          '', // eventLink (not needed for auto-response)
        );

        return NextResponse.json({ success: true }, { status: 200 });
      }
    }

    return NextResponse.json({ error: 'Unhandled event type' }, { status: 404 });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}