import { NextResponse } from 'next/server';
import { sendWhatsApp } from '@/lib/communications';
import crypto from 'crypto';

// Store your security tokens in environment variables
const SECURITY_TOKENS: { [key: string]: string } = {
  [process.env.WAAPI_INSTANCE_ID || '']: process.env.WAAPI_TOKEN || '',
};

// Verify HMAC signature
function verifyHmacSignature(body: string, signature: string, secret: string): boolean {
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(computedSignature));
}

export async function POST(request: Request): Promise<Response> {
  try {
    // Get raw request body for HMAC verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    
    // Get headers
    const instanceId = request.headers.get('x-waapi-instance-id');
    const hmacSignature = request.headers.get('x-waapi-hmac');
    const requestId = request.headers.get('x-waapi-request-id');

    console.log('Webhook received:', {
      instanceId,
      requestId,
      body: JSON.stringify(body, null, 2)
    });

    if (!instanceId || !hmacSignature || !requestId) {
      console.log('Missing required headers:', { instanceId, hmacSignature, requestId });
      return new Response(
        JSON.stringify({ error: 'Missing required headers' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the security token for this instance
    const securityToken = SECURITY_TOKENS[instanceId];
    if (!securityToken) {
      console.log('Unknown instance ID:', instanceId);
      return new Response(
        JSON.stringify({ error: 'Invalid instance ID' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify HMAC signature
    if (!verifyHmacSignature(rawBody, hmacSignature, securityToken)) {
      console.log('Invalid HMAC signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Handle message event
    if (body.event === 'message') {
      const messageData = body.data?.message;
      
      if (messageData?.type === 'chat') {
        const messageSenderId = messageData.from;
        const messageContent = messageData.body;
        const phoneNumber = messageSenderId.replace('@c.us', '');

        console.log('Received message:', {
          from: phoneNumber,
          content: messageContent
        });

        // Send auto-response
        const autoResponse = "Thank you for reaching out, kindly message or call +234-8168480564 for more information";
        
        await sendWhatsApp(
          phoneNumber,
          '', // name (not needed for auto-response)
          '', // code (not needed for auto-response)
          autoResponse,
          '', // eventLink (not needed for auto-response)
        );

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Auto-response sent successfully'
          }),
          { 
            status: 200,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
    }

    // Handle other events
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Event received but no action taken'
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}