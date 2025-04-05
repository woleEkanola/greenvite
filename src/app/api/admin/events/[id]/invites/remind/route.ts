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

// POST /api/admin/events/[id]/invites/remind
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
    const hasAccess = await canAccessEvent(session.user.id, eventId)
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await request.json()
    const { inviteIds, templateId } = body

    // Validate required fields
    if (!inviteIds || !Array.isArray(inviteIds) || inviteIds.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'No invites selected' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!templateId) {
      return new NextResponse(
        JSON.stringify({ error: 'No template selected' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the template
    const template = await prisma.messageTemplate.findUnique({
      where: {
        id: templateId
      }
    })

    if (!template) {
      return new NextResponse(
        JSON.stringify({ error: 'Template not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create a batch for these reminders
    const batch = await prisma.batch.create({
      data: {
        name: `Reminders ${new Date().toISOString().split('T')[0]}`,
        eventId,
        status: 'processing',
        totalInvites: inviteIds.length,
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

    // Process each invite
    const results = []
    const errorDetails = []
    let sentCount = 0
    let failedCount = 0

    // Get all the invites at once
    const invites = await prisma.invite.findMany({
      where: {
        id: {
          in: inviteIds
        },
        eventId
      }
    })

    for (const invite of invites) {
      try {
        // Prepare email content with the recipient's name and code
        const processedEmailContent = processTemplate(
          template.emailContent, 
          invite.name, 
          invite.code, 
          eventLink
        )

        // Prepare WhatsApp content
        let processedWhatsappContent = processTemplate(
          template.whatsappContent, 
          invite.name, 
          invite.code, 
          eventLink, 
          false
        )

        // Send email if recipient has an email and type includes email
        let emailStatus = 'not_sent'
        let emailError = null

        if (invite.email && (invite.type === 'email' || invite.type === 'both')) {
          try {
            const emailResponse = await fetch(`${baseUrl}/api/admin/email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                to: invite.email,
                subject: template.emailSubject,
                html: processedEmailContent,
                eventId,
                imageUrl: template.imageUrl
              })
            })

            if (!emailResponse.ok) {
              const errorData = await emailResponse.json()
              throw new Error(errorData.error || 'Failed to send email')
            }

            emailStatus = 'sent'
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown email error'
            console.error(`Error sending reminder email to ${invite.email}:`, errorMessage)
            emailStatus = 'failed'
            emailError = errorMessage
            errorDetails.push(`Email to ${invite.name} (${invite.email}) failed: ${errorMessage}`)
          }
        }

        // Send WhatsApp if recipient has a phone and type includes whatsapp
        let whatsappStatus = 'not_sent'
        let whatsappError = null

        if (invite.phone && (invite.type === 'whatsapp' || invite.type === 'both')) {
          try {
            const whatsappResponse = await fetch(`${baseUrl}/api/admin/whatsapp`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                phone: invite.phone,
                message: processedWhatsappContent,
                eventId,
                imageUrl: template.imageUrl
              })
            })

            if (!whatsappResponse.ok) {
              const errorData = await whatsappResponse.json()
              throw new Error(errorData.error || 'Failed to send WhatsApp message')
            }

            whatsappStatus = 'sent'
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown WhatsApp error'
            console.error(`Error sending reminder WhatsApp to ${invite.phone}:`, errorMessage)
            whatsappStatus = 'failed'
            whatsappError = errorMessage
            errorDetails.push(`WhatsApp to ${invite.name} (${invite.phone}) failed: ${errorMessage}`)
          }
        }

        // Create a reminder record
        await prisma.reminder.create({
          data: {
            inviteId: invite.id,
            batchId: batch.id,
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
          invite,
          success,
          emailStatus,
          whatsappStatus,
          error: emailError || whatsappError
        })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        console.error(`Error processing reminder for ${invite.name}:`, errorMessage)
        failedCount++
        errorDetails.push(`Processing reminder for ${invite.name} failed: ${errorMessage}`)
        
        results.push({
          invite,
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
        total: inviteIds.length,
        batchId: batch.id,
        details: errorDetails.length > 0 ? errorDetails.join('\n') : null
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error sending reminders:', errorMessage)
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to send reminders',
        details: errorMessage
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
