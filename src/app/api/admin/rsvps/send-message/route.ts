import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import nodemailer from 'nodemailer';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

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

// Function to send SMS using Africa's Talking
async function sendSMSAfricasTalking(phone: string, name: string, message: string, registrationCode?: string): Promise<boolean> {
  try {
    console.log(`Sending SMS via Africa's Talking to ${name} (${phone})`)
    
    if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
      console.error('Africa\'s Talking credentials not found');
      return false;
    }
    
    // Format the phone number if needed (remove spaces, add country code if missing)
    let formattedPhone = phone.replace(/\s+/g, '')
    if (!formattedPhone.startsWith('+')) {
      // Default to Nigeria country code if not specified
      formattedPhone = '+234' + formattedPhone.replace(/^0+/, '')
    }
    
    // Replace placeholders in the message
    let personalizedMessage = message
      .replace(/{{name}}/g, name);
      
    // Replace registration code if provided
    if (registrationCode) {
      personalizedMessage = personalizedMessage.replace(/{{code}}/g, registrationCode);
      
      // Replace link placeholder with the event link and registration code
      const eventLink = process.env.EVENT_LINK || 'https://greenvites.online/jessegeorge';
      personalizedMessage = personalizedMessage.replace(/{{link}}/g, `${eventLink}#${registrationCode}`);
    }
    
    // Initialize the SDK
    const africastalking = require('africastalking')({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME,
    });

    // Get the SMS service
    const sms = africastalking.SMS;
    
    // Validate the phone number format
    if (!formattedPhone.startsWith('+234') || formattedPhone.length !== 14) {
      console.error(`Invalid phone number format: ${phone} (formatted to ${formattedPhone}). Must be a Nigerian number in international format.`);
      return false;
    }
    
    console.log(`Sending SMS via Africa's Talking to: ${formattedPhone} (original: ${phone})`);

    // Send SMS
    const response = await sms.send({
      to: [formattedPhone],
      message: personalizedMessage,
    });

    console.log('Africa\'s Talking SMS API response:', JSON.stringify(response));

    if (!response.SMSMessageData.Recipients || 
        response.SMSMessageData.Recipients.length === 0 || 
        response.SMSMessageData.Recipients[0].status !== 'Success') {
      const errorMessage = response.SMSMessageData.Recipients && response.SMSMessageData.Recipients.length > 0 
        ? `${response.SMSMessageData.Recipients[0].statusCode}: ${response.SMSMessageData.Recipients[0].status}`
        : 'Unknown error';
      throw new Error(`Failed to send SMS: ${errorMessage}`);
    }

    return true;
  } catch (error) {
    console.error('Africa\'s Talking SMS API error:', error);
    return false;
  }
}

// Function to send SMS using Termii
async function sendSMSTermii(phone: string, name: string, message: string, registrationCode?: string): Promise<boolean> {
  try {
    console.log(`Sending SMS via Termii to ${name} (${phone})`)
    
    // Format the phone number if needed (remove spaces, add country code if missing)
    let formattedPhone = phone.replace(/\s+/g, '')
    if (!formattedPhone.startsWith('+')) {
      // Default to Nigeria country code if not specified
      formattedPhone = '+234' + formattedPhone.replace(/^0+/, '')
    }
    
    // Remove the '+' sign for Termii as they don't expect it
    formattedPhone = formattedPhone.replace('+', '')
    
    // Replace placeholders in the message
    let personalizedMessage = message
      .replace(/{{name}}/g, name);
      
    // Replace registration code if provided
    if (registrationCode) {
      personalizedMessage = personalizedMessage.replace(/{{code}}/g, registrationCode);
      
      // Replace link placeholder with the event link and registration code
      const eventLink = process.env.EVENT_LINK || 'https://greenvites.online/jessegeorge';
      personalizedMessage = personalizedMessage.replace(/{{link}}/g, `${eventLink}#${registrationCode}`);
    }
    
    // Validate the phone number format
    if (!formattedPhone.startsWith('234') || formattedPhone.length !== 13) {
      console.error(`Invalid phone number format: ${phone} (formatted to ${formattedPhone}). Must be a Nigerian number in international format without '+'.`);
      return false;
    }
    
    console.log(`Sending SMS via Termii to: ${formattedPhone} (original: ${phone})`);

    // Prepare the request payload for Termii
    const payload = {
      to: formattedPhone,
      from: process.env.TERMII_SENDER_ID,
      sms: personalizedMessage,
      type: "plain",
      channel: "dnd", // Use DND channel to bypass Do Not Disturb
      api_key: process.env.TERMII_API_KEY,
    };

    // Send SMS using Termii API
    const response = await axios.post('https://api.ng.termii.com/api/sms/send', payload);
    
    console.log('Termii SMS API response:', JSON.stringify(response.data));

    if (response.data && response.data.message_id) {
      return true;
    } else {
      throw new Error(`Failed to send SMS: ${response.data?.message || 'Unknown error'}`);
    }
  } catch (error) {
    console.error('Termii SMS API error:', error);
    return false;
  }
}

