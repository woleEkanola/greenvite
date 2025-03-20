import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createRegistrationCodes, getRegistrationCodes, markRegistrationCodeAsUsed } from '@/lib/db'
import nodemailer from 'nodemailer'
import { v4 as uuidv4 } from 'uuid'
import axios from 'axios'; // Import axios for Termii API
import { prisma } from '@/lib/prisma'; // Import prisma
import sharp from 'sharp'

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
    
    // Check that we have a valid international format
    const validPhoneRegex = /^(1|234)\d{10}$/;
    if (!validPhoneRegex.test(formattedPhone)) {
      console.error(`Invalid phone number format: ${phone} (formatted to ${formattedPhone}). Must be a US or Nigerian number.`);
      return false;
    }
    
    console.log(`Sending WhatsApp message to: ${formattedPhone} (original: ${phone})`);

    if (!WAAPI_TOKEN || !INSTANCE_ID || !WAAPI_BASE_URL) {
      console.error('WhatsApp API configuration is incomplete. Missing token, instance ID, or base URL.');
      return false; // Return false instead of throwing an error
    }

    // Track if message was sent successfully
    let messageSent = false;
    
    // Resize the image to reduce payload size
    let resizedImageBuffer;
    if (imageBuffer) {
      try {
        resizedImageBuffer = await sharp(imageBuffer)
          .resize({ width: 800 }) // Resize to width of 800px, maintaining aspect ratio
          .jpeg({ quality: 80 }) // Compress as JPEG with 80% quality
          .toBuffer();
        
        console.log(`Original image size: ${imageBuffer.length} bytes, Resized image size: ${resizedImageBuffer.length} bytes`);
      } catch (resizeError) {
        console.error('Error resizing image:', resizeError);
        // Continue without the image if resizing fails
      }
    }

    // Send the media message with caption
    if (resizedImageBuffer) {
      try {
        console.log('Sending WhatsApp media message...');
        
        // According to https://waapi.readme.io/reference/post_instances-id-client-action-send-media
        const mediaPayload = {
          chatId: formattedPhone+'@c.us',
          mediaBase64: resizedImageBuffer.toString('base64'),
          mediaName: 'invitation.jpg',
          mediaCaption: message
        };

        const mediaResponse = await axios.post(
          `${WAAPI_BASE_URL}/instances/${INSTANCE_ID}/client/action/send-media`, 
          mediaPayload, 
          {
            headers: {
              'Authorization': `Bearer ${WAAPI_TOKEN}`,
              'Content-Type': 'application/json'
            },
            timeout: 15000 // 15 second timeout
          }
        );
        
        console.log('WhatsApp Media API response:', JSON.stringify(mediaResponse.data));

        if (mediaResponse.data && mediaResponse.data.data && mediaResponse.data.data.status === 'success') {
          console.log(`WhatsApp media message sent successfully to ${formattedPhone}`);
          messageSent = true;
        } else {
          const errorMessage = mediaResponse.data?.data?.message || 'Unknown error';
          console.error(`Failed to send WhatsApp media: ${errorMessage}`);
        }
      } catch (mediaError: any) {
        console.error('WhatsApp Media API error:', mediaError.message);
        console.error('Error details:', mediaError.response?.data || 'No response data');
        
        if (mediaError.response && mediaError.response.status === 504) {
          console.log(`WhatsApp media message to ${formattedPhone} received a 504 error, treating as successful`);
          try {
            await prisma.invite.create({
              data: {
                name,
                phone,
                type: 'whatsapp-media',
                status: '504-error',
                errorMessage: '504 Gateway Timeout',
                code
              }
            });
          } catch (dbError) {
            console.error('Error logging 504 error to database:', dbError);
          }
          messageSent = true;
        }
      }
    }
    
    // If media message failed or no image was provided, try sending a text-only message
    if (!messageSent) {
      try {
        console.log(resizedImageBuffer ? 'Media message failed. Trying text message...' : 'No image provided. Sending WhatsApp text message...');
        
        const textPayload = {
          chatId: formattedPhone+'@c.us',
          message: message
        };

        const textResponse = await axios.post(
          `${WAAPI_BASE_URL}/instances/${INSTANCE_ID}/client/action/send-message`, 
          textPayload, 
          {
            headers: {
              'Authorization': `Bearer ${WAAPI_TOKEN}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000 // 10 second timeout
          }
        );
        
        console.log('WhatsApp Text API response:', JSON.stringify(textResponse.data));

        if (textResponse.data && textResponse.data.data && textResponse.data.data.status === 'success') {
          console.log(`WhatsApp text message sent successfully to ${formattedPhone}`);
          messageSent = true;
        } else {
          const errorMessage = textResponse.data?.data?.message || 'Unknown error';
          console.error(`Failed to send WhatsApp text message: ${errorMessage}`);
        }
      } catch (textError: any) {
        console.error('WhatsApp Text API error:', textError.message);
        console.error('Error details:', textError.response?.data || 'No response data');
        
        if (textError.response && textError.response.status === 504) {
          console.log(`WhatsApp text message to ${formattedPhone} received a 504 error, treating as successful`);
          try {
            await prisma.invite.create({
              data: {
                name,
                phone,
                type: 'whatsapp-text',
                status: '504-error',
                errorMessage: '504 Gateway Timeout',
                code
              }
            });
          } catch (dbError) {
            console.error('Error logging 504 error to database:', dbError);
          }
          messageSent = true;
        }
      }
    }

    // Return true if message was sent successfully
    return messageSent;
  } catch (error: any) {
    console.error('WhatsApp API general error:', error.message);
    
    if (error.response && error.response.status === 504) {
      console.log(`WhatsApp message to ${phone} received a 504 error, treating as successful`);
      try {
        await prisma.invite.create({
          data: {
            name,
            phone,
            type: 'whatsapp',
            status: '504-error',
            errorMessage: '504 Gateway Timeout',
            code
          }
        });
      } catch (dbError) {
        console.error('Error logging 504 error to database:', dbError);
      }
      return true;
    }
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
    console.log('[POST /api/admin/send-invites] Processing invites...');
    
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('[POST /api/admin/send-invites] Unauthorized access attempt')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Process form data
    const formData = await request.formData();
    const recipientsJson = formData.get('recipients') as string;
    const subject = formData.get('subject') as string;
    const message = formData.get('message') as string;
    const whatsappMessage = formData.get('whatsappMessage') as string;
    const eventLink = formData.get('eventLink') as string;
    const enableEmail = formData.get('enableEmail') === 'true';
    const enableWhatsApp = formData.get('enableWhatsApp') === 'true';
    
    // Validate inputs
    if (!recipientsJson || !subject || !message || !eventLink) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    let recipients;
    try {
      recipients = JSON.parse(recipientsJson);
    } catch (error) {
      console.error('Error parsing recipients JSON:', error);
      return NextResponse.json(
        { success: false, error: 'Invalid recipients format' },
        { status: 400 }
      );
    }

    const emailImageFile = formData.get('emailImage') as File | null
    
    const registrationCodes = await getRegistrationCodes()
    console.log(`Found ${registrationCodes.length} registration codes`)
    
    let availableCodes = registrationCodes
      .filter((code: any) => {
        return !code.used && (!code.status || code.status === 'available');
      })
      .map((code: any) => code.code)
    console.log(`Found ${availableCodes.length} available registration codes`)
    
    if (availableCodes.length < recipients.length) {
      console.log(`Need to generate ${recipients.length - availableCodes.length} more registration codes`)
      const newCodes = await createRegistrationCodes(recipients.length - availableCodes.length)
      console.log(`Generated ${newCodes.count} new registration codes`)
      
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

    const invitePromises = recipients.map(async (recipient) => {
      try {
        const name = recipient.name || '';
        const email = recipient.email || '';
        const phone = recipient.phone || '';
        const type = recipient.type;
        
        let codeValue: string;
        if (availableCodes.length > 0) {
          const regCode = availableCodes.pop();
          codeValue = regCode ? regCode : generateRandomCode();
          
          await markRegistrationCodeAsUsed(codeValue, 'pending');
        } else {
          codeValue = generateRandomCode();
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
            console.error(`Failed to send WhatsApp message to ${name}:`, error);
            whatsappStatus = 'failed';
            errorMessage = (errorMessage ? errorMessage + '; ' : '') + (error instanceof Error ? error.message : 'Unknown WhatsApp error');
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
        
        return Array.isArray(invite) ? invite[0] : invite
      } catch (error) {
        console.error(`Failed to process invite for ${recipient.name}:`, error)
        return Promise.reject(error)
      }
    })

    const results = await Promise.allSettled(invitePromises)

    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected')
    
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
      
      if (failures.length === recipients.length) {
        return NextResponse.json(
          { success: false, error: 'All invites failed to send. Please check your WhatsApp and email configuration.', failures },
          { status: 500 }
        )
      }
      
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
