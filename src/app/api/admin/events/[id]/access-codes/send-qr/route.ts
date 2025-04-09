import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { sendWhatsAppNotification } from '@/lib/whatsapp'

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
    const isHost = await prisma.eventHost.findFirst({
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
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const attendeeGroup of attendees) {
      try {
        const { primary, related } = attendeeGroup;
        
        if (!primary) {
          errors.push('Missing primary attendee data');
          errorCount++;
          continue;
        }
        
        const { id, name, email, phone, code, qrCodeDataUrl } = primary;
        
        // Skip if missing required data
        if (!id || !name || !qrCodeDataUrl) {
          errors.push(`Missing required data for primary attendee ${name || id}`);
          errorCount++;
          continue;
        }
        
        // Prepare related attendees data (if any)
        const relatedAttendees = Array.isArray(related) ? related.filter(r => r && r.name && r.code && r.qrCodeDataUrl) : [];
        
        // Send email if requested and email is available
        if ((method === 'email' || method === 'both') && email) {
          // Start building the email HTML
          let emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">Hello ${name},</h2>
              <p>Here ${relatedAttendees.length > 0 ? 'are your QR codes' : 'is your QR code'} for ${event.title} on ${eventDate}.</p>
              <p>Please present ${relatedAttendees.length > 0 ? 'these QR codes' : 'this QR code'} when you arrive at the event for quick check-in.</p>
          `;
          
          // Add primary QR code to the email
          emailHtml += `
            <div style="margin: 30px 0; padding: 15px; border: 1px solid #eee; border-radius: 8px;">
              <h3 style="color: #555;">Your QR Code</h3>
              <div style="text-align: center; margin: 20px 0;">
                <img src="cid:qrcode-primary" alt="QR Code" style="max-width: 200px; height: auto;" />
              </div>
              <p>Access code: <strong>${code}</strong></p>
            </div>
          `;
          
          // Add related QR codes to the email (if any)
          for (let i = 0; i < relatedAttendees.length; i++) {
            const relatedAttendee = relatedAttendees[i];
            const relationship = 
              relatedAttendee.name.toLowerCase().includes('guest') ? 'Guest' :
              relatedAttendee.name.toLowerCase().includes('aid') ? 'Aid' :
              relatedAttendee.name.toLowerCase().includes('driver') ? 'Driver' : 'Additional';
            
            emailHtml += `
              <div style="margin: 30px 0; padding: 15px; border: 1px solid #eee; border-radius: 8px;">
                <h3 style="color: #555;">${relationship} QR Code - ${relatedAttendee.name}</h3>
                <div style="text-align: center; margin: 20px 0;">
                  <img src="cid:qrcode-related-${i}" alt="QR Code" style="max-width: 200px; height: auto;" />
                </div>
                <p>Access code: <strong>${relatedAttendee.code}</strong></p>
              </div>
            `;
          }
          
          // Complete the email HTML
          emailHtml += `
            <p>Event details:</p>
            <ul>
              <li><strong>Event:</strong> ${event.title}</li>
              <li><strong>Date:</strong> ${eventDate}</li>
              ${event.location ? `<li><strong>Location:</strong> ${event.location}</li>` : ''}
            </ul>
            <p>We look forward to seeing you!</p>
          </div>
          `;
          
          // Prepare attachments
          const attachments = [];
          
          // Add primary QR code attachment
          const primaryQrCodeBuffer = Buffer.from(
            qrCodeDataUrl.replace(/^data:image\/png;base64,/, ''),
            'base64'
          );
          
          attachments.push({
            filename: `qrcode-${code}.png`,
            content: primaryQrCodeBuffer,
            cid: 'qrcode-primary',
            contentType: 'image/png'
          });
          
          // Add related QR code attachments
          for (let i = 0; i < relatedAttendees.length; i++) {
            const relatedAttendee = relatedAttendees[i];
            
            if (relatedAttendee.qrCodeDataUrl) {
              const relatedQrCodeBuffer = Buffer.from(
                relatedAttendee.qrCodeDataUrl.replace(/^data:image\/png;base64,/, ''),
                'base64'
              );
              
              attachments.push({
                filename: `qrcode-${relatedAttendee.code}.png`,
                content: relatedQrCodeBuffer,
                cid: `qrcode-related-${i}`,
                contentType: 'image/png'
              });
            }
          }
          
          await sendEmail({
            to: email,
            subject: `Your QR Codes for ${event.title}`,
            html: emailHtml,
            attachments
          });
        }
        
        // Send WhatsApp if requested and phone is available
        if ((method === 'whatsapp' || method === 'both') && phone) {
          // Start building the WhatsApp message
          let whatsappMessage = `
Hello ${name},

Here ${relatedAttendees.length > 0 ? 'are your QR codes' : 'is your QR code'} for ${event.title} on ${eventDate}.
Please present ${relatedAttendees.length > 0 ? 'these QR codes' : 'this QR code'} when you arrive at the event for quick check-in.

Your Access code: ${code}
`;
          
          // Add related QR codes info to the message (if any)
          if (relatedAttendees.length > 0) {
            whatsappMessage += `\nAdditional QR codes for your guests:\n`;
            
            for (const relatedAttendee of relatedAttendees) {
              const relationship = 
                relatedAttendee.name.toLowerCase().includes('guest') ? 'Guest' :
                relatedAttendee.name.toLowerCase().includes('aid') ? 'Aid' :
                relatedAttendee.name.toLowerCase().includes('driver') ? 'Driver' : 'Additional';
              
              whatsappMessage += `
- ${relationship}: ${relatedAttendee.name}
  Access code: ${relatedAttendee.code}
`;
            }
          }
          
          whatsappMessage += `
Event details:
- Event: ${event.title}
- Date: ${eventDate}
${event.location ? `- Location: ${event.location}` : ''}

We look forward to seeing you!
          `.trim();
          
          // For WhatsApp, we can only send one image, so we'll send the primary QR code
          await sendWhatsAppNotification(
            phone,
            whatsappMessage,
            qrCodeDataUrl
          );
        }
        
        successCount++;
      } catch (error) {
        console.error('Error sending QR codes:', error);
        errors.push(`Failed to send QR codes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        errorCount++;
      }
    }
    
    return new NextResponse(
      JSON.stringify({
        success: true,
        successCount,
        errorCount,
        errors: errors.length > 0 ? errors : undefined
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
