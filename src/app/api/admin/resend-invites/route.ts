import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail, sendWhatsApp } from '@/lib/communications';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      console.error('[POST /api/admin/resend-invites] Unauthorized access attempt');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { inviteIds } = await request.json();
    
    if (!inviteIds || !Array.isArray(inviteIds) || inviteIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Valid invite IDs are required' },
        { status: 400 }
      );
    }

    // Get the invites to resend
    const invites = await prisma.invite.findMany({
      where: { id: { in: inviteIds } }
    });

    if (invites.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid invites found with the provided IDs' },
        { status: 404 }
      );
    }

    // Default message templates (you may want to make these configurable)
    const defaultEmailSubject = 'Invitation to Jesse Oghenekome George\'s Church Dedication';
    const defaultEmailMessage = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #2c3e50; text-align: center;">You are invited to the church dedication of</h2>
        <h1 style="color: #16a085; text-align: center; margin-bottom: 30px;">Jesse Oghenekome George</h1>
        <p style="text-align: center; font-size: 18px;">at RCCG Church, Champions Cathedral </p>
        
        <div style="margin: 30px 0; background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
          <h3 style="color: #2c3e50; text-align: center; margin-top: 0;">LOCATIONS</h3>
          <p style="text-align: center; font-weight: bold;">Church Dedication</p>
          <p style="text-align: center;">RCCG Church, Champions Cathedral</p>
          <p style="text-align: center;">#16-18 Airport Road, Effurun, Warri Delta</p>
          <p style="text-align: center;">Nigeria</p>
          <p style="text-align: center; font-size: 20px; margin: 20px 0;">10:00 AM</p>
          <p style="text-align: center; font-size: 18px;">Sunday, April 13, 2025</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <p>Your personal registration code is: <strong>{{code}}</strong></p>
          <p style="margin-bottom: 15px; font-size: 16px;">Click the "Confirm Your Attendance" button below to fill out the form and secure your reservation. This will help us plan accordingly. Attendance is by invitation only, and submitting the completed form will grant you an access code for the event.</p>
          <p style="margin-bottom: 20px;"><a href="{{link}}" style="color: #4CAF50; text-decoration: underline;">{{link}}</a></p>
          <a href="{{link}}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 14px 28px; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; text-decoration: none;">
            Confirm Your Attendance
          </a>
        </div>
        
        <p style="text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 14px;">We look forward to celebrating this special occasion with you.</p>
      </div>
    `;
    const defaultWhatsappMessage = `You're invited to Jesse Oghenekome George's Church Dedication at RCCG Church, Champions Cathedral, #16-18 Airport Road, Effurun, Warri Delta, Nigeria. 10:00 AM, Sunday, April 13, 2025. Your code: {{code}}. Click the link below to complete the form and secure your reservation. This will help us plan accordingly. Attendance is by invitation only, and submitting the completed form will grant you an access code for the event. RSVP: {{link}}`;
    const eventLink = process.env.NEXT_PUBLIC_EVENT_URL || 'https://jessegeorge.greenvites.online/jessegeorge';

    // Process each invite
    const results = await Promise.allSettled(invites.map(async (invite) => {
      try {
        const { name, email, phone, code, type } = invite;
        const successfulChannels: string[] = [];
        let emailStatus: string | null = null;
        let whatsappStatus: string | null = null;
        let errorMessage: string | null = null;

        // Send email if applicable
        if ((type === 'email' || type === 'both') && email) {
          try {
            const emailSuccess = await sendEmail(
              email, 
              name || '', 
              code || '', 
              defaultEmailSubject, 
              defaultEmailMessage, 
              eventLink
            );
            emailStatus = emailSuccess ? 'sent' : 'failed';
            if (emailSuccess) {
              successfulChannels.push('email');
            } else {
              errorMessage = (errorMessage ? errorMessage + '; ' : '') + 'Email sending failed';
            }
          } catch (error) {
            console.error(`Failed to resend email to ${name}:`, error);
            emailStatus = 'failed';
            errorMessage = error instanceof Error ? error.message : 'Unknown email error';
          }
        }

        // Send WhatsApp if applicable
        if ((type === 'whatsapp' || type === 'both') && phone) {
          try {
            const whatsappSuccess = await sendWhatsApp(
              phone, 
              name || '', 
              code || '', 
              defaultWhatsappMessage, 
              eventLink
            );
            whatsappStatus = whatsappSuccess ? 'sent' : 'failed';
            if (whatsappSuccess) {
              successfulChannels.push('whatsapp');
            } else {
              errorMessage = (errorMessage ? errorMessage + '; ' : '') + 'WhatsApp sending failed';
            }
          } catch (error) {
            // Check if it's a timeout error (504) - treat as success
            if (axios.isAxiosError(error) && (
              error.code === 'ECONNABORTED' || 
              error.response?.status === 504 ||
              error.message.includes('timeout')
            )) {
              // Format the phone number for logging
              const formattedPhone = phone.replace(/[^\d+]/g, '');
              const whatsappPhone = formattedPhone.replace(/^\+/, '') + '@c.us';
              console.log(`WhatsApp message to ${whatsappPhone} timed out, but treating as success`);
              whatsappStatus = 'sent';
              successfulChannels.push('whatsapp');
            } else {
              console.error(`Failed to resend WhatsApp message to ${name}:`, error);
              whatsappStatus = 'failed';
              errorMessage = (errorMessage ? errorMessage + '; ' : '') + (error instanceof Error ? error.message : 'Unknown WhatsApp error');
            }
          }
        }

        // Determine overall status
        let status = 'pending';
        if (successfulChannels.length > 0) {
          status = successfulChannels.length === (type === 'both' ? 2 : 1) ? 'sent' : 'partial';
        } else {
          status = 'failed';
        }

        // Update the invite
        const updatedInvite = await prisma.invite.update({
          where: { id: invite.id },
          data: {
            status,
            emailStatus,
            whatsappStatus,
            errorMessage,
            sent: successfulChannels.length > 0,
            sentAt: new Date()
          }
        });

        return {
          id: invite.id,
          name,
          status,
          successfulChannels
        };
      } catch (error) {
        console.error(`Failed to process invite ${invite.id}:`, error);
        return Promise.reject({ id: invite.id, error });
      }
    }));

    const successful = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);
    
    const failed = results
      .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
      .map(result => result.reason);

    return NextResponse.json({
      success: true,
      message: `Successfully resent ${successful.length} out of ${invites.length} invites`,
      successful,
      failed,
      failedCount: failed.length
    });
  } catch (error) {
    console.error('[POST /api/admin/resend-invites] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to resend invites',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      },
      { status: 500 }
    );
  }
}
