import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEmail } from '@/lib/email'

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
    const { to, subject, html, attachments, imageUrl } = body

    // Log received parameters for debugging
    console.log('Email API received parameters:', { 
      to, 
      subject, 
      htmlLength: html?.length,
      hasAttachments: !!attachments && attachments.length > 0,
      hasImage: !!imageUrl
    });

    // Validate required fields
    if (!to || !subject || !html) {
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: to, subject, html' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Send email with optional attachments and image
    const emailResult = await sendEmail({ 
      to, 
      subject, 
      html, 
      attachments,
      imageUrl
    })

    // Check for success or handle errors
    if (!emailResult.success) {
      console.error('Email sending failed:', emailResult.error);
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: emailResult.error,
          details: emailResult.details
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Return success response
    return new NextResponse(
      JSON.stringify({ 
        success: true, 
        messageId: emailResult.messageId,
        warning: emailResult.warning
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new NextResponse(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
