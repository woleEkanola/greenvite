import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createRegistrationCodes, getRegistrationCodes, markRegistrationCodeAsUsed } from '@/lib/db'
import nodemailer from 'nodemailer'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'; // Import axios for Termii API
import { prisma } from '@/lib/prisma'; // Import prisma

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
async function sendWhatsAppMessage(phone: string, name: string, code: string, message: string, eventLink: string): Promise<boolean> {
  try {
    console.log(`Sending WhatsApp message to ${name} (${phone})`)
    
    // Format the phone number to always start with 234 and remove any leading +
    let formattedPhone = phone.replace(/\s+/g, '').replace(/^\+/, '');
    if (!formattedPhone.startsWith('234')) {
      // Default to Nigeria country code if not specified
      formattedPhone = '234' + formattedPhone.replace(/^0+/, '');
    }

    // Validate the phone number format
    if (!formattedPhone.startsWith('234') || formattedPhone.length !== 13) {
      console.error(`Invalid phone number format: ${phone} (formatted to ${formattedPhone}). Must be a Nigerian number starting with 234.`);
      return false;
    }
    
    console.log(`Sending WhatsApp message to: ${formattedPhone} (original: ${phone})`);

    // Prepare the request payload for WhatsApp API
    const payload = {
       chatId: formattedPhone+'@c.us',
      message: message,
    };

    // Send WhatsApp message using WhatsApp API
    try {
      if (!WAAPI_TOKEN) {
        console.error('WhatsApp API token is not configured');
        throw new Error('WhatsApp API token is not configured');
      }
      
      const response = await axios.post( `${WAAPI_BASE_URL}/instances/${INSTANCE_ID}/client/action/send-message`, payload, {
     
        headers: {
          'Authorization': `Bearer ${WAAPI_TOKEN}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('WhatsApp API response:', JSON.stringify(response.data));

      if (response.data && response.data.data && response.data.data.status === 'success') {
        console.log(`WhatsApp message sent successfully to ${formattedPhone}`);
        return true;
      } else {
        const errorMessage = response.data?.data?.message || 'Unknown error';
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

// Helper function to generate a random registration code
function generateRandomCode(length = 6): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing characters like 0, O, 1, I
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Helper function to send email with fallback options
async function sendEmail(email: string, name: string, code: string, subject: string, htmlMessage: string, eventLink: string, imageBuffer?: Buffer): Promise<boolean> {
  try {
    console.log(`Sending email to ${name} (${email})`)
    
    // Replace placeholders in the message
    const personalizedMessage = htmlMessage
      .replace(/{{name}}/g, name)
      .replace(/{{code}}/g, code)
      .replace(/{{link}}/g, `${eventLink}#${code}`) // Update the link format
    
    // Check if SMTP credentials are properly configured
    if (!process.env.SMTP_HOST || !process.env.SMTP_PORT) {
      console.error('SMTP configuration is incomplete. Missing host or port.');
      return false;
    }
    
    // Log SMTP configuration for debugging (without password)
    console.log(`SMTP Config: Host=${process.env.SMTP_HOST}, Port=${process.env.SMTP_PORT}, User=${process.env.SMTP_USER}, Secure=${process.env.SMTP_SECURE}`)
    
    // Create a transport with environment variables
    const transportConfig: any = {
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      tls: {
        rejectUnauthorized: false
      }
    };
    
    // Only add auth if both username and password are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transportConfig.auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      };
    } else {
      console.warn('SMTP credentials missing - attempting to send without authentication');
      // For many SMTP servers, authentication is required
      console.warn('Note: Most SMTP servers require authentication. This will likely fail.');
    }
    
    const transport = nodemailer.createTransport(transportConfig);

    // Try to verify SMTP connection
    try {
      await transport.verify();
      console.log('SMTP connection verified successfully');
    } catch (verifyError: any) {
      console.error('SMTP connection verification failed:', verifyError);
      console.error('Error details:', verifyError.message);
      
      // If this is an authentication error, we should abort
      if (verifyError.code === 'EAUTH') {
        console.error('SMTP authentication failed. Please check your credentials.');
        return false;
      }
      
      console.log('Attempting to send email anyway despite connection verification failure...');
    }

    // Prepare email data
    const mailOptions: any = {
      from: process.env.SMTP_FROM || (process.env.SMTP_USER ? `"Greenvites" <${process.env.SMTP_USER}>` : 'noreply@greenvites.com'),
      to: email,
      subject: subject,
      html: personalizedMessage,
    }

    // Add attachment if image buffer is provided
    if (imageBuffer) {
      mailOptions.attachments = [
        {
          filename: 'invitation.jpg',
          content: imageBuffer,
          cid: 'invitation-image' // Content ID for referencing in HTML
        }
      ]
    }

    // Send the email
    try {
      const info = await transport.sendMail(mailOptions)
      console.log(`Email sent successfully to ${name} (${email}): ${info.messageId}`)
      return true
    } catch (sendError: any) {
      console.error(`Failed to send email to ${name}:`, sendError)
      console.error('Send error details:', sendError.message)
      
      if (sendError.code === 'EAUTH') {
        console.error('SMTP authentication failed. Please check your credentials in the .env file.');
      } else if (sendError.code === 'ESOCKET') {
        console.error('SMTP connection error. Please check your SMTP host and port settings.');
      } else if (sendError.code === 'ETIMEDOUT') {
        console.error('SMTP connection timed out. Please check your SMTP host and port settings.');
      }
      
      return false
    }
  } catch (error: any) {
    console.error(`Failed to send email to ${name}:`, error)
    console.error('Error message:', error.message)
    // Don't throw the error, just return false to indicate failure
    return false
  }
}

// Main WhatsApp sending function
async function sendWhatsApp(phone: string, name: string, code: string, message: string, eventLink: string): Promise<boolean> {
  try {
    console.log(`Sending WhatsApp message to ${name} (${phone})`)
    
    // Replace placeholders in the message
    const personalizedMessage = message
      .replace(/{{name}}/g, name)
      .replace(/{{code}}/g, code)
      .replace(/{{link}}/g, `${eventLink}#${code}`)
    
    // Determine which WhatsApp provider to use based on environment variable
    const whatsappProvider = process.env.WHATSAPP_PROVIDER || 'whatsapp_api';
    
    console.log(`Using WhatsApp provider: ${whatsappProvider}`);
    
    if (whatsappProvider === 'whatsapp_api') {
      return sendWhatsAppMessage(phone, name, code, personalizedMessage, eventLink);
    } else {
      // Default to WhatsApp API
      return sendWhatsAppMessage(phone, name, code, personalizedMessage, eventLink);
    }
  } catch (error) {
    console.error('WhatsApp sending error:', error);
    // Return false instead of throwing to allow the process to continue
    return false;
  }
}

// ... rest of the code remains the same ...

interface Recipient {
  name: string
  email?: string
  phone?: string
  type: 'email' | 'whatsapp' | 'both'
}

interface RegistrationCode {
  id: string;
  code: string;
  used: boolean;
  createdAt: string;
  rsvp: any | null;
}

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('[POST /api/admin/send-invites] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse the multipart form data
    const formData = await request.formData()
    
    // Get message settings
    const emailSubject = formData.get('emailSubject') as string || 'Invitation to Jesse Oghenekome George\'s Church Dedication'
    const emailMessage = formData.get('emailMessage') as string || `
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
          <p style="text-align: center; font-size: 18px;">Saturday, April 13, 2025</p>
        </div>
        
        <div style="margin: 30px 0; text-align: center;">
          <p>Your personal registration code is: <strong>{{code}}</strong></p>
          <a href="{{link}}" style="display: inline-block; background-color: #16a085; color: white; padding: 12px 25px; text-decoration: none; border-radius: 4px; font-weight: bold;">Confirm Your Attendance</a>
          <p style="margin-top: 15px; font-size: 14px; color: #7f8c8d;">Please click the button above to confirm your attendance or visit <a href="{{link}}" style="color: #16a085;">{{link}}</a></p>
        </div>
        
        <p style="text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 14px;">We look forward to celebrating this special occasion with you.</p>
      </div>
    `
    const whatsappMessage = formData.get('whatsappMessage') as string || `You're invited to Jesse Oghenekome George's Church Dedication at RCCG Church, Champions Cathedral, #16-18 Airport Road, Effurun, Warri Delta, Nigeria. 10:00 AM, Saturday, April 13, 2025. Your code: {{code}}. RSVP: {{link}}`
    const eventLink = formData.get('eventLink') as string || ''
    const enableEmail = formData.get('enableEmail') === 'true'
    const enableWhatsApp = formData.get('enableWhatsApp') === 'true'
    const emailImageFile = formData.get('emailImage') as File | null
    
    // Get recipients
    const recipientsJson = formData.get('recipients') as string
    if (!recipientsJson) {
      return NextResponse.json(
        { error: 'No recipients provided' },
        { status: 400 }
      )
    }
    
    const recipients = JSON.parse(recipientsJson) as Recipient[]
    
    if (!Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { error: 'Invalid recipients data' },
        { status: 400 }
      )
    }

    // Process email image if provided
    let emailImageBuffer: Buffer | undefined
    if (emailImageFile) {
      const arrayBuffer = await emailImageFile.arrayBuffer()
      emailImageBuffer = Buffer.from(arrayBuffer)
    } else {
      // Use default jessegeorge.jpg image if no custom image is provided
      try {
        const fs = require('fs');
        const path = require('path');
        const defaultImagePath = path.join(process.cwd(), 'public', 'jessegeorge.jpg');
        emailImageBuffer = fs.readFileSync(defaultImagePath);
        console.log('Using default image: jessegeorge.jpg');
      } catch (error) {
        console.error('Error loading default image:', error);
        // Continue without image if there's an error
      }
    }

    // Get available registration codes
    console.log('Getting available registration codes')
    const registrationCodes = await getRegistrationCodes()
    console.log(`Found ${registrationCodes.length} registration codes`)
    
    // Filter for available codes only
    // Exclude codes that are used or have already been sent as invites
    let availableCodes = registrationCodes
      .filter((code: any) => {
        // Check if the code is not used and has a status of 'available'
        // This ensures codes with 'invite-sent' status are not reused
        return !code.used && (!code.status || code.status === 'available');
      })
      .map((code: any) => code.code)
    console.log(`Found ${availableCodes.length} available registration codes`)
    
    // If we don't have enough codes, generate more
    if (availableCodes.length < recipients.length) {
      console.log(`Need to generate ${recipients.length - availableCodes.length} more registration codes`)
      const newCodes = await createRegistrationCodes(recipients.length - availableCodes.length)
      console.log(`Generated ${newCodes.count} new registration codes`)
      
      // Get updated list of available codes
      const updatedRegistrationCodes = await getRegistrationCodes()
      availableCodes = updatedRegistrationCodes
        .filter((code: any) => {
          return !code.used && (!code.status || code.status === 'available');
        })
        .map((code: any) => code.code)
      console.log(`Now have ${availableCodes.length} available registration codes`)
    }
    
    if (availableCodes.length < recipients.length) {
      return NextResponse.json(
        { error: `Not enough registration codes available. Need ${recipients.length}, but only have ${availableCodes.length}` },
        { status: 400 }
      )
    }

    // Process each recipient
    const invitePromises = recipients.map(async (recipient) => {
      try {
        // Ensure all fields are strings to avoid TypeScript errors
        const name = recipient.name || '';
        const email = recipient.email || '';
        const phone = recipient.phone || '';
        const type = recipient.type;
        
        // Get a registration code from the available codes
        let codeValue: string;
        if (availableCodes.length > 0) {
          const regCode = availableCodes.pop();
          codeValue = regCode ? regCode : generateRandomCode();
          
          // Mark the code as pending initially
          await markRegistrationCodeAsUsed(codeValue, 'pending');
        } else {
          codeValue = generateRandomCode();
        }
        
        // Track channels that were successfully sent
        const successfulChannels: string[] = [];
        let emailStatus: string | null = null;
        let whatsappStatus: string | null = null;
        let whatsappProvider: string | null = null;
        let errorMessage: string | null = null;

        // Send email if requested
        if ((type === 'email' || type === 'both') && email && enableEmail) {
          try {
            const emailSuccess = await sendEmail(email, name, codeValue, emailSubject, emailMessage, eventLink, emailImageBuffer);
            emailStatus = emailSuccess ? 'sent' : 'failed';
            if (emailSuccess) {
              successfulChannels.push('email');
            } else {
              errorMessage = 'Email sending failed';
            }
          } catch (error) {
            console.error(`Failed to send email to ${name}:`, error);
            emailStatus = 'failed';
            errorMessage = error instanceof Error ? error.message : 'Unknown email error';
          }
        }

        // Send WhatsApp message if requested
        if ((type === 'whatsapp' || type === 'both') && phone && enableWhatsApp) {
          try {
            const whatsappSuccess = await sendWhatsApp(phone, name, codeValue, whatsappMessage, eventLink);
            whatsappStatus = whatsappSuccess ? 'sent' : 'failed';
            whatsappProvider = process.env.WHATSAPP_PROVIDER || 'whatsapp_api';
            if (whatsappSuccess) {
              successfulChannels.push('whatsapp');
            } else {
              errorMessage = (errorMessage ? errorMessage + '; ' : '') + 'WhatsApp sending failed';
            }
          } catch (error) {
            console.error(`Failed to send WhatsApp message to ${name}:`, error);
            whatsappStatus = 'failed';
            errorMessage = (errorMessage ? errorMessage + '; ' : '') + (error instanceof Error ? error.message : 'Unknown WhatsApp error');
          }
        }

        // If at least one channel was successful, or we want to record failures
        if (successfulChannels.length > 0 || true) { // Always create a record, even for failures
          // Determine overall status
          let status = 'pending';
          if (successfulChannels.length > 0) {
            status = successfulChannels.length === (type === 'both' ? 2 : 1) ? 'sent' : 'partial';
            
            // Mark the registration code as invite-sent if the invite was successfully sent
            if (status === 'sent' || status === 'partial') {
              await markRegistrationCodeAsUsed(codeValue, 'invite-sent');
            }
          } else {
            status = 'failed';
            
            // If the invite failed completely, mark the code as available again
            await markRegistrationCodeAsUsed(codeValue, 'available');
          }
          
          // Create the invite record - using the raw SQL approach to bypass Prisma type issues
          const invite = await prisma.$queryRaw`
            INSERT INTO "Invite" (
              "id", "name", "email", "phone", "sent", "sentAt", "type", 
              "status", "emailStatus", "whatsappStatus", "whatsappProvider", "errorMessage", "code",
              "createdAt", "updatedAt"
            ) 
            VALUES (
              ${uuidv4()}, ${name}, ${email}, ${phone}, ${successfulChannels.length > 0}, 
              ${new Date()}, ${type}, ${status}, ${emailStatus}, ${whatsappStatus}, 
              ${whatsappProvider}, ${errorMessage}, ${codeValue}, ${new Date()}, ${new Date()}
            )
            RETURNING *
          `
          
          // Return the first result from the raw query
          return Array.isArray(invite) ? invite[0] : invite
        } else {
          throw new Error(`No successful channels to send invite to ${name}`)
        }
      } catch (error) {
        console.error(`Failed to process invite for ${recipient.name}:`, error)
        return Promise.reject(error)
      }
    })

    // Wait for all invites to be processed
    const results = await Promise.allSettled(invitePromises)

    // Check for any failures
    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    
    // Process successful invites
    const successfulInvites = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value as { 
        name: string, 
        email?: string | undefined, 
        phone?: string | undefined, 
        code: string, 
        channels: string,
        whatsappStatus: string | null,
        emailStatus: string | null,
        whatsappProvider: string | null,
        errorMessage: string | null
      });
    
    if (failures.length > 0) {
      console.error('[POST /api/admin/send-invites] Some invites failed:', failures)
      
      // If all invites failed
      if (failures.length === recipients.length) {
        return NextResponse.json(
          { error: 'All invites failed to send. Please check your WhatsApp and email configuration.', failures },
          { status: 500 }
        )
      }
      
      // If some invites succeeded but others failed
      return NextResponse.json({ 
        success: true,
        message: `Successfully sent ${successfulInvites.length} out of ${recipients.length} invites`,
        sentInvites: successfulInvites.map(invite => ({
          name: invite.name,
          email: invite.email,
          phone: invite.phone,
          code: invite.code,
          channels: invite.channels,
          whatsappStatus: invite.whatsappStatus,
          emailStatus: invite.emailStatus,
          whatsappProvider: invite.whatsappProvider,
          errorMessage: invite.errorMessage
        })),
        failedCount: failures.length,
        failureReasons: failures.map(failure => failure.reason)
      })
    }

    return NextResponse.json({
      success: true,
      message: `Successfully sent ${successfulInvites.length} invites`,
      sentInvites: successfulInvites.map(invite => ({
        name: invite.name,
        email: invite.email,
        phone: invite.phone,
        code: invite.code,
        channels: invite.channels,
        whatsappStatus: invite.whatsappStatus,
        emailStatus: invite.emailStatus,
        whatsappProvider: invite.whatsappProvider,
        errorMessage: invite.errorMessage
      })),
      failedCount: failures.length,
      failureReasons: failures.map(failure => failure.reason)
    })
  } catch (error) {
    console.error('[POST /api/admin/send-invites] Error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send invites' },
      { status: 500 }
    )
  }
}