// Main SMS sending function that selects the provider based on environment variable
async function sendSMS(phone: string, name: string, message: string, registrationCode?: string): Promise<boolean> {
  try {
    console.log(`Sending SMS to ${name} (${phone})`)
    
    // Replace placeholders in the message
    let personalizedMessage = message
      .replace(/{{name}}/g, name);
      
    // Replace registration code if provided
    if (registrationCode) {
      personalizedMessage = personalizedMessage.replace(/{{code}}/g, registrationCode);
      
      // Replace link placeholder with the event link and registration code
      const eventLink = process.env.EVENT_LINK || 'https://greenvites.online/jessegeorge';
      personalizedMessage = personalizedMessage.replace(/{{link}}/g, `${eventLink}#${registrationCode}`);
    }
    
    // Determine which SMS provider to use based on environment variable
    const smsProvider = process.env.SMS_PROVIDER || 'africas_talking';
    
    console.log(`Using SMS provider: ${smsProvider}`);
    
    if (smsProvider === 'termii') {
      return sendSMSTermii(phone, name, personalizedMessage, registrationCode);
    } else {
      // Default to Africa's Talking
      return sendSMSAfricasTalking(phone, name, personalizedMessage, registrationCode);
    }
  } catch (error) {
    console.error('SMS sending error:', error);
    return false;
  }
}

