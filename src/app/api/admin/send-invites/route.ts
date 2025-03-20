import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createRegistrationCodes, getRegistrationCodes, markRegistrationCodeAsUsed, isCodeUsedByActiveInvite, createBatch, updateBatchStatus } from '@/lib/db'
import nodemailer from 'nodemailer'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'; // Import axios for Termii API
import { prisma } from '@/lib/prisma'; // Import prisma
import sharp from 'sharp'

// Define the Recipient type
type Recipient = {
  name: string;
  email: string;
  phone: string;
  type: 'email' | 'whatsapp' | 'both';
};

// WhatsApp API configuration
const WAAPI_BASE_URL = process.env.WAAPI_BASE_URL || 'https://waapi.app/api/v1';
const WAAPI_TOKEN = process.env.WAAPI_TOKEN;
const INSTANCE_ID = process.env.WAAPI_INSTANCE_ID;

// WhatsApp API response interface
interface WhatsAppResponse {
  data: {
    status: string;
    message?: string;
    response?: any;
  }
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

// Function to send WhatsApp message using WhatsApp API
async function sendWhatsAppMessage(phone: string, name: string, code: string, message: string, eventLink: string, imageBuffer?: Buffer): Promise<boolean> {
  try {
    console.log(`Sending WhatsApp message to ${name} (${phone})`);
    
    if (!WAAPI_TOKEN || !INSTANCE_ID) {
      console.error('WhatsApp API configuration missing');
      return false;
    }
    
    // Format the phone number (remove any non-numeric characters except the + sign)
    const formattedPhone = phone.replace(/[^\d+]/g, '');
    
    // Replace placeholders in the message
    const formattedMessage = message
      .replace(/{{code}}/g, code)
      .replace(/{{link}}/g, eventLink)
      .replace(/{{name}}/g, name);
    
    // Send the message
    const response = await axios.post(
      `${WAAPI_BASE_URL}/instances/${INSTANCE_ID}/client/action/send-message`,
      {
        number: formattedPhone,
        message: formattedMessage
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${WAAPI_TOKEN}`
        },
        timeout: 30000 // 30 seconds timeout
      }
    );
    
    console.log('WhatsApp API response:', response.data);
    
    // Check if the message was sent successfully
    const success = response.data?.data?.status === 'success';
    
    if (success) {
      console.log(`WhatsApp confirmation message sent successfully to ${formattedPhone}`);
    } else {
      console.error(`Failed to send WhatsApp message to ${formattedPhone}:`, response.data);
    }
    
    return success;
  } catch (error) {
    // Check if it's a timeout error (504) - treat as success
    if (axios.isAxiosError(error) && (
      error.code === 'ECONNABORTED' || 
      error.response?.status === 504 ||
      error.message.includes('timeout')
    )) {
      console.log(`WhatsApp message to ${phone} timed out (504), but treating as success`);
      return true;
    }
    
    console.error(`Error sending WhatsApp message to ${phone}:`, error);
    return false;
  }
}

// Helper function to send email with fallback options
async function sendEmail(email: string, name: string, code: string, subject: string, htmlMessage: string, eventLink: string, imageBuffer?: Buffer): Promise<boolean> {
  try {
    console.log(`Sending email to ${name} (${email})`)
    
    // Add the image placeholder if not already present in the message
    let personalizedMessage = htmlMessage;
    if (imageBuffer && !htmlMessage.includes('{{image}}')) {
      personalizedMessage = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin: 20px 0;">
            <a href="${eventLink}#${code}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 14px 28px; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; text-decoration: none;">
              Confirm Your Attendance
            </a>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <img src="cid:invitation-image" alt="Invitation Image" style="max-width: 100%; height: auto;"/>
          </div>
          <div style="text-align: center; margin: 20px 0;">
            <p style="margin-bottom: 15px; font-size: 16px;">Click the "Confirm Your Attendance" button below to complete the form and secure your reservation. This will help us plan accordingly. Attendance is by invitation only, and submitting the completed form will grant you an access code for the event.</p>
            <p style="margin-bottom: 20px;"><a href="${eventLink}#${code}" style="color: #4CAF50; text-decoration: underline;">${eventLink}#${code}</a></p>
            <a href="${eventLink}#${code}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 14px 28px; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; text-decoration: none;">
              Confirm Your Attendance
            </a>
          </div>
        </div>
      `;
    }
    
    // Now replace template variables
    personalizedMessage = personalizedMessage
      .replace(/{{name}}/g, name)
      .replace(/{{code}}/g, code)
      .replace(/{{link}}/g, eventLink ? `${eventLink}#${code}` : `https://greenvites.online/jessegeorge#${code}`)
      .replace(/{{Image}}/g, '<img src="cid:invitation-image" alt="Invitation Image" style="max-width: 100%; height: auto;"/>')
      .replace(/{{image}}/g, '<img src="cid:invitation-image" alt="Invitation Image" style="max-width: 100%; height: auto;"/>');
    
    // Convert simple newlines to HTML breaks for plain text templates
    if (!personalizedMessage.includes('<div') && !personalizedMessage.includes('<p') && !personalizedMessage.includes('<br')) {
      personalizedMessage = personalizedMessage.replace(/\n/g, '<br>');
      personalizedMessage = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; text-align: center;">${personalizedMessage}</div>`;
    }
    
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
      console.error('SMTP configuration is incomplete. Missing host or port.');
      return false;
    }
    
    console.log(`SMTP Config: Host=${process.env.SMTP_HOST}, Port=${process.env.SMTP_PORT}, User=${process.env.SMTP_USER}, Secure=${process.env.SMTP_SECURE}`)
    
    const transportConfig: any = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      tls: {
        rejectUnauthorized: false
      }
    };
    
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transportConfig.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      };
    } else {
      console.warn('SMTP credentials missing - attempting to send without authentication');
      console.warn('Note: Most SMTP servers require authentication. This will likely fail.');
    }
    
    const transport = nodemailer.createTransport(transportConfig);

    try {
      await transport.verify();
      console.log('SMTP connection verified successfully');
    } catch (verifyError: any) {
      console.error('SMTP connection verification failed:', verifyError);
      console.error('Error details:', verifyError.message);
      
      if (verifyError.code === 'EAUTH') {
        console.error('SMTP authentication failed. Please check your credentials.');
        return false;
      }
      console.log('Attempting to send email anyway despite connection verification failure...');
    }

    // Use the original image buffer for emails - no resizing
    const mailOptions: any = {
      from: process.env.SMTP_FROM || (process.env.SMTP_USER ? `"Greenvites" <${process.env.SMTP_USER}>` : 'noreply@greenvites.com'),
      to: email,
      subject: subject,
      html: personalizedMessage,
    }

    if (imageBuffer) {
      console.log(`Using original image for email with size: ${imageBuffer.length} bytes`);
      console.log('Adding image attachment with CID: invitation-image');
      mailOptions.attachments = [
        {
          filename: 'invitation.jpg',
          content: imageBuffer,
          cid: 'invitation-image' // Same CID value as in the <img> tag
        }
      ]
    }

    try {
      const info = await transport.sendMail(mailOptions)
      console.log(`Email sent successfully to ${name} (${email}): ${info.messageId}`)
      return true
    } catch (sendError: any) {
      console.error(`Failed to send email to ${name}:`, sendError)
      console.error('Send error details:', sendError.message);
      
      if (sendError.response && sendError.response.status === 504) {
        console.log(`Email to ${email} received a 504 error, treating as successful`);
        await prisma.invite.create({
          data: {
            name,
            email,
            type: 'email',
            status: '504-error',
            errorMessage: '504 Gateway Timeout',
            code
          }
        });
        return true;
      }
      return false
    }
  } catch (error: any) {
    console.error(`Failed to send email to ${name}:`, error)
    console.error('Error message:', error.message);
    return false
  }
}

