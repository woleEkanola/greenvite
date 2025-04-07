import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import sendWhatsAppNotification from '@/lib/whatsapp'

export async function POST(request: Request) {
  try {
    console.log('WhatsApp API endpoint called')
    
    // Check authentication
    const session = await getServerSession(authOptions)
    console.log('Session received:', JSON.stringify({
      hasSession: !!session,
      hasUser: !!session?.user,
      userId: session?.user?.id,
      userName: session?.user?.name
    }))
    
    // if (!session || !session.user) {
    //   console.log('Authentication failed: No session or user')
    //   return new NextResponse(
    //     JSON.stringify({ success: false, error: 'Unauthorized - No session or user' }),
    //     { status: 401, headers: { 'Content-Type': 'application/json' } }
    //   )
    // }
    
    // Parse request body
    const body = await request.json()
    const { phone, message, imageUrl, eventId, includeImageInWhatsApp } = body

    // Log the received parameters for debugging
    console.log('WhatsApp API received parameters:', { 
      phone, 
      messageLength: message?.length, 
      hasImage: !!imageUrl,
      eventId,
      includeImageInWhatsApp
    })

    // Validate required fields
    if (!phone || !message) {
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: phone, message' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Format phone number if needed
    const formattedPhone = phone.startsWith('+') ? phone : `+${phone}`;
    
    // Send WhatsApp message with optional image
    const result = await sendWhatsAppNotification(
      formattedPhone, 
      message, 
      imageUrl, 
      includeImageInWhatsApp !== undefined ? includeImageInWhatsApp : true
    )

    // Log the result for debugging
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
      JSON.stringify({ success: true, result }),
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
