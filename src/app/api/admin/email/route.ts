import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import path from 'path'

// Default image path for emails
const DEFAULT_IMAGE_URL = '/jessegeorge.jpg'

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    // if (!session) {
    //   return new NextResponse(
    //     JSON.stringify({ success: false, error: 'Unauthorized' }),
    //     { status: 401, headers: { 'Content-Type': 'application/json' } }
    //   )
    // }

    // Parse request body
    const body = await request.json()
    const { to, subject, html, attachments, imageUrl } = body

    // Log received parameters for debugging
    console.log('Email API received parameters:', {
      to,
      subject,
      htmlLength: html?.length,
      hasAttachments: !!attachments && attachments.length > 0,
      hasImageUrl: !!imageUrl
    })

    // Use default image if no image URL is provided
    const effectiveImageUrl = imageUrl || DEFAULT_IMAGE_URL

    // Make sure the image is included in the email body if it's not already
    let processedHtml = html
    if (!html.includes('{{image}}') && !html.includes('<img')) {
      // Add the image at the end of the email if no placeholder or image tag exists
      processedHtml = `${html}\n<div style="margin-top: 20px;"><img src="cid:invitation-image" style="max-width: 100%; height: auto;" alt="Invitation Image" /></div>`
    } else if (html.includes('{{image}}')) {
      // Replace the {{image}} placeholder with an img tag
      processedHtml = html.replace('{{image}}', '<img src="cid:invitation-image" style="max-width: 100%; height: auto;" alt="Invitation Image" />')
    }

    // Send the email
    const result = await sendEmail({
      to,
      subject,
      html: processedHtml,
      attachments,
      imageUrl: effectiveImageUrl
    })

    return new NextResponse(
      JSON.stringify(result),
      { status: result.success ? 200 : 500, headers: { 'Content-Type': 'application/json' } }
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
