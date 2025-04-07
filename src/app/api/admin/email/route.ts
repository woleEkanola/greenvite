import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { sendEmail } from '@/lib/email'
import path from 'path'
import fs from 'fs'

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
      hasImageUrl: !!imageUrl,
      environment: process.env.NODE_ENV || 'development',
      baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    })

    // Use default image if no image URL is provided
    const effectiveImageUrl = imageUrl || DEFAULT_IMAGE_URL
    
    // Check if the image URL is valid and accessible
    let validatedImageUrl = effectiveImageUrl;
    
    try {
      // If it's a remote URL, validate it
      if (effectiveImageUrl.startsWith('http')) {
        console.log(`Validating remote image URL: ${effectiveImageUrl}`);
        // We don't actually fetch the image here, just log that we would
      } 
      // If it's a local path, make sure it exists
      else {
        // For local paths, we need to convert to an absolute path
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        
        // If it's a relative path starting with '/', make it absolute
        if (effectiveImageUrl.startsWith('/')) {
          validatedImageUrl = `${baseUrl}${effectiveImageUrl}`;
          console.log(`Converted local image path to absolute URL: ${validatedImageUrl}`);
        }
      }
    } catch (imageError) {
      console.error('Error validating image URL:', imageError);
      console.log('Proceeding without image attachment');
      validatedImageUrl = ''; // Skip image if there's an error
    }

    // Make sure the image is included in the email body if it's not already
    let processedHtml = html
    if (validatedImageUrl) {
      if (!html.includes('{{image}}') && !html.includes('<img')) {
        // Add the image at the end of the email if no placeholder or image tag exists
        processedHtml = `${html}\n<div style="margin-top: 20px;"><img src="cid:invitation-image" style="max-width: 100%; height: auto;" alt="Invitation Image" /></div>`
      } else if (html.includes('{{image}}')) {
        // Replace the {{image}} placeholder with an img tag
        processedHtml = html.replace('{{image}}', '<img src="cid:invitation-image" style="max-width: 100%; height: auto;" alt="Invitation Image" />')
      }
    } else {
      // If no valid image URL, just remove the placeholder
      processedHtml = html.replace('{{image}}', '')
    }

    // Send the email
    const result = await sendEmail({
      to,
      subject,
      html: processedHtml,
      attachments,
      imageUrl: validatedImageUrl || null // Pass null if no valid image URL
    })

    return new NextResponse(
      JSON.stringify(result),
      { status: result.success ? 200 : 500, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    // Check for fetch errors specifically
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isFetchError = errorMessage.includes('fetch failed') || 
                         errorMessage.includes('network error') ||
                         errorMessage.includes('ENOTFOUND');
    
    if (isFetchError) {
      console.log('Fetch error detected - this is likely a network issue in the production environment');
      // Return a more specific error for fetch failures
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Network error when sending email. This may be a temporary issue.',
          details: errorMessage,
          errorType: 'FETCH_ERROR'
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
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
