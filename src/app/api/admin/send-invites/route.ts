import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { createRegistrationCodes, getRegistrationCodes, markRegistrationCodeAsUsed, isCodeUsedByActiveInvite, createBatch, updateBatchStatus } from '@/lib/db'
import { v4 as uuidv4 } from 'uuid'
import { prisma } from '@/lib/prisma'
import { sendWhatsApp as sendWhatsAppComms, sendEmail as sendEmailComms } from '@/lib/communications'
import { getInstanceForEvent } from '@/lib/evolution-api/service'

type Recipient = {
  name: string;
  email: string;
  phone: string;
  type: 'email' | 'whatsapp' | 'both';
};

async function sendWhatsApp(phone: string, name: string, code: string, message: string, eventLink: string, imageBuffer?: Buffer, eventId?: string): Promise<boolean> {
  try {
    let instanceName = 'default';
    let rateLimitConfig;

    if (eventId) {
      const instanceInfo = await getInstanceForEvent(eventId);
      if (instanceInfo) {
        instanceName = instanceInfo.instanceName;
        rateLimitConfig = instanceInfo.rateLimitConfig;
      }
    }

    return sendWhatsAppComms(phone, name, code, message, eventLink, imageBuffer, undefined, instanceName, rateLimitConfig);
  } catch (error) {
    console.error('WhatsApp sending error:', error);
    return false;
  }
}

async function sendEmail(email: string, name: string, code: string, subject: string, htmlMessage: string, eventLink: string, imageBuffer?: Buffer): Promise<boolean> {
  try {
    return sendEmailComms(email, name, code, subject, htmlMessage, eventLink, imageBuffer);
  } catch (error) {
    console.error('Email sending error:', error);
    return false;
  }
}

