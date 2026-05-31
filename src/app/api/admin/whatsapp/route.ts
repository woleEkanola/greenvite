import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendWhatsAppNotification, getInstanceForEvent } from '@/lib/whatsapp'

export async function POST(request: Request) {
  try {
    console.log('WhatsApp API endpoint called')
    
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Unauthorized - No session or user' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const body = await request.json()
    const { phone, message, imageUrl, eventId, includeImageInWhatsApp } = body

    console.log('WhatsApp API received parameters:', { 
      phone, 
      messageLength: message?.length, 
      hasImage: !!imageUrl,
      eventId,
      includeImageInWhatsApp
    })

    if (!phone || !message) {
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: phone, message' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    
    let instanceName: string | undefined;
    let rateLimitConfig: import('@/lib/evolution-api/types').RateLimitConfig | undefined;
    
    if (eventId) {
      const instanceInfo = await getInstanceForEvent(eventId);
      if (instanceInfo) {
        instanceName = instanceInfo.instanceName;
        rateLimitConfig = instanceInfo.rateLimitConfig;
      }
    }

    const result = await sendWhatsAppNotification(
      formattedPhone, 
      message, 
      imageUrl, 
      includeImageInWhatsApp !== undefined ? includeImageInWhatsApp : true,
      instanceName,
      rateLimitConfig
    )

    console.log('WhatsApp sending result:', result)

    if (!result) {
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to send WhatsApp message' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new NextResponse(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    return new NextResponse(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}