// Helper function to send email
async function sendEmail(email: string, name: string, subject: string, htmlMessage: string, registrationCode?: string, imageBuffer?: Buffer): Promise<boolean> {
  try {
    console.log(`Sending email to ${name} (${email})`);
    
    // Replace placeholders in the message
    let personalizedSubject = subject.replace(/{{name}}/g, name);
    let personalizedMessage = htmlMessage.replace(/{{name}}/g, name);
    
    // Replace registration code if provided
    if (registrationCode) {
      personalizedSubject = personalizedSubject.replace(/{{code}}/g, registrationCode);
      personalizedMessage = personalizedMessage.replace(/{{code}}/g, registrationCode);
      
      // Replace link placeholder with the event link and registration code
      const eventLink = process.env.EVENT_LINK || 'https://greenvites.online/jessegeorge';
      personalizedMessage = personalizedMessage.replace(/{{link}}/g, `${eventLink}#${registrationCode}`);
    }
    
    // Prepare email options
    const mailOptions: any = {
      from: process.env.SMTP_FROM || 'noreply@greenvites.online',
      to: email,
      subject: personalizedSubject,
      html: personalizedMessage,
    };
    
    // Add image attachment if provided
    if (imageBuffer) {
      mailOptions.attachments = [
        {
          filename: 'invitation.jpg',
          content: imageBuffer,
          cid: 'invitation-image', // Content ID for referencing in HTML
        },
      ];
    }
    
    // Send email
    const info = await emailTransporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return true;
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

// Interface for message tracking
interface MessageRecord {
  id: string;
  rsvpId: string;
  name: string;
  email?: string;
  phone?: string;
  messageType: string;
  status: string;
  emailStatus?: string;
  smsStatus?: string;
  smsProvider?: string;
  errorMessage?: string;
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const formData = await request.formData();
    const rsvpIds = JSON.parse(formData.get('rsvpIds') as string);
    const messageType = formData.get('messageType') as string;
    const emailSubject = formData.get('emailSubject') as string;
    const emailMessage = formData.get('emailMessage') as string;
    const smsMessage = formData.get('smsMessage') as string;
    const includeRegistrationCode = formData.get('includeRegistrationCode') === 'true';
    
    // Get email image if provided
    let emailImageBuffer: Buffer | undefined;
    const emailImage = formData.get('emailImage') as File;
    if (emailImage) {
      const arrayBuffer = await emailImage.arrayBuffer();
      emailImageBuffer = Buffer.from(arrayBuffer);
    }
    
    // Validate required fields
    if (!rsvpIds || !Array.isArray(rsvpIds) || rsvpIds.length === 0) {
      return NextResponse.json({ error: 'No RSVPs selected' }, { status: 400 });
    }
    
    if (messageType !== 'email' && messageType !== 'sms' && messageType !== 'both') {
      return NextResponse.json({ error: 'Invalid message type' }, { status: 400 });
    }
    
    if ((messageType === 'email' || messageType === 'both') && (!emailSubject || !emailMessage)) {
      return NextResponse.json({ error: 'Email subject and message are required' }, { status: 400 });
    }
    
    if ((messageType === 'sms' || messageType === 'both') && !smsMessage) {
      return NextResponse.json({ error: 'SMS message is required' }, { status: 400 });
    }
    
    // Get RSVPs with their registration codes
    const rsvps = await prisma.rsvp.findMany({
      where: {
        id: {
          in: rsvpIds,
        },
      },
      include: {
        registrationCode: true,
      }
    });
    
    // Send messages and track results
    const results = {
      total: rsvps.length,
      emailsSent: 0,
      smsSent: 0,
      failed: 0,
    };
    
    const messageRecords: MessageRecord[] = [];
    
    for (const rsvp of rsvps) {
      try {
        // Create a message record
        const messageRecord: MessageRecord = {
          id: uuidv4(),
          rsvpId: rsvp.id,
          name: rsvp.name,
          email: rsvp.email,
          phone: (rsvp as any).phone,
          messageType,
          status: 'pending',
          sentAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        
        // Track successful channels
        const successfulChannels: string[] = [];
        
        // Get registration code if needed
        const registrationCode = includeRegistrationCode ? rsvp.registrationCode.code : undefined;
        
        // Send email if requested
        if ((messageType === 'email' || messageType === 'both') && rsvp.email) {
          const emailSent = await sendEmail(
            rsvp.email,
            rsvp.name,
            emailSubject,
            emailMessage,
            registrationCode,
            emailImageBuffer
          );
          
          messageRecord.emailStatus = emailSent ? 'sent' : 'failed';
          
          if (emailSent) {
            results.emailsSent++;
            successfulChannels.push('email');
          } else {
            messageRecord.errorMessage = (messageRecord.errorMessage || '') + 'Failed to send email. ';
          }
        }
        
        // Send SMS if requested
        if ((messageType === 'sms' || messageType === 'both') && (rsvp as any).phone) {
          const smsSent = await sendSMS(
            (rsvp as any).phone,
            rsvp.name,
            smsMessage,
            registrationCode
          );
          
          messageRecord.smsStatus = smsSent ? 'sent' : 'failed';
          messageRecord.smsProvider = process.env.SMS_PROVIDER || 'africas_talking';
          
          if (smsSent) {
            results.smsSent++;
            successfulChannels.push('sms');
          } else {
            messageRecord.errorMessage = (messageRecord.errorMessage || '') + 'Failed to send SMS. ';
          }
        }
        
        // Update status based on results
        if (successfulChannels.length > 0) {
          if ((messageType === 'both' && successfulChannels.length === 2) ||
              (messageType !== 'both' && successfulChannels.length === 1)) {
            messageRecord.status = 'sent';
          } else {
            messageRecord.status = 'partial';
          }
        } else {
          messageRecord.status = 'failed';
          results.failed++;
        }
        
        // Add to records
        messageRecords.push(messageRecord);
        
      } catch (error) {
        console.error(`Error sending message to ${rsvp.name}:`, error);
        results.failed++;
        
        // Add failed record
        messageRecords.push({
          id: uuidv4(),
          rsvpId: rsvp.id,
          name: rsvp.name,
          email: rsvp.email,
          phone: (rsvp as any).phone,
          messageType,
          status: 'failed',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          sentAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }
    
    // Store message records in database (optional)
    // This would require creating a new table/model for message tracking
    
    return NextResponse.json({
      success: true,
      results,
      messages: messageRecords.map(record => ({
        id: record.id,
        rsvpId: record.rsvpId,
        name: record.name,
        email: record.email,
        phone: record.phone,
        messageType: record.messageType,
        status: record.status,
        emailStatus: record.emailStatus,
        smsStatus: record.smsStatus,
        smsProvider: record.smsProvider,
        errorMessage: record.errorMessage,
        sentAt: record.sentAt,
      })),
    });
  } catch (error) {
    console.error('Error sending messages:', error);
    return NextResponse.json(
      { error: 'An error occurred while sending messages' },
      { status: 500 }
    );
  }
}
