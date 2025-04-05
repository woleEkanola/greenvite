import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'

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

    // Log the request parameters for debugging
    console.log('Invite send request parameters:', {
      recipientsCount: recipients?.length,
      hasEmailSubject: !!emailSubject,
      hasEmailContent: !!emailContent,
      hasWhatsappContent: !!whatsappContent,
      includeImageInWhatsApp,
      hasImageUrl: !!imageUrl
    });

    // Validate required fields
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'No recipients provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create a batch for these invites
    let batch;
    try {
      console.log('Creating batch for invites with data:', {
        name: `Batch ${new Date().toISOString().split('T')[0]}`,
        eventId,
        recipientsCount: recipients.length
      });
      
      batch = await prisma.batch.create({
        data: {
          name: `Batch ${new Date().toISOString().split('T')[0]}`,
          eventId,
          status: 'processing',
          totalInvites: recipients.length,
          sentInvites: 0,
          failedInvites: 0
        }
      });
      
      console.log('Successfully created batch:', batch);
    } catch (error) {
      console.error('Error creating batch:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error details:', errorMessage);
      
      // Check if it's a Prisma error with more details
      if (error instanceof Error && 'code' in error) {
        console.error('Prisma error code:', (error as any).code);
        console.error('Prisma error meta:', (error as any).meta);
      }
      
      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to create batch for invites',
          details: errorMessage
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    console.log(`Starting to process ${recipients.length} recipients`);

    for (const recipient of recipients) {
      try {
        console.log(`Processing recipient: ${recipient.name}, email: ${recipient.email}, phone: ${recipient.phone}`);
        
        // Generate a registration code for this recipient
        let code;
        try {
          console.log('Creating registration code for recipient');
          code = await prisma.registrationCode.create({
            data: {
              code: Math.random().toString(36).substring(2, 10).toUpperCase(),
              eventId,
              status: 'available'
            }
          });
          console.log('Registration code created:', code.code);
        } catch (codeError) {
          console.error('Error creating registration code:', codeError);
          throw new Error(`Failed to create registration code: ${codeError instanceof Error ? codeError.message : 'Unknown error'}`);
        }

        // Prepare email content with the recipient's name and code
        const processedEmailContent = processTemplate(
          emailContent,
          recipient.name,
          code.code,
          `${eventLink}?code=${code.code}`,
          true
        );

        const processedWhatsappContent = processTemplate(
          whatsappContent,
          recipient.name,
          code.code,
          `${eventLink}?code=${code.code}`,
          false
        );

        // Create an invite record
        let invite;
        try {
          console.log('Creating invite record for recipient');
          invite = await prisma.invite.create({
            data: {
              name: recipient.name,
              email: recipient.email,
              phone: recipient.phone,
              sent: false,
              type: recipient.type,
              status: 'pending',
              code: code.code,
              batchId: batch.id
            }
          });
          console.log('Invite record created:', invite.id);
        } catch (inviteError) {
          console.error('Error creating invite record:', inviteError);
          throw new Error(`Failed to create invite: ${inviteError instanceof Error ? inviteError.message : 'Unknown error'}`);
        }

        // Send email if recipient has an email and type includes email
        let emailStatus = 'not_sent';
        let emailError = null;

        if (recipient.email && (recipient.type === 'email' || recipient.type === 'both')) {
          try {
            console.log(`Attempting to send email to ${recipient.email}`);
            
            // Send the email directly using the sendEmail function
            const emailResult = await sendEmail({
              to: recipient.email,
              subject: emailSubject,
              html: processedEmailContent,
              imageUrl: imageUrl // Pass the image URL to include it in the email
            });
            
            if (emailResult.success) {
              emailStatus = 'sent';
              console.log(`Email sent successfully to ${recipient.email}`);
              
              // Check if there was a warning
              if (emailResult.warning) {
                console.warn(`Email to ${recipient.email} sent with warning: ${emailResult.warning}`);
              }
            } else {
              throw new Error(emailResult.error || 'Failed to send email');
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown email error';
            console.error(`Error sending email to ${recipient.email}:`, errorMessage);
            emailStatus = 'failed';
            emailError = errorMessage;
            errorDetails.push(`Email to ${recipient.name} (${recipient.email}) failed: ${errorMessage}`);
          }
        } else {
          console.log(`Skipping email for ${recipient.name} - email: ${recipient.email}, type: ${recipient.type}`);
        }

        // Send WhatsApp if recipient has a phone and type includes whatsapp
        let whatsappStatus = 'not_sent';
        let whatsappError = null;

        if (recipient.phone && (recipient.type === 'whatsapp' || recipient.type === 'both')) {
          try {
            console.log(`Attempting to send WhatsApp to ${recipient.phone}`);
            
            // Only include image if the checkbox was selected
            const whatsappImageUrl = includeImageInWhatsApp ? imageUrl : null;
            
            console.log(`WhatsApp message will ${whatsappImageUrl ? 'include' : 'not include'} an image`);
            
            const whatsappResponse = await fetch(`${baseUrl}/api/admin/whatsapp`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                phone: recipient.phone,
                message: processedWhatsappContent,
                eventId,
                imageUrl: whatsappImageUrl
              })
            });

            const whatsappResponseData = await whatsappResponse.json();
            console.log(`WhatsApp API response for ${recipient.phone}:`, whatsappResponseData);

            if (!whatsappResponse.ok) {
              throw new Error(whatsappResponseData.error || 'Failed to send WhatsApp message');
            }

            whatsappStatus = 'sent';
            console.log(`WhatsApp sent successfully to ${recipient.phone}`);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown WhatsApp error';
            console.error(`Error sending WhatsApp to ${recipient.phone}:`, errorMessage);
            whatsappStatus = 'failed';
            whatsappError = errorMessage;
            errorDetails.push(`WhatsApp to ${recipient.name} (${recipient.phone}) failed: ${errorMessage}`);
          }
        } else {
          console.log(`Skipping WhatsApp for ${recipient.name} - phone: ${recipient.phone}, type: ${recipient.type}`);
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