function generateRandomCode(length = 6): string {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

export async function POST(request: Request): Promise<Response> {
  const isVercel = process.env.VERCEL === '1';
  console.log(`Running on Vercel: ${isVercel}`);

  try {
    const timeoutPromise = new Promise<Response>((_, reject) => {
      const timeoutMs = isVercel ? 50000 : 60000;
      setTimeout(() => reject(new Error('Request processing timed out')), timeoutMs);
    });

    const responsePromise = processRequest(request);

    return await Promise.race([responsePromise, timeoutPromise]);
  } catch (error) {
    console.error('[POST /api/admin/send-invites] Error:', error);

    if (error instanceof Error &&
        (error.message.includes('timeout') ||
         error.message.includes('ECONNABORTED') ||
         error.message.includes('504'))) {
      console.log('[POST /api/admin/send-invites] Timeout error, treating as partial success');
      return new Response(
        JSON.stringify({ success: true, partial: true, message: 'Request processed with partial success (timeout)' }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

async function processRequest(request: Request): Promise<Response> {
  try {
    console.log('[POST /api/admin/send-invites] Processing invites...');

    const session = await getServerSession(authOptions);
    if (!session) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const formData = await request.formData();
    const recipientsJson = formData.get('recipients') as string;
    const subject = formData.get('subject') as string || 'Event Invitation';
    const emailTemate = formData.get('emailTemplate') as string || `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
        <h2 style="color: #2c3e50; text-align: center;">You are invited to an event</h2>
        
        <div style="text-align: center; margin: 30px 0;">
          <p>Your personal registration code is: <strong>{{code}}</strong></p>
          <p style="margin-bottom: 15px; font-size: 16px;">Click the link below to confirm your attendance. This will help us plan accordingly.</p>
          <p style="margin-bottom: 20px;"><a href="{{link}}" style="color: #4CAF50; text-decoration: underline;">{{link}}</a></p>
          <a href="{{link}}" style="display: inline-block; background-color: #4CAF50; color: white; padding: 14px 28px; border: none; border-radius: 8px; font-size: 18px; font-weight: bold; text-decoration: none;">
            Confirm Your Attendance
          </a>
        </div>
        
        <p style="text-align: center; margin-top: 30px; color: #7f8c8d; font-size: 14px;">We look forward to celebrating with you.</p>
      </div>
    `;
    const whatsappTemplate = formData.get('whatsappTemplate') as string || `You are invited to an event. Your code: {{code}}. Please confirm your attendance at: {{link}}`;
    let eventLink = formData.get('eventLink') as string;
    const eventId = formData.get('eventId') as string;
    const enableEmail = formData.get('enableEmail') === 'true';
    const enableWhatsApp = formData.get('enableWhatsApp') === 'true';
    const batchName = formData.get('batchName') as string || `Batch ${new Date().toISOString().split('T')[0]}`;

    if (!eventLink && eventId) {
      console.log('[POST /api/admin/send-invites] eventLink not provided, generating one from eventId');

      try {
        const event = await prisma.event.findUnique({
          where: { id: eventId }
        });

        const isDevelopment = process.env.NODE_ENV === 'development';
        const baseUrl = isDevelopment ? 'http://localhost:3000' : 'https://greenvites.online';

        if (event?.slug) {
          eventLink = `${baseUrl}/${event.slug}`;
        } else {
          eventLink = `${baseUrl}/event/${eventId}`;
        }

        console.log(`[POST /api/admin/send-invites] Generated eventLink: ${eventLink}`);
      } catch (error) {
        console.error('[POST /api/admin/send-invites] Error generating eventLink:', error);
        eventLink = `https://greenvites.online/event/${eventId}`;
      }
    }

    console.log('[POST /api/admin/send-invites] Received form data:');
    console.log('- recipientsJson:', recipientsJson ? 'present' : 'missing');
    console.log('- subject:', subject || 'missing');
    console.log('- emailTemate:', emailTemate ? 'present' : 'missing');
    console.log('- whatsappTemplate:', whatsappTemplate ? 'present' : 'missing');
    console.log('- eventLink:', eventLink || 'missing');
    console.log('- enableEmail:', enableEmail);
    console.log('- enableWhatsApp:', enableWhatsApp);
    console.log('- batchName:', batchName);

    const missingFields = [];
    if (!recipientsJson) missingFields.push('recipients');
    if (!subject) missingFields.push('subject');
    if (!emailTemate) missingFields.push('emailTemate');
    if (!eventLink) missingFields.push('eventLink');

    if (missingFields.length > 0) {
      console.error(`[POST /api/admin/send-invites] Missing required fields: ${missingFields.join(', ')}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Missing required fields: ${missingFields.join(', ')}` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    let recipients: Recipient[];
    try {
      recipients = JSON.parse(recipientsJson);
    } catch (error) {
      console.error('Error parsing recipients JSON:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid recipients format' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const batch = await createBatch(batchName);
    console.log(`Created new batch: ${batch.id}`);

    const emailImageFile = formData.get('emailImage') as File | null

    const availableRegistrationCodes = await getRegistrationCodes('available')
    console.log(`Found ${availableRegistrationCodes.length} available registration codes`)

    let availableCodes = availableRegistrationCodes.map((code: any) => code.code)

    const extraCodesBuffer = 5;
    if (availableCodes.length < recipients.length + extraCodesBuffer) {
      console.log(`Need to generate ${recipients.length + extraCodesBuffer - availableCodes.length} more registration codes`)
      const newCodes = await createRegistrationCodes(recipients.length + extraCodesBuffer - availableCodes.length)
      console.log(`Generated ${newCodes.count} new registration codes`)

      const updatedRegistrationCodes = await getRegistrationCodes('available')
      availableCodes = updatedRegistrationCodes.map((code: any) => code.code)
      console.log(`Now have ${availableCodes.length} available registration codes`)
    }

    if (availableCodes.length < recipients.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Not enough registration codes available. Need ${recipients.length}, but only have ${availableCodes.length}` }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
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
        const defaultImagePath = path.join(process.cwd(), 'public', 'default.jpg');
        emailImageBuffer = fs.readFileSync(defaultImagePath);
        console.log('Using default image: default.jpg');
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

        let codeValue: string = generateRandomCode();
        let codeFound = false;

        while (availableCodes.length > 0 && !codeFound) {
          const regCode = availableCodes.pop();
          if (!regCode) continue;

          const isUsed = await isCodeUsedByActiveInvite(regCode);
          if (!isUsed) {
            codeValue = regCode;
            codeFound = true;

            await markRegistrationCodeAsUsed(codeValue, 'pending');
            console.log(`[Invite to ${name}] Using registration code ${codeValue}`);
          } else {
            console.log(`[Invite to ${name}] Code ${regCode} is already used by an active invite, trying another one`);
          }
        }

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
            const emailSuccess = await sendEmail(email, name, codeValue, subject, emailTemate, eventLink, emailImageBuffer);
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
            const whatsappSuccess = await sendWhatsApp(phone, name, codeValue, whatsappTemplate, eventLink, emailImageBuffer, eventId);
            whatsappStatus = whatsappSuccess ? 'sent' : 'failed';
            whatsappProvider = 'evolution_api';
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

        let status = 'pending';
        if (successfulChannels.length > 0) {
          status = successfulChannels.length === (type === 'both' ? 2 : 1) ? 'sent' : 'partial';

          if (status === 'sent' || status === 'partial') {
            try {
              await markRegistrationCodeAsUsed(codeValue, 'invite-sent');
            } catch (markError) {
              console.error(`Failed to mark code ${codeValue} as used:`, markError);
            }
          }
        } else {
          status = 'failed';
        }

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

    await updateBatchStatus(batch.id);

    const failures = results.filter((result): result is PromiseRejectedResult => result.status === 'rejected');

    const successfulInvites = results
      .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
      .map(result => result.value);

    if (failures.length > 0) {
      console.error('[POST /api/admin/send-invites] Some invites failed:', failures);

      if (failures.length === recipients.length) {
        return new Response(
          JSON.stringify({
            success: false,
            error: 'All invites failed to send. Please check your WhatsApp and email configuration.',
            failures,
            batchId: batch.id
          }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: `Successfully sent ${successfulInvites.length} out of ${recipients.length} invites`,
          sentInvites: successfulInvites,
          failedCount: failures.length,
          failureReasons: failures.map(failure => failure.reason),
          batchId: batch.id
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully sent ${successfulInvites.length} invites`,
        sentInvites: successfulInvites,
        failedCount: failures.length,
        failureReasons: failures.map(failure => failure.reason),
        batchId: batch.id
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('[POST /api/admin/send-invites] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to send invites',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}