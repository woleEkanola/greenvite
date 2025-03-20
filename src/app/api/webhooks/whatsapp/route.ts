import { NextResponse } from 'next/server';
import { sendWhatsApp } from '@/lib/communications';

// Store your security tokens in environment variables
const SECURITY_TOKENS: { [key: string]: string } = {
  [process.env.WAAPI_INSTANCE_ID || '']: process.env.WAAPI_TOKEN || '',
};

export async function POST(request: Request): Promise<Response> {
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
      return new Response(JSON.stringify({ error: 'Invalid request' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate security token
    if (SECURITY_TOKENS[instanceId] !== securityToken) {
      console.log('Authentication failed');
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
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

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Unhandled event type' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}