import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail as sendEmailResend } from '@/lib/resend-email';
import axios from 'axios';

const prisma = new PrismaClient();

async function sendSMSAfricasTalking(phone: string, name: string, message: string): Promise<boolean> {
  try {
    console.log(`Sending SMS via Africa's Talking to ${name} (${phone})`)
    
    if (!process.env.AT_API_KEY || !process.env.AT_USERNAME) {
      console.error('Africa\'s Talking credentials not found');
      return false;
    }
    
    let formattedPhone = phone.replace(/\s+/g, '')
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+234' + formattedPhone.replace(/^0+/, '')
    }
    
    const personalizedMessage = message
      .replace(/{{name}}/g, name)
    
    const africastalking = require('africastalking')({
      apiKey: process.env.AT_API_KEY,
      username: process.env.AT_USERNAME,
    });

    const sms = africastalking.SMS;
    
    if (!formattedPhone.startsWith('+234') || formattedPhone.length !== 14) {
      console.error(`Invalid phone number format: ${phone} (formatted to ${formattedPhone}). Must be a Nigerian number in international format.`);
      return false;
    }
    
    console.log(`Sending SMS via Africa's Talking to: ${formattedPhone} (original: ${phone})`);

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

async function sendSMSTermii(phone: string, name: string, message: string): Promise<boolean> {
  try {
    console.log(`Sending SMS via Termii to ${name} (${phone})`)
    
    let formattedPhone = phone.replace(/\s+/g, '')
    if (!formattedPhone.startsWith('+')) {
      formattedPhone = '+234' + formattedPhone.replace(/^0+/, '')
    }
    
    formattedPhone = formattedPhone.replace('+', '')
    
    const personalizedMessage = message
      .replace(/{{name}}/g, name)
    
    if (!formattedPhone.startsWith('234') || formattedPhone.length !== 13) {
      console.error(`Invalid phone number format: ${phone} (formatted to ${formattedPhone}). Must be a Nigerian number in international format without '+'.`);
      return false;
    }
    
    console.log(`Sending SMS via Termii to: ${formattedPhone} (original: ${phone})`);

    const payload = {
      to: formattedPhone,
      from: process.env.TERMII_SENDER_ID,
      sms: personalizedMessage,
      type: "plain",
      channel: "dnd",
      api_key: process.env.TERMII_API_KEY,
    };

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

async function sendSMS(phone: string, name: string, message: string): Promise<boolean> {
  try {
    console.log(`Sending SMS to ${name} (${phone})`)
    
    const personalizedMessage = message
      .replace(/{{name}}/g, name)
    
    const smsProvider = process.env.SMS_PROVIDER || 'africas_talking';
    
    console.log(`Using SMS provider: ${smsProvider}`);
    
    if (smsProvider === 'termii') {
      return sendSMSTermii(phone, name, personalizedMessage);
    } else {
      return sendSMSAfricasTalking(phone, name, personalizedMessage);
    }
  } catch (error) {
    console.error('SMS sending error:', error);
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const formData = await request.formData();
    const rsvpIds = JSON.parse(formData.get('rsvpIds') as string);
    const messageType = formData.get('messageType') as string;
    const emailSubject = formData.get('emailSubject') as string;
    const emailMessage = formData.get('emailMessage') as string;
    const smsMessage = formData.get('smsMessage') as string;
    
    let emailImageBuffer: Buffer | undefined;
    const emailImage = formData.get('emailImage') as File;
    if (emailImage) {
      const arrayBuffer = await emailImage.arrayBuffer();
      emailImageBuffer = Buffer.from(arrayBuffer);
    }
    
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
    
    const results = {
      total: rsvps.length,
      emailsSent: 0,
      smsSent: 0,
      failed: 0,
    };
    
    for (const rsvp of rsvps) {
      try {
        if ((messageType === 'email' || messageType === 'both') && rsvp.email) {
          let personalizedSubject = emailSubject.replace(/{{name}}/g, rsvp.name);
          let personalizedHtml = emailMessage.replace(/{{name}}/g, rsvp.name);
          
          if (rsvp.registrationCode) {
            personalizedSubject = personalizedSubject.replace(/{{code}}/g, rsvp.registrationCode.code);
            personalizedHtml = personalizedHtml.replace(/{{code}}/g, rsvp.registrationCode.code);
            const eventLink = process.env.EVENT_LINK || 'https://greenvite.vercel.app/jessegeorge';
            personalizedHtml = personalizedHtml.replace(/{{link}}/g, `${eventLink}#${rsvp.registrationCode.code}`);
          }
          
          const result = await sendEmailResend({
            to: rsvp.email,
            subject: personalizedSubject,
            html: personalizedHtml,
            imageUrl: emailImageBuffer ? undefined : null,
            attachments: emailImageBuffer ? [
              {
                filename: 'invitation.jpg',
                content: emailImageBuffer,
                cid: 'invitation-image',
              },
            ] : [],
          });
          
          if (result.success) {
            results.emailsSent++;
          } else {
            results.failed++;
          }
        }
        
        if ((messageType === 'sms' || messageType === 'both') && (rsvp as any).phone) {
          const smsSent = await sendSMS(
            (rsvp as any).phone,
            rsvp.name,
            smsMessage
          );
          
          if (smsSent) {
            results.smsSent++;
          } else {
            results.failed++;
          }
        }
      } catch (error) {
        console.error(`Error sending message to ${rsvp.name}:`, error);
        results.failed++;
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Error sending bulk messages:', error);
    return NextResponse.json(
      { error: 'An error occurred while sending messages' },
      { status: 500 }
    );
  }
}