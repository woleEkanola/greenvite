import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEmail } from '@/lib/resend-email'

const DEFAULT_IMAGE_URL = '/jessegeorge.jpg'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const body = await request.json()
    const { to, subject, html, imageUrl } = body

    console.log('Email API received parameters:', {
      to,
      subject,
      htmlLength: html?.length,
      hasImageUrl: !!imageUrl,
    })

    const effectiveImageUrl = imageUrl || DEFAULT_IMAGE_URL

    let validatedImageUrl = effectiveImageUrl;
    
    try {
      if (effectiveImageUrl.startsWith('http')) {
        console.log(`Using remote image URL: ${effectiveImageUrl}`);
      } else {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        if (effectiveImageUrl.startsWith('/')) {
          validatedImageUrl = `${baseUrl}${effectiveImageUrl}`;
          console.log(`Converted local image path to absolute URL: ${validatedImageUrl}`);
        }
      }
    } catch (imageError) {
      console.error('Error validating image URL:', imageError);
      validatedImageUrl = '';
    }

    let processedHtml = html
    if (validatedImageUrl) {
      if (!html.includes('{{image}}') && !html.includes('<img')) {
        processedHtml = `${html}\n<div style="margin-top: 20px;"><img src="cid:invitation-image" style="max-width: 100%; height: auto;" alt="Invitation Image" /></div>`
      } else if (html.includes('{{image}}')) {
        processedHtml = html.replace('{{image}}', '<img src="cid:invitation-image" style="max-width: 100%; height: auto;" alt="Invitation Image" />')
      }
    } else {
      processedHtml = html.replace('{{image}}', '')
    }

    const result = await sendEmail({
      to,
      subject,
      html: processedHtml,
      imageUrl: validatedImageUrl || null,
    })

    return new NextResponse(
      JSON.stringify(result),
      { status: result.success ? 200 : 500, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    
    return new NextResponse(
      JSON.stringify({ 
        success: false, 
        error: errorMessage,
        errorType: 'GENERAL_ERROR'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}