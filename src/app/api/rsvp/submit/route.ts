import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import nodemailer from 'nodemailer';
import axios from 'axios';

const prisma = new PrismaClient();

// WhatsApp API configuration
const WAAPI_TOKEN = process.env.WAAPI_TOKEN;
const WAAPI_BASE_URL = process.env.WAAPI_BASE_URL || 'https://waapi.app/api/v1';
const INSTANCE_ID = process.env.WAAPI_INSTANCE_ID;

// Helper function to send confirmation email
async function sendConfirmationEmail(email: string, name: string): Promise<boolean> {
  try {
    console.log(`Sending confirmation email to ${name} (${email})`);
    
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
      console.log('SMTP connection verified successfully');
    } catch (verifyError: any) {
      console.error('SMTP connection verification failed:', verifyError.message);
      console.log('Attempting to send email anyway despite connection verification failure...');
    }
    
    const mailOptions: any = {
      from: process.env.SMTP_FROM || (process.env.SMTP_USER ? `"Greenvites" <${process.env.SMTP_USER}>` : 'noreply@greenvites.com'),
      to: email,
      subject: 'RSVP Confirmation - Jesse Oghenekome George\'s Church Dedication',
      html: confirmationMessage,
    };
    
    try {
      const info = await transport.sendMail(mailOptions);
      console.log(`Confirmation email sent successfully to ${name} (${email}): ${info.messageId}`);
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

// Helper function to send WhatsApp confirmation message
async function sendWhatsAppConfirmation(phone: string, name: string): Promise<boolean> {
  try {
    console.log(`Sending WhatsApp confirmation to ${name} (${phone})`);
    
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
    
    if (!WAAPI_TOKEN || !INSTANCE_ID) {
      console.error('WhatsApp API configuration is incomplete. Token or Instance ID missing.');
      return false; 
    }
    
    const message = `Dear ${name}, thank you for confirming your attendance to Jesse Oghenekome George's Church Dedication. Your RSVP has been successfully received. We will send you further details about the event soon. We look forward to celebrating this special occasion with you.`;
    
    const textPayload = {
      chatId: formattedPhone+'@c.us',
      message: message
    };
    
    try {
      const textResponse = await axios.post(
        `${WAAPI_BASE_URL}/instances/${INSTANCE_ID}/client/action/send-message`, 
        textPayload, 
        {
          headers: {
            'Authorization': `Bearer ${WAAPI_TOKEN}`,
            'Content-Type': 'application/json'
          },
          timeout: 5000 
        }
      );
      
      console.log('WhatsApp API response:', JSON.stringify(textResponse.data));
      
      if (textResponse.data && textResponse.data.data && textResponse.data.data.status === 'success') {
        console.log(`WhatsApp confirmation message sent successfully to ${formattedPhone}`);
        return true;
      } else {
        const errorMessage = textResponse.data?.data?.message || 'Unknown error';
        console.error(`Failed to send WhatsApp confirmation: ${errorMessage}`);
        return false;
      }
    } catch (apiError: any) {
      console.error('WhatsApp API request failed:', apiError.message);
      console.error('Error details:', apiError.response?.data || 'No response data');
      return false; 
    }
  } catch (error: any) {
    console.error('Error in WhatsApp confirmation function:', error.message);
    return false; 
  }
}

export async function POST(request: NextRequest) {
  try {
    let requestData;
    try {
      requestData = await request.json();
    } catch (jsonError) {
      console.error('Error parsing request JSON:', jsonError);
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid JSON in request body' 
        },
        { status: 400 }
      );
    }

    const { name, email, phone, hasGuest, hasDriver, hasAide, code } = requestData;

    if (!name || !email || !code) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Name, email, and registration code are required' 
        },
        { status: 400 }
      );
    }

    // Find the registration code in the database
    const registrationCode = await prisma.registrationCode.findUnique({
      where: { code },
      include: { rsvp: true, invite: true }
    });

    // Check if code exists
    if (!registrationCode) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid registration code' 
        },
        { status: 400 }
      );
    }

    console.log('Registration code found:', JSON.stringify({
      id: registrationCode.id,
      code: registrationCode.code,
      used: registrationCode.used,
      status: registrationCode.status,
      hasInvite: !!registrationCode.invite,
      inviteType: registrationCode.invite?.type
    }));

    // Check if code has already been used
    if (registrationCode.used || registrationCode.rsvp) {
      return NextResponse.json(
        { 
          success: false,
          error: 'This registration code has already been used' 
        },
        { status: 400 }
      );
    }

    // Check if code is available - both 'available' and 'invite-sent' status should be valid for RSVP
    // Cast to any to access the status field which might not be in the TypeScript type yet
    const regCodeWithStatus = registrationCode as any;
    if (regCodeWithStatus.status && 
        regCodeWithStatus.status !== 'available' && 
        regCodeWithStatus.status !== 'invite-sent') {
      return NextResponse.json(
        { 
          success: false,
          error: 'This registration code is not available for use' 
        },
        { status: 400 }
      );
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
        console.log(`Sending confirmation email to ${email}`);
        emailSent = await sendConfirmationEmail(email, name);
        console.log(`Confirmation email sent: ${emailSent}`);
      } else {
        console.log('No email provided, skipping email confirmation');
      }
      
      // Send WhatsApp confirmation if phone is provided
      if (phone) {
        console.log(`Sending WhatsApp confirmation to ${phone}`);
        whatsappSent = await sendWhatsAppConfirmation(phone, name);
        console.log(`WhatsApp confirmation sent: ${whatsappSent}`);
      } else {
        console.log('No phone provided, skipping WhatsApp confirmation');
      }
      
      // Log confirmation status
      console.log(`Confirmation status: Email: ${emailSent}, WhatsApp: ${whatsappSent}`);
      
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
