import { NextResponse } from 'next/server';

export async function POST(request: Request): Promise<Response> {
  console.warn('Deprecated webhook endpoint called: /api/webhooks/whatsapp. Please use /api/webhooks/evolution instead.');

  return new Response(
    JSON.stringify({
      success: false,
      error: 'Deprecated endpoint',
      message: 'This webhook endpoint is deprecated. Please use /api/webhooks/evolution for WhatsApp webhook events via Evolution API.',
      redirectUrl: '/api/webhooks/evolution',
    }),
    {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

export async function GET(): Promise<Response> {
  return new Response(
    JSON.stringify({
      success: false,
      error: 'Deprecated endpoint',
      message: 'This webhook endpoint is deprecated. Please use /api/webhooks/evolution for WhatsApp webhook events via Evolution API.',
      redirectUrl: '/api/webhooks/evolution',
    }),
    {
      status: 410,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}