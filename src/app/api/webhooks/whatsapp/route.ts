import { NextResponse } from 'next/server';
import { sendWhatsApp } from '@/lib/communications';
import crypto from 'crypto';

// Verify HMAC signature
function verifyHmacSignature(body: string, signature: string, token: string): boolean {
  try {
    // Clean the token and signature
    const cleanToken = token.trim();
    const cleanSignature = signature.trim().toLowerCase();
    
    const computedSignature = crypto
      .createHmac('sha256', cleanToken)
      .update(body)
      .digest('hex')
      .toLowerCase(); // WAAPI uses lowercase hex

    console.log('HMAC verification:', {
      computedSignature,
      receivedSignature: cleanSignature,
      match: computedSignature === cleanSignature
    });

    return computedSignature === cleanSignature;
  } catch (error) {
    console.error('Error verifying signature:', error);
    return false;
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    // Get raw request body for HMAC verification
    const rawBody = await request.text();
    const body = JSON.parse(rawBody);
    
    // Get headers
    const instanceId = request.headers.get('x-waapi-instance-id')?.trim();
    const hmacSignature = request.headers.get('x-waapi-hmac')?.trim();
    const requestId = request.headers.get('x-waapi-request-id')?.trim();

    console.log('Webhook received:', {
      instanceId,
      requestId,
      hmacSignature,
      event: body.event,
      messageType: body.data?.message?.type
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

    // Get the API token
    const apiToken = process.env.WAAPI_TOKEN?.trim();
    if (!apiToken) {
      console.error('WAAPI_TOKEN not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Verify HMAC signature
    const isValidSignature = verifyHmacSignature(rawBody, hmacSignature, apiToken);
    if (!isValidSignature) {
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
    if (body.event === 'message' && body.data?.message) {
      const message = body.data.message;
      
      if (message.type === 'chat' && !message.fromMe) {
        const phoneNumber = message.from.replace('@c.us', '');
        const messageContent = message.body;
        const senderName = message._data?.notifyName || 'User';

        console.log('Processing message:', {
          from: phoneNumber,
          name: senderName,
          content: messageContent
        });

        // Send auto-response
        const autoResponse = "Thank you for reaching out, kindly message or call +234-8168480564 for more information";
        
        await sendWhatsApp(
          phoneNumber,
          senderName,
          '', // code (not needed for auto-response)
          autoResponse,
          '', // eventLink (not needed for auto-response)
        );

        return new Response(
          JSON.stringify({ 
            success: true,
            message: 'Auto-response sent successfully',
            details: {
              to: phoneNumber,
              name: senderName,
              originalMessage: messageContent
            }
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
        message: 'Event received but no action taken',
        event: body.event
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