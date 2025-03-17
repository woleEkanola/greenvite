import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getInviteById, updateInvite, markRegistrationCodeAsUsed } from '@/lib/db';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Define the Invite type to match the Prisma schema
interface Invite {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  sent: boolean;
  sentAt: Date;
  type: string;
  status: string;
  emailStatus: string | null;
  smsStatus: string | null;
  smsProvider: string | null;
  errorMessage: string | null;
  code: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// Configure email transporter
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    // Do not fail on invalid certificates
    rejectUnauthorized: false
  },
  connectionTimeout: 10000, // 10 seconds
  greetingTimeout: 10000,   // 10 seconds
  socketTimeout: 15000      // 15 seconds
});

// Verify SMTP connection on startup
emailTransporter.verify(function(error, success) {
  if (error) {
    console.error('SMTP connection error:', error);
  } else {
    console.log('SMTP server is ready to take our messages');
  }
});

// Helper function to send SMS via Africa's Talking
async function sendSMSAfricasTalking(phone: string, name: string, code: string, message: string, eventLink: string) {
  try {
    // Format the phone number to ensure it has the country code
    let formattedPhone = phone;
    
    // If the phone number starts with '0', replace it with '+234' (Nigeria)
    if (phone.startsWith('0')) {
      formattedPhone = '+234' + phone.substring(1);
    } 
    // If the phone number starts with '+234', add a '+' prefix
    else if (phone.startsWith('234')) {
      formattedPhone = '+' + phone;
    }
    
    // Replace placeholders in the message
    const customMessage = message
      .replace(/{{name}}/g, name)
      .replace(/{{code}}/g, code)
      .replace(/{{link}}/g, `${eventLink}?code=${code}`)
    
    // Initialize the SDK
    const credentials = {
      apiKey: process.env.AT_API_KEY || '',
      username: process.env.AT_USERNAME || '',
    }
    
    // Send the message
    const options = {
      to: [formattedPhone],
      message: customMessage,
      from: 'Greenvites',
    }
    
    const response = await axios.post(
      'https://api.africastalking.com/version1/messaging',
      new URLSearchParams({
        username: credentials.username,
        to: formattedPhone,
        message: customMessage,
        from: 'Greenvites',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'apiKey': credentials.apiKey,
        },
      }
    );
    
    if (response.status === 201 || response.status === 200) {
      console.log(`SMS sent to ${formattedPhone} via Africa's Talking`);
      return true;
    } else {
      console.error(`Failed to send SMS to ${formattedPhone} via Africa's Talking:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(`Error sending SMS via Africa's Talking:`, error);
    throw error;
  }
}

// Helper function to send SMS via Termii
async function sendSMSTermii(phone: string, name: string, code: string, message: string, eventLink: string) {
  try {
    // Format the phone number to ensure it has the country code
    let formattedPhone = phone;
    
    // If the phone number starts with '0', replace it with '234' (Nigeria)
    if (phone.startsWith('0')) {
      formattedPhone = '234' + phone.substring(1);
    } 
    // If the phone number starts with '+', remove it
    else if (phone.startsWith('+')) {
      formattedPhone = phone.substring(1);
    }
    
    // Replace placeholders in the message
    const customMessage = message
      .replace(/{{name}}/g, name)
      .replace(/{{code}}/g, code)
      .replace(/{{link}}/g, `${eventLink}?code=${code}`)
    
    const apiKey = process.env.TERMII_API_KEY || '';
    const senderId = process.env.TERMII_SENDER_ID || 'Greenvites';
    
    const data = {
      to: formattedPhone,
      from: senderId,
      sms: customMessage,
      type: "plain",
      api_key: apiKey,
      channel: "dnd", // Use DND channel to bypass DND restrictions
    };
    
    const response = await axios.post('https://api.ng.termii.com/api/sms/send', data);
    
    if (response.status === 200 || response.status === 201) {
      console.log(`SMS sent to ${formattedPhone} via Termii`);
      return true;
    } else {
      console.error(`Failed to send SMS to ${formattedPhone} via Termii:`, response.data);
      return false;
    }
  } catch (error) {
    console.error(`Error sending SMS via Termii:`, error);
    throw error;
  }
}

// Helper function to send SMS using the configured provider
async function sendSMS(phone: string, name: string, code: string, message: string, eventLink: string) {
  const provider = process.env.SMS_PROVIDER || 'africas_talking';
  
  if (provider === 'termii') {
    return sendSMSTermii(phone, name, code, message, eventLink);
  } else {
    return sendSMSAfricasTalking(phone, name, code, message, eventLink);
  }
}

// Helper function to send email
async function sendEmail(
  email: string,
  name: string,
  code: string,
  subject: string,
  message: string,
  eventLink: string,
  imageBuffer?: Buffer
): Promise<boolean> {
  try {
    // Prepare the email content with the registration code
    const finalMessage = message
      .replace(/\{name\}/g, name)
      .replace(/\{code\}/g, code)
      .replace(/\{link\}/g, eventLink);

    // Prepare email attachments if image is provided
    const attachments = imageBuffer
      ? [
          {
            filename: 'invitation.jpg',
            content: imageBuffer,
            cid: 'invitation-image',
          },
        ]
      : [];

    // HTML email template
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4a5568;">Hello ${name},</h2>
        ${
          imageBuffer
            ? `<div style="text-align: center; margin: 20px 0;">
                <img src="cid:invitation-image" alt="Event Invitation" style="max-width: 100%; border-radius: 8px;" />
              </div>`
            : ''
        }
        <div style="margin: 20px 0; line-height: 1.6;">
          ${finalMessage.replace(/\n/g, '<br>')}
        </div>
        <div style="margin: 30px 0; text-align: center;">
          <div style="background-color: #f7fafc; border: 1px solid #e2e8f0; padding: 15px; border-radius: 5px; display: inline-block;">
            <p style="margin: 0; font-size: 14px; color: #718096;">Your Registration Code</p>
            <p style="margin: 5px 0 0; font-size: 24px; font-weight: bold; letter-spacing: 2px; color: #4a5568;">${code}</p>
          </div>
        </div>
        <div style="margin: 20px 0; text-align: center;">
          <a href="${eventLink}" style="background-color: #4299e1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block; font-weight: bold;">
            Confirm Your Attendance
          </a>
        </div>
        <p style="color: #718096; font-size: 14px; text-align: center; margin-top: 30px;">
          Please use this code when confirming your attendance on our website.
        </p>
      </div>
    `;

    try {
      // Try primary email transport
      const info = await emailTransporter.sendMail({
        from: `"Event Invitation" <${process.env.SMTP_USER}>`,
        to: email,
        subject,
        text: finalMessage,
        html: htmlContent,
        attachments,
      });

      console.log(`[sendEmail] Email sent to ${email}: ${info.messageId}`);
      return true;
    } catch (primaryError) {
      console.error(`Primary email transport error for ${email}:`, primaryError);
      
      // Log the error for debugging but continue with invite creation
      // In a production environment, you might want to implement a fallback email service here
      // For example: await sendGridTransport.sendMail(mailOptions)
      
      // For now, we'll just track the error but consider it a "soft failure"
      throw primaryError;
    }
  } catch (error) {
    console.error(`[sendEmail] Error sending email to ${email}:`, error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse request body
    const body = await request.json();
    const { id, email, phone, message, subject, type } = body;

    if (!id) {
      return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 });
    }

    // Get the invite
    const invite = await getInviteById(id);
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Cast invite to any to handle dynamic properties
    const inviteAny = invite as any;

    // Extract the code from the invite
    const code = inviteAny.code;
    if (!code) {
      return NextResponse.json({ error: 'Invite has no registration code' }, { status: 400 });
    }

    // Mark the code as pending while we attempt to resend
    await markRegistrationCodeAsUsed(code, 'pending');

    // Track successful channels
    const successfulChannels = [];
    let emailStatus = inviteAny.emailStatus || null;
    let smsStatus = inviteAny.smsStatus || null;
    let errorMessage = null;

    // Get the event link from the request headers
    const host = request.headers.get('host') || 'greenvites.online';
    const protocol = host.includes('localhost') ? 'http://' : 'https://';
    const eventLink = `${protocol}${host}/jessegeorge`;

    // Resend via email if requested
    if (type === 'email' || type === 'both') {
      try {
        await sendEmail(
          email || inviteAny.email,
          inviteAny.name,
          code,
          subject || 'Your Event Invitation',
          message || 'Here is your event invitation.',
          eventLink
        );
        emailStatus = 'sent';
        successfulChannels.push('email');
      } catch (error) {
        console.error(`Failed to send email to ${inviteAny.name}:`, error);
        emailStatus = 'failed';
        errorMessage = error instanceof Error ? error.message : 'Unknown email error';
      }
    }

    // Resend via SMS if requested
    if (type === 'sms' || type === 'both') {
      try {
        const phoneToUse = phone || inviteAny.phone;
        if (phoneToUse) {
          await sendSMSAfricasTalking(
            phoneToUse,
            inviteAny.name,
            code,
            message || 'Here is your event invitation.',
            eventLink
          );
          smsStatus = 'sent';
          successfulChannels.push('sms');
        }
      } catch (error) {
        console.error(`Failed to send SMS to ${inviteAny.name}:`, error);
        smsStatus = 'failed';
        errorMessage = (errorMessage || '') + (error instanceof Error ? error.message : 'Unknown SMS error');
      }
    }

    // Determine overall status
    let status = 'pending';
    if (successfulChannels.length > 0) {
      status = successfulChannels.length === (type === 'both' ? 2 : 1) ? 'sent' : 'partial';
      
      // Mark the registration code as used if the invite was successfully sent
      if (status === 'sent' || status === 'partial') {
        await markRegistrationCodeAsUsed(code, 'used');
      }
    } else {
      status = 'failed';
      
      // If the invite failed completely, mark the code as available again
      await markRegistrationCodeAsUsed(code, 'available');
    }

    // Update the invite with the new status
    const updatedInvite = await updateInvite(id, {
      status,
      emailStatus,
      smsStatus,
      errorMessage,
      email: email || inviteAny.email,
      phone: phone || inviteAny.phone,
      sent: successfulChannels.length > 0,
      sentAt: new Date()
    } as any);

    return NextResponse.json({
      message: 'Invite resent successfully',
      invite: updatedInvite
    });
  } catch (error) {
    console.error('[POST /api/admin/invites/resend] Error:', error);
    return NextResponse.json({
      error: 'Failed to resend invite',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
