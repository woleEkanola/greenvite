import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import nodemailer from 'nodemailer';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

// Update the Invite interface to include WhatsApp fields
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
  whatsappStatus: string | null;
  whatsappProvider: string | null;
  errorMessage: string | null;
  code: string | null;
  createdAt: Date;
  updatedAt: Date;
  registrationCodeId?: string | null;
}

// WhatsApp API configuration
const WAAPI_BASE_URL = process.env.WAAPI_BASE_URL || 'https://waapi.app/api/v1';
const WAAPI_TOKEN = process.env.WAAPI_TOKEN;
const INSTANCE_ID = process.env.WAAPI_INSTANCE_ID;

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

// Function to send WhatsApp message using WhatsApp API
async function sendWhatsAppMessage(phone: string, name: string, code: string, message: string, eventLink: string): Promise<boolean> {
  try {
    console.log(`Sending WhatsApp message to ${name} (${phone})`)
    
    // Format the phone number
    let formattedPhone = phone.replace(/\s+/g, '');
    
    // Remove the '+' if present
    if (formattedPhone.startsWith('+')) {
      formattedPhone = formattedPhone.substring(1);
    }
    
    // Handle Nigerian numbers: Convert 0... to 234...
    if (formattedPhone.startsWith('0') && (formattedPhone.length === 11 || formattedPhone.length === 10)) {
      formattedPhone = '234' + formattedPhone.substring(1);
    } 
    // If it doesn't have a country code (not starting with 1 or 234), assume Nigerian
    else if (!formattedPhone.startsWith('1') && !formattedPhone.startsWith('234')) {
      formattedPhone = '234' + formattedPhone.replace(/^0+/, '');
    }
    
    // Replace placeholders in the message
    const personalizedMessage = message
      .replace(/{{name}}/g, name)
      .replace(/{{code}}/g, code)
      .replace(/{{link}}/g, `${eventLink}#${code}`)
    
    // Check that we have a valid international format
    const validPhoneRegex = /^(1|234)\d{10}$/;
    if (!validPhoneRegex.test(formattedPhone)) {
      console.error(`Invalid phone number format: ${phone} (formatted to ${formattedPhone}). Must be a US or Nigerian number.`);
      return false;
    }
    
    console.log(`Sending WhatsApp message to: ${formattedPhone} (original: ${phone})`);

    // Prepare the request payload for WhatsApp API
    const payload = {
      chatId: formattedPhone +'@c.us',
      message: personalizedMessage,
    };

    // Send WhatsApp message using WhatsApp API
    try {
      if (!WAAPI_TOKEN) {
        console.error('WhatsApp API token is not configured');
        throw new Error('WhatsApp API token is not configured');
      }
      
      const response = await axios.post(
        `${WAAPI_BASE_URL}/instances/${INSTANCE_ID}/client/action/send-message`, 
        payload, 
        {
          headers: {
            'Authorization': `Bearer ${WAAPI_TOKEN}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const data = response.data;
      console.log('WhatsApp API response:', JSON.stringify(data));

      if (data && data.data && data.data.status === 'success') {
        console.log(`WhatsApp message sent successfully to ${formattedPhone}`);
        return true;
      } else {
        const errorMessage = data?.data?.message || 'Unknown error';
        console.error(`Failed to send WhatsApp message: ${errorMessage}`);
        throw new Error(`Failed to send WhatsApp message: ${errorMessage}`);
      }
    } catch (error: any) {
      console.error('WhatsApp API error:', error);
      console.error('Error details:', error.response?.data || error.message);
      // Return false instead of throwing to allow the process to continue
      return false;
    }
  } catch (error: any) {
    console.error('WhatsApp API error:', error);
    console.error('Error message:', error.message);
    // Return false instead of throwing to allow the process to continue
    return false;
  }
}

// Function to send email
async function sendEmail(
  email: string,
  name: string,
  code: string,
  subject: string,
  message: string,
  eventLink: string,
  emailImageBuffer: number[] | null
): Promise<boolean> {
  try {
    console.log(`Resending email to ${name} (${email})`)
    
    // Add the image placeholder if not already present in the message
    let personalizedMessage = message;
    if (emailImageBuffer && !message.includes('{{image}}')) {
      personalizedMessage = `<div><img src="cid:invitation-image" alt="Invitation Image" style="max-width: 100%; height: auto; margin-bottom: 20px;"/></div>${personalizedMessage}`;
    }
    
    // Now replace template variables
    personalizedMessage = personalizedMessage
      .replace(/{{name}}/g, name)
      .replace(/{{code}}/g, code)
      .replace(/{{link}}/g, `${eventLink}#${code}`)
      .replace(/{{image}}/g, '<img src="cid:invitation-image" alt="Invitation Image" style="max-width: 100%; height: auto; margin-bottom: 20px;"/>');

    // Prepare email options
    const mailOptions: any = {
      from: `"Greenvites" <${process.env.SMTP_USER}>`,
      to: email,
      subject: subject,
      html: personalizedMessage
    };

    // Add attachment if image buffer is provided - use original size without resizing
    if (emailImageBuffer) {
      const imageBufferSize = Buffer.from(emailImageBuffer).length;
      console.log(`Using original image for email resend with size: ${imageBufferSize} bytes`);
      console.log('Adding image attachment with CID: invitation-image');
      mailOptions.attachments = [
        {
          filename: 'invitation.jpg',
          content: Buffer.from(emailImageBuffer),
          cid: 'invitation-image' // Same CID value as in the <img> tag
        }
      ];
    }

    // Send the email
    const info = await emailTransporter.sendMail(mailOptions);
    console.log(`Email resent successfully to ${name} (${email}): ${info.messageId}`);
    return true;
  } catch (error) {
    console.error(`Error resending email to ${email}:`, error);
    return false;
  }
}

// Helper function to get an invite by ID
async function getInviteById(id: string): Promise<Invite | null> {
  try {
    const invite = await prisma.invite.findUnique({
      where: { id }
    });
    
    if (!invite) return null;
    
    // Cast to our Invite interface with WhatsApp fields
    return {
      ...invite,
      whatsappStatus: invite.smsStatus as string | null,
      whatsappProvider: invite.smsProvider as string | null
    } as unknown as Invite;
  } catch (error) {
    console.error(`Error getting invite ${id}:`, error);
    return null;
  }
}

// Helper function to update an invite
async function updateInvite(id: string, data: Partial<Invite>): Promise<Invite> {
  try {
    // Map our Invite interface fields to the database schema
    const dbData: any = { ...data };
    
    // Map WhatsApp fields to SMS fields for database compatibility
    if (data.whatsappStatus !== undefined) {
      dbData.smsStatus = data.whatsappStatus;
      delete dbData.whatsappStatus;
    }
    
    if (data.whatsappProvider !== undefined) {
      dbData.smsProvider = data.whatsappProvider;
      delete dbData.whatsappProvider;
    }
    
    const updatedInvite = await prisma.invite.update({
      where: { id },
      data: dbData
    });
    
    // Cast back to our Invite interface
    return {
      ...updatedInvite,
      whatsappStatus: updatedInvite.smsStatus as string | null,
      whatsappProvider: updatedInvite.smsProvider as string | null
    } as unknown as Invite;
  } catch (error) {
    console.error(`Error updating invite ${id}:`, error);
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
    const { 
      inviteId, 
      phone, 
      email, 
      channel, 
      emailSubject, 
      emailMessage, 
      whatsappMessage, 
      eventLink,
      enableEmail,
      enableWhatsApp,
      emailImageBuffer 
    } = body;

    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 });
    }

    // Get the invite
    const invite = await getInviteById(inviteId);
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Get the registration code
    const code = invite.code || '';

    // Initialize status variables
    let emailStatus: string | null = null;
    let whatsappStatus: string | null = null;
    let whatsappProvider: string | null = null;
    let errorMessage: string | null = null;
    let successfulChannels: string[] = [];

    // Send email if requested
    if ((channel === 'email' || channel === 'both') && email && enableEmail) {
      try {
        const emailSuccess = await sendEmail(
          email,
          invite.name || '',
          code,
          emailSubject || 'Your Event Invitation',
          emailMessage || 'Here is your event invitation.',
          eventLink || '',
          emailImageBuffer
        );
        emailStatus = emailSuccess ? 'sent' : 'failed';
        if (emailSuccess) {
          successfulChannels.push('email');
        } else {
          errorMessage = 'Email sending failed';
        }
      } catch (error) {
        console.error(`Failed to send email to ${invite.name}:`, error);
        emailStatus = 'failed';
        errorMessage = (error instanceof Error ? error.message : 'Unknown email error');
      }
    }

    // Send WhatsApp message if requested
    if ((channel === 'whatsapp' || channel === 'both') && phone && enableWhatsApp) {
      try {
        const whatsappSuccess = await sendWhatsAppMessage(
          phone,
          invite.name || '',
          code,
          whatsappMessage || '',
          eventLink || ''
        );
        whatsappStatus = whatsappSuccess ? 'sent' : 'failed';
        whatsappProvider = process.env.WHATSAPP_PROVIDER || 'whatsapp_api';
        if (whatsappSuccess) {
          successfulChannels.push('whatsapp');
        } else {
          errorMessage = (errorMessage ? errorMessage + '; ' : '') + 'WhatsApp sending failed';
        }
      } catch (error) {
        console.error(`Failed to send WhatsApp message to ${invite.name}:`, error);
        whatsappStatus = 'failed';
        errorMessage = (errorMessage ? errorMessage + '; ' : '') + (error instanceof Error ? error.message : 'Unknown WhatsApp error');
      }
    }

    // Determine overall status
    const status = successfulChannels.length > 0 ? 'sent' : 'failed';

    // Update the invite in the database
    const updatedInvite = await updateInvite(inviteId, {
      phone,
      email,
      type: channel,
      sent: successfulChannels.length > 0,
      sentAt: new Date(),
      status,
      emailStatus,
      whatsappStatus,
      whatsappProvider,
      errorMessage,
      updatedAt: new Date()
    } as any);

    return NextResponse.json({
      success: status === 'sent',
      invite: {
        id: updatedInvite.id,
        name: updatedInvite.name,
        email: updatedInvite.email,
        phone: updatedInvite.phone,
        code: updatedInvite.code,
        channels: successfulChannels.join(', '),
        whatsappStatus: updatedInvite.whatsappStatus,
        emailStatus: updatedInvite.emailStatus,
        whatsappProvider: updatedInvite.whatsappProvider,
        errorMessage: updatedInvite.errorMessage
      }
    });
  } catch (error) {
    console.error('Error in resend invite:', error);
    return NextResponse.json(
      { error: 'Failed to resend invite' },
      { status: 500 }
    );
  }
}
