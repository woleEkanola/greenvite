import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import sendWhatsAppNotification from '@/lib/whatsapp'
import QRCode from 'qrcode'

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

    // Check if the user is a host for this event
    const isHost = await prisma.eventAdmin.findFirst({
      where: {
        eventId,
        userId
      }
    });

    return !!isHost;
  } catch (error) {
    console.error('Error checking event access:', error);
    return false;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = session.user.id;
    const eventId = params.id;

    // Check if user has access to this event
    const hasAccess = await canAccessEvent(userId, eventId);
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the event details
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: {
        id: true,
        title: true,
        location: true,
        startDate: true,
        endDate: true
      }
    });

    if (!event) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Event not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await request.json();
    const { attendees, method } = body;

    // Check if we have attendees data
    if (!attendees || !Array.isArray(attendees) || attendees.length === 0) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'No access codes provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!['email', 'whatsapp', 'both'].includes(method)) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Invalid method' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the base URL for the application
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Format the event date for display
    const eventDate = new Date(event.startDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Process each attendee group
    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const attendeeGroup of attendees) {
      try {
        const { primary, related, sendMethod } = attendeeGroup;
        const { id, name, email, phone, code } = primary;
        
        // Skip if no contact method is available
        if ((sendMethod === 'email' || sendMethod === 'both') && !email) {
          results.push({ id, success: false, error: 'Email is required but not provided' });
          errorCount++;
          continue;
        }
        
        if ((sendMethod === 'whatsapp' || sendMethod === 'both') && !phone) {
          results.push({ id, success: false, error: 'Phone is required but not provided' });
          errorCount++;
          continue;
        }

        // Generate QR code for primary attendee
        const qrCodeUrl = `${baseUrl}/admin/dashboard/events/${eventId}/qr/${code}`;
        const qrCodeBuffer = await QRCode.toBuffer(qrCodeUrl, { 
          width: 300,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        });
        
        const qrCodeBase64 = `data:image/png;base64,${qrCodeBuffer.toString('base64')}`;
        
        // Generate QR codes for related attendees if any
        const relatedAttendees = related || [];
        const relatedQrCodes = await Promise.all(
          relatedAttendees.map(async (relatedAttendee) => {
            const relatedQrUrl = `${baseUrl}/admin/dashboard/events/${eventId}/qr/${relatedAttendee.code}`;
            const relatedQrBuffer = await QRCode.toBuffer(relatedQrUrl, { 
              width: 300,
              margin: 2,
              color: {
                dark: '#000000',
                light: '#ffffff'
              }
            });
            
            return {
              code: relatedAttendee.code,
              name: relatedAttendee.name,
              qrCode: `data:image/png;base64,${relatedQrBuffer.toString('base64')}`
            };
          })
        );
        
        // Format date for email/message
        const eventDate = event.startDate 
          ? new Date(event.startDate).toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })
          : 'the event date';
        
        // Send QR code via email if requested
        if (sendMethod === 'email' || sendMethod === 'both') {
          // Extract the base name without any relationship suffix for email greeting
          const baseName = name.includes('(') ? name.split('(')[0].trim() : name.includes("'s") ? name.split("'s")[0].trim() : name;
          
          // Build email content with embedded QR codes
          let emailContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Your QR Code for ${event.title}</h2>
              <p>Hello ${baseName},</p>
              <p>Here ${relatedAttendees.length > 0 ? 'are your QR codes' : 'is your QR code'} for ${event.title} on ${eventDate}.</p>
              <p>Please present ${relatedAttendees.length > 0 ? 'these QR codes' : 'this QR code'} at the entrance for check-in.</p>
              
              <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; text-align: center;">
                <h3 style="margin-top: 0;">${baseName} (Primary)</h3>
                <p style="margin: 5px 0; color: #666;">Code: ${code}</p>
                <img src="cid:primary-qr-code" alt="QR Code" style="width: 200px; height: 200px; margin: 10px 0;" />
              </div>
          `;
          
          // Add related attendees QR codes if any
          if (relatedAttendees.length > 0) {
            relatedAttendees.forEach((related, index) => {
              // Clean up the name for display
              const relatedName = related.name;
              const relationshipType = 
                relatedName.toLowerCase().includes('guest') ? 'Guest' :
                relatedName.toLowerCase().includes('aide') ? 'Aide' :
                relatedName.toLowerCase().includes('driver') ? 'Driver' : 'Related';
              
              const cleanRelatedName = relatedName
                .replace(/\(.*?\)/g, '') // Remove text in parentheses
                .replace(/'s (guest|aide|driver)/i, '') // Remove "'s guest/aide/driver"
                .trim();
              
              emailContent += `
                <div style="margin: 20px 0; padding: 15px; border: 1px solid #ddd; border-radius: 5px; text-align: center;">
                  <h3 style="margin-top: 0;">${cleanRelatedName} (${relationshipType})</h3>
                  <p style="margin: 5px 0; color: #666;">Code: ${related.code}</p>
                  <img src="cid:related-qr-code-${index}" alt="QR Code" style="width: 200px; height: 200px; margin: 10px 0;" />
                </div>
              `;
            });
          }
          
          // Close the email content
          emailContent += `
              <p>We look forward to seeing you at the event!</p>
              <p>Best regards,<br>${event.title} Team</p>
            </div>
          `;
          
          // Prepare email attachments with Content-ID references for inline images
          const attachments = [
            {
              filename: 'primary-qr-code.png',
              content: qrCodeBuffer,
              cid: 'primary-qr-code' // Content-ID for referencing in the HTML
            },
            ...relatedQrCodes.map((relatedQr, index) => ({
              filename: `related-qr-code-${index}.png`,
              content: Buffer.from(relatedQr.qrCode.split(',')[1], 'base64'),
              cid: `related-qr-code-${index}` // Content-ID for referencing in the HTML
            }))
          ];
          
          // Send the email
          await sendEmail({
            to: email,
            subject: `Your QR Code for ${event.title}`,
            html: emailContent,
            attachments
          });
        }
        
        // Send WhatsApp if requested and phone is available
        if ((sendMethod === 'whatsapp' || sendMethod === 'both') && phone) {
          // Extract the base name without any relationship suffix for WhatsApp message
          const baseName = name.includes('(') ? name.split('(')[0].trim() : name.includes("'s") ? name.split("'s")[0].trim() : name;
          
          // Start building the WhatsApp message
          let whatsappMessage = `
Hello ${baseName},

Here ${relatedAttendees.length > 0 ? 'are your QR codes' : 'is your QR code'} for ${event.title} on ${eventDate}.

Your primary QR code:
Code: ${code}
          `.trim();
          
          // Send the primary QR code
          await sendWhatsAppNotification(phone, whatsappMessage, qrCodeBase64);
          
          // Send related QR codes if any
          for (const relatedQr of relatedQrCodes) {
            // Clean up the name for display
            const relatedName = relatedQr.name;
            const relationshipType = 
              relatedName.toLowerCase().includes('guest') ? 'Guest' :
              relatedName.toLowerCase().includes('aide') ? 'Aide' :
              relatedName.toLowerCase().includes('driver') ? 'Driver' : 'Related';
            
            const cleanRelatedName = relatedName
              .replace(/\(.*?\)/g, '') // Remove text in parentheses
              .replace(/'s (guest|aide|driver)/i, '') // Remove "'s guest/aide/driver"
              .trim();
            
            const relatedMessage = `
${cleanRelatedName} (${relationshipType}) QR code:
Code: ${relatedQr.code}
            `.trim();
            
            // Send each related QR code as a separate message
            await sendWhatsAppNotification(phone, relatedMessage, relatedQr.qrCode);
          }
        }
        
        // Update the database to mark QR code as sent
        await prisma.accessCode.update({
          where: { id },
          data: {
            isSent: true,
            sentAt: new Date(),
            updatedAt: new Date()
          }
        });
        
        // Update related access codes as well
        if (relatedAttendees.length > 0) {
          for (const related of relatedAttendees) {
            await prisma.accessCode.update({
              where: { id: related.id },
              data: {
                isSent: true,
                sentAt: new Date(),
                updatedAt: new Date()
              }
            });
          }
        }
        
        results.push({ id, success: true });
        successCount++;
      } catch (error) {
        console.error('Error sending QR code:', error);
        results.push({ 
          id: attendeeGroup.primary.id, 
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
        errorCount++;
      }
    }
    
    return new NextResponse(
      JSON.stringify({
        success: true,
        successCount,
        errorCount,
        errors: results.filter(result => !result.success).map(result => result.error)
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error sending QR codes:', error);
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
