import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper function to check event access
async function canAccessEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    // Check if the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return false;
    }

    // Check if the user is the event owner
    if (event.ownerId === userId) {
      return true;
    }

    // Check if the user is an admin of the event
    const eventAdmin = await prisma.eventAdmin.findFirst({
      where: {
        eventId,
        userId
      }
    });

    if (eventAdmin) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking event access:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Helper function to process template variables
function processTemplate(template: string, name: string, code: string, link: string, includeHtml = true): string {
  let processed = template
    .replace(/{{name}}/gi, name)
    .replace(/{{code}}/gi, code)
    .replace(/{{link}}/gi, link);
  
  // Process image placeholder separately
  if (!includeHtml) {
    processed = processed.replace(/{{image}}/gi, '');
  }
  
  return processed;
}

// POST /api/admin/events/[id]/invites/send
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const eventId = params.id
    
    // Check if user has access to this event
    if (!session.user.id) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid user session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const hasAccess = await canAccessEvent(session.user.id, eventId)
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await request.json()
    const { 
      recipients, 
      emailSubject, 
      emailContent, 
      whatsappContent, 
      includeImageInWhatsApp,
      imageUrl 
    } = body

    // Validate required fields
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'No recipients provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create a batch for these invites
    const batch = await prisma.batch.create({
      data: {
        name: `Batch ${new Date().toISOString().split('T')[0]}`,
        eventId,
        status: 'processing',
        totalInvites: recipients.length,
        sentInvites: 0,
        failedInvites: 0
      }
    })

    // Get the event details for the link
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { slug: true }
    })

    // Prepare the event link
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const eventLink = `${baseUrl}/rsvp/${event?.slug || eventId}`

    // Process each recipient
    const results = []
    const errorDetails = []
    let sentCount = 0
    let failedCount = 0

    for (const recipient of recipients) {
      try {
        // Generate a registration code for this recipient
        const code = await prisma.registrationCode.create({
          data: {
            code: Math.random().toString(36).substring(2, 10).toUpperCase(),
            eventId,
            status: 'available'
          }
        })

        // Prepare email content with the recipient's name and code
        const processedEmailContent = processTemplate(
          emailContent, 
          recipient.name, 
          code.code, 
          eventLink
        )

        // Prepare WhatsApp content
        let processedWhatsappContent = processTemplate(
          whatsappContent, 
          recipient.name, 
          code.code, 
          eventLink, 
          false
        )

        // Create the invite record
        const invite = await prisma.invite.create({
          data: {
            name: recipient.name,
            email: recipient.email || '',
            phone: recipient.phone || '',
            type: recipient.type || 'both',
            code: code.code,
            status: 'pending',
            batchId: batch.id
          }
        })

        // Send email if recipient has an email and type includes email
        let emailStatus = 'not_sent'
        let emailError = null

        if (recipient.email && (recipient.type === 'email' || recipient.type === 'both')) {
          try {
            const emailResponse = await fetch(`${baseUrl}/api/admin/email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                to: recipient.email,
                subject: emailSubject,
                html: processedEmailContent,
                eventId,
                imageUrl
              })
            })

            if (!emailResponse.ok) {
              const errorData = await emailResponse.json()
              throw new Error(errorData.error || 'Failed to send email')
            }

            emailStatus = 'sent'
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown email error'
            console.error(`Error sending email to ${recipient.email}:`, errorMessage)
            emailStatus = 'failed'
            emailError = errorMessage
            errorDetails.push(`Email to ${recipient.name} (${recipient.email}) failed: ${errorMessage}`)
          }
        }

        // Send WhatsApp if recipient has a phone and type includes whatsapp
        let whatsappStatus = 'not_sent'
        let whatsappError = null

        if (recipient.phone && (recipient.type === 'whatsapp' || recipient.type === 'both')) {
          try {
            const whatsappResponse = await fetch(`${baseUrl}/api/admin/whatsapp`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                phone: recipient.phone,
                message: processedWhatsappContent,
                eventId,
                imageUrl: includeImageInWhatsApp ? imageUrl : null
              })
            })

            if (!whatsappResponse.ok) {
              const errorData = await whatsappResponse.json()
              throw new Error(errorData.error || 'Failed to send WhatsApp message')
            }

            whatsappStatus = 'sent'
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown WhatsApp error'
            console.error(`Error sending WhatsApp to ${recipient.phone}:`, errorMessage)
            whatsappStatus = 'failed'
            whatsappError = errorMessage
            errorDetails.push(`WhatsApp to ${recipient.name} (${recipient.phone}) failed: ${errorMessage}`)
          }
        }

        // Update the invite record with the status
        await prisma.invite.update({
          where: { id: invite.id },
          data: {
            emailStatus,
            whatsappStatus,
            errorMessage: emailError || whatsappError || null
          }
        })

        const success = emailStatus === 'sent' || whatsappStatus === 'sent'
        
        if (success) {
          sentCount++
        } else {
          failedCount++
        }

        results.push({
          recipient,
          success,
          emailStatus,
          whatsappStatus,
          error: emailError || whatsappError
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Error processing recipient ${recipient.name}:`, errorMessage)
        failedCount++
        errorDetails.push(`Processing ${recipient.name} failed: ${errorMessage}`)
        
        results.push({
          recipient,
          success: false,
          error: errorMessage
        })
      }
    }

    // Update the batch with the results
    await prisma.batch.update({
      where: { id: batch.id },
      data: {
        status: 'completed',
        sentInvites: sentCount,
        failedInvites: failedCount
      }
    })

    return new NextResponse(
      JSON.stringify({
        success: true,
        sent: sentCount,
        failed: failedCount,
        total: recipients.length,
        batchId: batch.id,
        details: errorDetails.length > 0 ? errorDetails.join('\n') : null
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error sending invites:', errorMessage)
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to send invites',
        details: errorMessage
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
