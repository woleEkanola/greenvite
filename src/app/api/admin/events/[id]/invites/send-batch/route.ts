import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import axios from 'axios'

async function canAccessEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return false;
    }

    if (event.ownerId === userId) {
      return true;
    }

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

function processTemplate(template: string, name: string, code: string, eventLink: string, isHtml: boolean = false): string {
  if (!template) return '';
  
  let processed = template
    .replace(/\{\{name\}\}/g, name)
    .replace(/\{name\}/g, name)
    .replace(/\{\{\{name\}\}\}/g, name)
    .replace(/\{\(name\)\}/g, name)
    .replace(/\{\{code\}\}/g, code)
    .replace(/\{code\}/g, code)
    .replace(/\{\{\{code\}\}\}/g, code)
    .replace(/\{\(code\)\}/g, code);
  
  if (eventLink) {
    const linkWithCode = `${eventLink}?code=${code}`;
    processed = processed
      .replace(/\{\{link\}\}/g, linkWithCode)
      .replace(/\{link\}/g, linkWithCode)
      .replace(/\{\{\{link\}\}\}/g, linkWithCode)
      .replace(/\{\(link\)\}/g, linkWithCode);
  }
  
  return processed;
}

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

    console.log('Invite batch send request parameters:', {
      recipientsCount: recipients?.length,
      hasEmailSubject: !!emailSubject,
      hasEmailContent: !!emailContent,
      hasWhatsappContent: !!whatsappContent,
      includeImageInWhatsApp,
      batchId,
      eventLink
    });

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'No recipients provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

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

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const defaultImageUrl = `${baseUrl}/jessegeorge.jpg`;
    const finalEventLink = eventLink || `${baseUrl}/rsvp/${event.slug || eventId}`;

    console.log('Environment configuration:', {
      baseUrl,
      nodeEnv: process.env.NODE_ENV,
      defaultImageUrl,
      finalEventLink
    });

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

    const results = [];
    const errorDetails = [];

    for (const recipient of recipients) {
      try {
        console.log(`Processing recipient: ${recipient.name}, email: ${recipient.email}, phone: ${recipient.phone}`);
        
        const usesCodePlaceholder = 
          (emailContent && (
            emailContent.includes('{{code}}') || 
            emailContent.includes('{code}') || 
            emailContent.includes('{{{code}}}') ||
            emailContent.includes('{(code)}')
          )) || 
          (whatsappContent && (
            whatsappContent.includes('{{code}}') || 
            whatsappContent.includes('{code}') || 
            whatsappContent.includes('{{{code}}}') ||
            whatsappContent.includes('{(code)}')
          ));
        
        let code: string;
        
        if (usesCodePlaceholder) {
          try {
            const registrationCode = await prisma.registrationCode.findFirst({
              where: {
                eventId,
                status: 'available'
              }
            });
            
            if (!registrationCode) {
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
          code = Math.random().toString(36).substring(2, 8).toUpperCase();
          console.log(`Generated random tracking code (not a registration code): ${code}`);
        }

        const processedEmailSubject = processTemplate(emailSubject, recipient.name, code, finalEventLink, false);
        const processedEmailContent = processTemplate(emailContent, recipient.name, code, finalEventLink, true);
        const processedWhatsappContent = processTemplate(whatsappContent, recipient.name, code, finalEventLink, false);
        
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
        
        let emailSuccess = false;
        let emailError = null;
        
        if (recipient.type === 'email' || recipient.type === 'both') {
          try {
            console.log(`Sending email to ${recipient.email}`);
            
            const { sendEmail: sendEmailCentralized } = await import('@/lib/communications');
            const result = await sendEmailCentralized(
              recipient.email,
              recipient.name,
              code,
              processedEmailSubject,
              processedEmailContent,
              finalEventLink,
              imageBuffer || undefined,
              event.imageUrl || defaultImageUrl
            );
            
            emailSuccess = result;
            
            if (!emailSuccess) {
              emailError = 'Failed to send email';
              console.error(`Error sending email to ${recipient.email}:`, emailError);
            }
          } catch (error) {
            console.error(`Error sending email to ${recipient.email}:`, error);
            emailError = error instanceof Error ? error.message : 'Unknown error';
            emailSuccess = false;
          }
        } else {
          console.log(`Skipping email for ${recipient.name} - WhatsApp only selected`);
          emailSuccess = true;
          emailError = 'Not applicable - WhatsApp only';
        }
        
        let whatsappSuccess = false;
        let whatsappError = null;

        if ((recipient.type === 'whatsapp' || recipient.type === 'both') && recipient.phone) {
          try {
            console.log(`Sending WhatsApp to ${recipient.phone}`);
            
            const { sendWhatsApp: sendWhatsAppCentralized, getInstanceForEvent } = await import('@/lib/communications');
            
            let instanceName: string | undefined;
            let rateLimitConfig: import('@/lib/evolution-api/types').RateLimitConfig | undefined;
            
            const instanceInfo = await getInstanceForEvent(eventId);
            if (instanceInfo) {
              instanceName = instanceInfo.instanceName;
              rateLimitConfig = instanceInfo.rateLimitConfig;
            }
            
            const imageUrlToSend = includeImageInWhatsApp ? (event.imageUrl || defaultImageUrl) : undefined;
            
            const result = await sendWhatsAppCentralized(
              recipient.phone,
              recipient.name,
              code,
              processedWhatsappContent,
              finalEventLink,
              imageBuffer || undefined,
              imageUrlToSend,
              instanceName,
              rateLimitConfig
            );
            
            whatsappSuccess = result;
            
            if (!whatsappSuccess) {
              whatsappError = 'Failed to send WhatsApp message';
              console.error(`Error sending WhatsApp to ${recipient.phone}:`, whatsappError);
            }
          } catch (error) {
            console.error(`Error sending WhatsApp to ${recipient.phone}:`, error);
            whatsappError = error instanceof Error ? error.message : 'Unknown error';
            whatsappSuccess = false;
          }
        }

        await prisma.invite.update({
          where: { id: invite.id },
          data: {
            sent: emailSuccess || whatsappSuccess,
            emailStatus: emailSuccess ? 'sent' : 'failed',
            whatsappStatus: whatsappSuccess ? 'sent' : 'failed',
            status: emailSuccess || whatsappSuccess ? 'sent' : 'failed'
          }
        });

        results.push({
          id: invite.id,
          name: recipient.name,
          email: recipient.email,
          phone: recipient.phone,
          code,
          emailStatus: emailSuccess ? 'sent' : 'failed',
          whatsappStatus: whatsappSuccess ? 'sent' : 'failed',
          success: emailSuccess || whatsappSuccess
        });
      } catch (error) {
        console.error(`Error processing recipient ${recipient.name}:`, error);
        errorDetails.push(`Failed to process ${recipient.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        results.push({
          name: recipient.name,
          email: recipient.email,
          phone: recipient.phone,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

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