import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { prisma } from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';
import { rsvpSubmitSchema } from '@/lib/validations';
import sendWhatsAppNotification from '@/lib/whatsapp';

// Helper function to send confirmation email
async function sendConfirmationEmail(email: string, name: string): Promise<boolean> {
  try {
    const confirmationMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #2c3e50; text-align: center;">Thank you for your RSVP!</h2>
        <h3 style="color: #16a085; text-align: center; margin-bottom: 30px;">Jesse Oghenekome George's Church Dedication</h3>
        
        <div style="margin: 30px 0; text-align: center;">
          <p style="font-size: 16px;">Dear ${name},</p>
          <p style="font-size: 16px;">Thank you for confirming your attendance. Your RSVP has been successfully received.</p>
          <p style="font-size: 16px;">We will send you further details about the event soon.</p>
        </div>
        
        <p style="text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 14px;">We look forward to celebrating this special occasion with you.</p>
      </div>
    `;
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
      console.error('SMTP configuration is incomplete. Missing host or port.');
      return false;
    }
    
    const transportConfig: any = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 10000, // 10 seconds timeout
      greetingTimeout: 10000,   // 10 seconds timeout
      socketTimeout: 15000      // 15 seconds timeout
    };
    
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transportConfig.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      };
    }
    
    const transport = nodemailer.createTransport(transportConfig);
    
    try {
      await transport.verify();
    } catch (verifyError: any) {
      console.error('SMTP connection verification failed:', verifyError.message);
    }
    
    const mailOptions: any = {
      from: process.env.SMTP_FROM || (process.env.SMTP_USER ? `"Greenvites" <${process.env.SMTP_USER}>` : 'noreply@greenvites.com'),
      to: email,
      subject: 'RSVP Confirmation - Jesse Oghenekome George\'s Church Dedication',
      html: confirmationMessage,
    };
    
    try {
      const info = await transport.sendMail(mailOptions);
      return true;
    } catch (sendError: any) {
      console.error(`Failed to send confirmation email to ${name}:`, sendError.message);
      return false;
    }
  } catch (error: any) {
    console.error(`Error in email confirmation function:`, error.message);
    return false;
  }
}

async function sendWhatsAppConfirmation(phone: string, name: string, eventId?: string): Promise<boolean> {
  try {
    const message = `Dear ${name}, thank you for confirming your attendance. Your RSVP has been successfully received. We will send you further details about the event soon. We look forward to celebrating this special occasion with you.`;

    let instanceName: string | undefined;
    let rateLimitConfig: import('@/lib/evolution-api/types').RateLimitConfig | undefined;

    if (eventId) {
      try {
        const { getInstanceForEvent } = await import('@/lib/evolution-api/service');
        const instanceInfo = await getInstanceForEvent(eventId);
        if (instanceInfo) {
          instanceName = instanceInfo.instanceName;
          rateLimitConfig = instanceInfo.rateLimitConfig;
        }
      } catch {
      }
    }

    return sendWhatsAppNotification(
      phone,
      message,
      null,
      false,
      instanceName,
      rateLimitConfig
    );
  } catch (error: any) {
    console.error('Error in WhatsApp confirmation function:', error.message);
    return false;
  }
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
  const { success } = rateLimit(`rsvp:${ip}`, { interval: 60_000, limit: 20 })
  if (!success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 })
  }

  try {
    let requestData;
    try {
      requestData = await request.json();
    } catch (jsonError) {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON in request body' },
        { status: 400 }
      );
    }
      
    const result = rsvpSubmitSchema.safeParse(requestData)
    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error.errors[0]?.message || 'Validation failed' },
        { status: 400 }
      )
    }
      
    const { reg_code, name, email, phone, hasDriver, hasGuest, driverName, guestName, driverPhone, guestPhone } = result.data
    const code = reg_code
    const eventId = (requestData as any).eventId as string | undefined
    const hasAide = (requestData as any).hasAide

    if (!name || !email) {
      return NextResponse.json(
        { success: false, error: 'Name and email are required' },
        { status: 400 }
      );
    }

    let registrationCode: any = null

    if (code === 'OPEN' && eventId) {
      const event = await prisma.event.findUnique({ where: { id: eventId } })
      if (!event || event.restrictedRsvp !== false) {
        return NextResponse.json(
          { success: false, error: 'Registration code is required for this event' },
          { status: 400 }
        );
      }
      registrationCode = await prisma.registrationCode.create({
        data: {
          code: `OPEN-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          used: false,
          status: 'available',
          eventId,
        },
      })
    } else {
      if (!code) {
        return NextResponse.json(
          { success: false, error: 'Registration code is required' },
          { status: 400 }
        );
      }

      registrationCode = await prisma.registrationCode.findUnique({
        where: { code },
        include: { rsvp: true, invite: true }
      })

      if (!registrationCode) {
        return NextResponse.json(
          { success: false, error: 'Invalid registration code' },
          { status: 400 }
        );
      }

      if (registrationCode.used || registrationCode.rsvp) {
        return NextResponse.json(
          { success: false, error: 'This registration code has already been used' },
          { status: 400 }
        );
      }

      if (registrationCode.status === 'used') {
        return NextResponse.json(
          { success: false, error: 'This registration code has already been used' },
          { status: 400 }
        );
      }
    }

    // Create RSVP entry and update registration code status
    let rsvp;
    try {
      rsvp = await prisma.$transaction(async (tx) => {
        // Create the RSVP
        const newRsvp = await tx.rsvp.create({
          data: {
            name,
            email,
            // Use type assertion since the Prisma client might not be updated
            // The phone field exists in the schema but TypeScript doesn't recognize it yet
            ...(phone ? { phone } : {}),
            hasGuest: !!hasGuest,
            hasDriver: !!hasDriver,
            hasAide: !!hasAide,
            registrationCode: {
              connect: { id: registrationCode.id }
            }
          } as any // Type assertion to bypass TypeScript error until Prisma client is regenerated
        });

        // Update the registration code status
        await tx.registrationCode.update({
          where: { id: registrationCode.id },
          data: {
            used: true,
            usedAt: new Date(),
            status: 'used'
          } as any // Type assertion to bypass TypeScript error until Prisma client is regenerated
        });

        return newRsvp;
      });
      
      console.log('RSVP created successfully:', JSON.stringify({
        id: rsvp.id,
        name: rsvp.name,
        email: rsvp.email,
        phone: rsvp.phone
      }));
    } catch (txError) {
      console.error('Error in RSVP transaction:', txError);
      return NextResponse.json(
        { 
          success: false,
          error: 'An error occurred while creating your RSVP' 
        },
        { status: 500 }
      );
    }

    // Send confirmation message
    try {
      // Always send email confirmation if email is provided
      let emailSent = false;
      let whatsappSent = false;
      
      if (email) {
        emailSent = await sendConfirmationEmail(email, name);
      } else {
      }
      
      // Send WhatsApp confirmation if phone is provided
      if (phone) {
        whatsappSent = await sendWhatsAppConfirmation(phone, name, eventId);
      } else {
      }
      
      // Log confirmation status
      // Return success response even if confirmations failed
      // The RSVP was still created successfully
      return NextResponse.json({
        success: true,
        message: 'RSVP submitted successfully',
        confirmations: {
          email: emailSent,
          whatsapp: whatsappSent
        }
      });
    } catch (confirmError) {
      // Log the error but still return success since the RSVP was created
      console.error('Error sending confirmation messages:', confirmError);
      return NextResponse.json({
        success: true,
        message: 'RSVP submitted successfully, but there was an issue sending confirmation messages',
        confirmations: {
          email: false,
          whatsapp: false
        }
      });
    }
  } catch (error) {
    console.error('Error submitting RSVP:', error);
    
    // Ensure we're returning a properly formatted JSON response
    return NextResponse.json(
      { 
        success: false,
        error: 'An error occurred while submitting your RSVP' 
      },
      { status: 500 }
    );
  }
}