// Main WhatsApp sending function
async function sendWhatsApp(phone: string, name: string, code: string, message: string, eventLink: string, imageBuffer?: Buffer): Promise<boolean> {
  try {
    console.log(`Sending WhatsApp message to ${name} (${phone})`)
    
    const personalizedMessage = message
      .replace(/{{name}}/g, name)
      .replace(/{{code}}/g, code)
      .replace(/{{link}}/g, `${eventLink}#${code}`)
    
    const whatsappProvider = process.env.WHATSAPP_PROVIDER || 'whatsapp_api';
    
    console.log(`Using WhatsApp provider: ${whatsappProvider}`);
    
    if (whatsappProvider === 'whatsapp_api') {
      return sendWhatsAppMessage(phone, name, code, personalizedMessage, eventLink, imageBuffer);
    } else {
      return sendWhatsAppMessage(phone, name, code, personalizedMessage, eventLink, imageBuffer);
    }
  } catch (error) {
    console.error('WhatsApp sending error:', error);
    return false;
  }
}

// Helper function to generate a random code (fallback)
function generateRandomCode(length = 6): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters like 0, O, 1, I
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export async function POST(request: Request) {
  try {
    console.log('[POST /api/admin/send-invites] Processing invites...');
    
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('[POST /api/admin/send-invites] Unauthorized access attempt')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Process form data
    const formData = await request.formData();
    const recipientsJson = formData.get('recipients') as string;
    const subject = formData.get('subject') as string || 'Invitation to Jesse Oghenekome George\'s Church Dedication';
    const message = formData.get('message') as string || `
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
    const whatsappMessage = formData.get('whatsappMessage') as string || `You're invited to Jesse Oghenekome George's Church Dedication at RCCG Church, Champions Cathedral, #16-18 Airport Road, Effurun, Warri Delta, Nigeria. 10:00 AM, Sunday, April 13, 2025. Your code: {{code}}. Click the link below to complete the form and secure your reservation. This will help us plan accordingly. Attendance is by invitation only, and submitting the completed form will grant you an access code for the event. RSVP: {{link}}`;
    const eventLink = formData.get('eventLink') as string;
    const enableEmail = formData.get('enableEmail') === 'true';
    const enableWhatsApp = formData.get('enableWhatsApp') === 'true';
    const batchName = formData.get('batchName') as string || `Batch ${new Date().toISOString().split('T')[0]}`;
    
    // Log received form data
    console.log('[POST /api/admin/send-invites] Received form data:');
    console.log('- recipientsJson:', recipientsJson ? 'present' : 'missing');
    console.log('- subject:', subject || 'missing');
    console.log('- message:', message ? 'present' : 'missing');
    console.log('- whatsappMessage:', whatsappMessage ? 'present' : 'missing');
    console.log('- eventLink:', eventLink || 'missing');
    console.log('- enableEmail:', enableEmail);
    console.log('- enableWhatsApp:', enableWhatsApp);
    console.log('- batchName:', batchName);
    
    // Validate inputs
    const missingFields = [];
    if (!recipientsJson) missingFields.push('recipients');
    if (!subject) missingFields.push('subject');
    if (!message) missingFields.push('message');
    if (!eventLink) missingFields.push('eventLink');
    
    if (missingFields.length > 0) {
      console.error(`[POST /api/admin/send-invites] Missing required fields: ${missingFields.join(', ')}`);
      return NextResponse.json(
        { success: false, error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }
    
    let recipients: Recipient[];
    try {
      recipients = JSON.parse(recipientsJson);
    } catch (error) {
      console.error('Error parsing recipients JSON:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid recipients format' },
        { status: 400 }
      );
    }

    // Create a new batch for this group of invites
    const batch = await createBatch(batchName);
    console.log(`Created new batch: ${batch.id}`);

    const emailImageFile = formData.get('emailImage') as File | null
    
    // Fetch only available registration codes
    const availableRegistrationCodes = await getRegistrationCodes('available')
    console.log(`Found ${availableRegistrationCodes.length} available registration codes`)
    
    // Extract just the code values from the registration codes
    let availableCodes = availableRegistrationCodes.map((code: any) => code.code)
    
    // We'll verify each code before using it, so we might need more codes than initially thought
    // Request more codes to be safe
    const extraCodesBuffer = 5;
    if (availableCodes.length < recipients.length + extraCodesBuffer) {
      console.log(`Need to generate ${recipients.length + extraCodesBuffer - availableCodes.length} more registration codes`)
      const newCodes = await createRegistrationCodes(recipients.length + extraCodesBuffer - availableCodes.length)
      console.log(`Generated ${newCodes.count} new registration codes`)
      
      // Fetch the updated list of available codes
      const updatedRegistrationCodes = await getRegistrationCodes('available')
      availableCodes = updatedRegistrationCodes.map((code: any) => code.code)
      console.log(`Now have ${availableCodes.length} available registration codes`)
    }
    
    if (availableCodes.length < recipients.length) {
      return NextResponse.json(
        { success: false, error: `Not enough registration codes available. Need ${recipients.length}, but only have ${availableCodes.length}` },
        { status: 400 }
      )
    }

    let emailImageBuffer: Buffer | undefined
    if (emailImageFile) {
      const arrayBuffer = await emailImageFile.arrayBuffer()
      emailImageBuffer = Buffer.from(arrayBuffer)
    } else {
      try {
        const fs = require('fs');
        const path = require('path');
        const defaultImagePath = path.join(process.cwd(), 'public', 'jessegeorge.jpg');
        emailImageBuffer = fs.readFileSync(defaultImagePath);
        console.log('Using default image: jessegeorge.jpg');
      } catch (error) {
        console.error('Error loading default image:', error);
      }
    }

    const invitePromises = recipients.map(async (recipient: Recipient) => {
      try {
        const name = recipient.name || '';
        const email = recipient.email || '';
        const phone = recipient.phone || '';
        const type = recipient.type;
        
        // Initialize codeValue with a default
        let codeValue: string = generateRandomCode();
        let codeFound = false;
        
        // Try to find an available code that's not used by any active invite
        while (availableCodes.length > 0 && !codeFound) {
          const regCode = availableCodes.pop();
          if (!regCode) continue;
          
          // Check if this code is already used by a non-cancelled invite
          const isUsed = await isCodeUsedByActiveInvite(regCode);
          if (!isUsed) {
            codeValue = regCode;
            codeFound = true;
            
            // Mark the code as pending
            await markRegistrationCodeAsUsed(codeValue, 'pending');
            console.log(`[Invite to ${name}] Using registration code ${codeValue}`);
          } else {
            console.log(`[Invite to ${name}] Code ${regCode} is already used by an active invite, trying another one`);
          }
        }
        
        // If we couldn't find a code, we'll use the default random code initialized above
        if (!codeFound) {
          console.log(`[Invite to ${name}] No available codes found, using generated code ${codeValue}`);
        }
        
        const successfulChannels: string[] = [];
        let emailStatus: string | null = null;
        let whatsappStatus: string | null = null;
        let whatsappProvider: string | null = null;
        let errorMessage: string | null = null;

        if ((type === 'email' || type === 'both') && email && enableEmail) {
          try {
            const emailSuccess = await sendEmail(email, name, codeValue, subject, message, eventLink, emailImageBuffer);
            emailStatus = emailSuccess ? 'sent' : 'failed';
            if (emailSuccess) {
              successfulChannels.push('email');
            } else {
              errorMessage = (errorMessage ? errorMessage + '; ' : '') + 'Email sending failed';
            }
          } catch (error) {
            console.error(`Failed to send email to ${name}:`, error);
            emailStatus = 'failed';
            errorMessage = error instanceof Error ? error.message : 'Unknown email error';
          }
        }

        if ((type === 'whatsapp' || type === 'both') && phone && enableWhatsApp) {
          try {
            const whatsappSuccess = await sendWhatsApp(phone, name, codeValue, whatsappMessage, eventLink, emailImageBuffer);
            whatsappStatus = whatsappSuccess ? 'sent' : 'failed';
            whatsappProvider = process.env.WHATSAPP_PROVIDER || 'whatsapp_api';
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
              console.log(`WhatsApp message to ${phone} timed out (504), but treating as success`);
              whatsappStatus = 'sent';
              whatsappProvider = process.env.WHATSAPP_PROVIDER || 'whatsapp_api';
              successfulChannels.push('whatsapp');
            } else {
              console.error(`Failed to send WhatsApp message to ${name}:`, error);
              whatsappStatus = 'failed';
              errorMessage = (errorMessage ? errorMessage + '; ' : '') + (error instanceof Error ? error.message : 'Unknown WhatsApp error');
            }
          }
        }

        // Always consider the invite as successful if at least one channel worked
        // or if we want to record the attempt even if all channels failed
        let status = 'pending';
        if (successfulChannels.length > 0) {
          status = successfulChannels.length === (type === 'both' ? 2 : 1) ? 'sent' : 'partial';
          
          if (status === 'sent' || status === 'partial') {
            try {
              await markRegistrationCodeAsUsed(codeValue, 'invite-sent');
            } catch (markError) {
              console.error(`Failed to mark code ${codeValue} as used:`, markError);
              // Continue despite the error
            }
          }
        } else {
          status = 'failed';
        }
        
        // Create the invite with batch ID
        const invite = await prisma.invite.create({
          data: {
            name,
            email,
            phone,
            sent: successfulChannels.length > 0,
            sentAt: new Date(),
            type,
            status,
            emailStatus,
            whatsappStatus,
            whatsappProvider,
            errorMessage,
            code: codeValue,
            batchId: batch.id
          }
        });
        
        return invite;
      } catch (error) {
        console.error(`Failed to process invite for ${recipient.name}:`, error)
        return Promise.reject(error)
      }
    });

    const results = await Promise.allSettled(invitePromises);

    // Update the batch status
    await updateBatchStatus(batch.id);

    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');
    
    const successfulInvites = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);
    
    if (failures.length > 0) {
      console.error('[POST /api/admin/send-invites] Some invites failed:', failures);
      
      if (failures.length === recipients.length) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'All invites failed to send. Please check your WhatsApp and email configuration.', 
            failures,
            batchId: batch.id
          },
          { status: 500 }
        );
      }
      
      return NextResponse.json({ 
        success: true,
        message: `Successfully sent ${successfulInvites.length} out of ${recipients.length} invites`,
        sentInvites: successfulInvites,
        failedCount: failures.length,
        failureReasons: failures.map(failure => failure.reason),
        batchId: batch.id
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${successfulInvites.length} invites`,
      sentInvites: successfulInvites,
      failedCount: failures.length,
      failureReasons: failures.map(failure => failure.reason),
      batchId: batch.id
    });
  } catch (error) {
    console.error('[POST /api/admin/send-invites] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to send invites',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      },
      { status: 500 }
    );
  }
}
