import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import axios from 'axios'

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
    console.error('Error checking event access:', error);
    return false;
  }
}

// Helper function to process template
function processTemplate(template: string, name: string, code: string, eventLink: string, isHtml: boolean = false): string {
  if (!template) return '';
  
  let processed = template
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{name\}/g, name)
    .replace(/\{\{\{name\}\}\}/g, name)
    .replace(/\{\{code\}\}/g, code)
    .replace(/\{code\}/g, code)
    .replace(/\{\{\{code\}\}\}/g, code);
  
  // Replace event link
  if (eventLink) {
    const linkWithCode = `${eventLink}?code=${code}`;
    processed = processed
      .replace(/\{\{link\}\}/g, linkWithCode)
      .replace(/\{link\}/g, linkWithCode)
      .replace(/\{\{\{link\}\}\}/g, linkWithCode);
  }
  
  return processed;
}

// POST /api/admin/events/[id]/invites/send-batch
export async function POST(
  request: NextRequest,
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
      includeImageInWhatsApp = true,
      batchId,
      eventLink
    } = body

    // Log the request parameters for debugging
    console.log('Invite batch send request parameters:', {
      recipientsCount: recipients?.length,
      hasEmailSubject: !!emailSubject,
      hasEmailContent: !!emailContent,
      hasWhatsappContent: !!whatsappContent,
      includeImageInWhatsApp,
      batchId,
      eventLink
    });

    // Validate required fields
    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'No recipients provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the event details
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { 
        imageUrl: true,
        slug: true
      }
    });

    if (!event) {
      return new NextResponse(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Define the base URL for API calls
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    
    // Prepare the event link if not provided
    const finalEventLink = eventLink || `${baseUrl}/rsvp/${event.slug || eventId}`;

    // Fetch the image if available
    let imageBuffer: Buffer | null = null;
    if (event.imageUrl) {
      try {
        const imageResponse = await axios.get(event.imageUrl, {
          responseType: 'arraybuffer',
          timeout: 15000
        });
        imageBuffer = Buffer.from(imageResponse.data, 'binary');
        console.log(`Successfully fetched image (${imageBuffer.length} bytes)`);
      } catch (imageError) {
        console.error('Error fetching event image:', imageError);
      }
    }

    // Process each recipient
    const results = [];
    const errorDetails = [];

    for (const recipient of recipients) {
      try {
        console.log(`Processing recipient: ${recipient.name}, email: ${recipient.email}, phone: ${recipient.phone}`);
        
        // Check if the template uses the {{code}} placeholder
        const usesCodePlaceholder = 
          (emailContent && (
            emailContent.includes('{{code}}') || 
            emailContent.includes('{code}') || 
            emailContent.includes('{{{code}}}')
          )) || 
          (whatsappContent && (
            whatsappContent.includes('{{code}}') || 
            whatsappContent.includes('{code}') || 
            whatsappContent.includes('{{{code}}}')
          ));
        
        let code: string;
        
        // If the template uses the code placeholder, get an available registration code
        if (usesCodePlaceholder) {
          try {
            // Find an available registration code for this event
            const registrationCode = await prisma.registrationCode.findFirst({
              where: {
                eventId,
                status: 'available'
              }
            });
            
            if (!registrationCode) {
              // If no available code is found, create a new one
              const newCode = await prisma.registrationCode.create({
                data: {
                  code: Math.random().toString(36).substring(2, 8).toUpperCase(),
                  eventId,
                  status: 'available'
                }
              });
              code = newCode.code;
              
              console.log(`Created new registration code: ${code}`);
            } else {
              code = registrationCode.code;
              console.log(`Using existing registration code: ${code}`);
            }
            
            // Mark the code as 'invite-sent'
            await prisma.registrationCode.update({
              where: { code },
              data: { status: 'invite-sent' }
            });
            
            console.log(`Updated registration code status to 'invite-sent': ${code}`);
          } catch (codeError) {
            console.error('Error handling registration code:', codeError);
            throw new Error(`Failed to handle registration code: ${codeError instanceof Error ? codeError.message : 'Unknown error'}`);
          }
        } else {
          // If not using the code placeholder, generate a random code for tracking
          code = Math.random().toString(36).substring(2, 8).toUpperCase();
          console.log(`Generated random tracking code (not a registration code): ${code}`);
        }

        // Process the templates with the recipient's name and code
        const processedEmailSubject = processTemplate(emailSubject, recipient.name, code, finalEventLink, false);
        const processedEmailContent = processTemplate(emailContent, recipient.name, code, finalEventLink, true);
        const processedWhatsappContent = processTemplate(whatsappContent, recipient.name, code, finalEventLink, false);
        
        // Create an invite record in the database
        const invite = await prisma.invite.create({
          data: {
            name: recipient.name,
            email: recipient.email || null,
            phone: recipient.phone || null,
            type: recipient.type,
            code,
            batchId,
            sent: false,
            status: 'pending',
            emailStatus: 'pending',
            whatsappStatus: 'pending'
          }
        });
        
        let emailStatus = 'not_sent';
        let emailError = null;
        
        // Send email if recipient has an email and type is email or both
        if (recipient.email && (recipient.type === 'email' || recipient.type === 'both')) {
          try {
            console.log(`Attempting to send email to ${recipient.email}`);
            
            // Send email directly
            const emailResponse = await fetch(`${baseUrl}/api/admin/email`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                to: recipient.email,
                subject: processedEmailSubject,
                html: processedEmailContent,
                imageUrl: event.imageUrl
              })
            });

            const emailResponseData = await emailResponse.json();
            
            if (!emailResponse.ok) {
              throw new Error(emailResponseData.error || 'Failed to send email');
            }
            
            emailStatus = 'sent';
            console.log(`Email sent successfully to ${recipient.email}`);
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
        
        let whatsappStatus = 'not_sent';
        let whatsappError = null;

        if (recipient.phone && (recipient.type === 'whatsapp' || recipient.type === 'both')) {
          try {
            console.log(`Attempting to send WhatsApp to ${recipient.phone}`);
            
            // Send WhatsApp message
            const whatsappResponse = await fetch(`${baseUrl}/api/admin/whatsapp`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                phone: recipient.phone,
                message: processedWhatsappContent,
                imageUrl: includeImageInWhatsApp ? event.imageUrl : null
              })
            });

            const whatsappResponseData = await whatsappResponse.json();
            
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

        // Update the invite status
        await prisma.invite.update({
          where: { id: invite.id },
          data: {
            sent: emailStatus === 'sent' || whatsappStatus === 'sent',
            emailStatus,
            whatsappStatus,
            status: emailStatus === 'sent' || whatsappStatus === 'sent' ? 'sent' : 'failed'
          }
        });

        // Add to results
        results.push({
          id: invite.id,
          name: recipient.name,
          email: recipient.email,
          phone: recipient.phone,
          code,
          emailStatus,
          whatsappStatus,
          success: emailStatus === 'sent' || whatsappStatus === 'sent'
        });
      } catch (error) {
        console.error(`Error processing recipient ${recipient.name}:`, error);
        errorDetails.push(`Failed to process ${recipient.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        // Add to results with error
        results.push({
          name: recipient.name,
          email: recipient.email,
          phone: recipient.phone,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Calculate success and failure counts
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    // Update batch status
    await prisma.batch.update({
      where: { id: batchId },
      data: {
        status: 'completed',
        totalInvites: results.length,
        sentInvites: successCount,
        failedInvites: failureCount
      }
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        results,
        totalProcessed: results.length,
        successCount,
        failureCount,
        errorDetails
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending invites:', error);
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to send invites', 
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
