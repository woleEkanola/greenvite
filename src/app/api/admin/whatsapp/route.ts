import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import sendWhatsAppNotification from '@/lib/whatsapp'

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await request.json()
    const { to, message } = body

    // Validate required fields
    if (!to || !message) {
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to, message' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send WhatsApp message
    const result = await sendWhatsAppNotification(to, message)

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
