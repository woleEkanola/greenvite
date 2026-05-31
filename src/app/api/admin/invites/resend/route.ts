import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendWhatsApp, sendEmail } from '@/lib/communications';
import { getInstanceForEvent } from '@/lib/evolution-api/service';

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
  batchId?: string | null;
}

async function getInviteById(id: string): Promise<Invite | null> {
  try {
    const invite = await prisma.invite.findUnique({
      where: { id },
      include: { Batch: { select: { eventId: true } } },
    });

    if (!invite) return null;

    return {
      ...invite,
      batchId: invite.batchId,
    } as unknown as Invite;
  } catch (error) {
    console.error(`Error getting invite ${id}:`, error);
    return null;
  }
}

async function updateInvite(id: string, data: Partial<Invite>): Promise<Invite> {
  try {
    const updatedInvite = await prisma.invite.update({
      where: { id },
      data,
    });

    return updatedInvite as unknown as Invite;
  } catch (error) {
    console.error(`Error updating invite ${id}:`, error);
    throw error;
  }
}

async function getEventIdForInvite(invite: Invite): Promise<string | null> {
  if (!invite.batchId) return null;
  const batch = await prisma.batch.findUnique({
    where: { id: invite.batchId },
    select: { eventId: true },
  });
  return batch?.eventId || null;
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
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
      emailImageBuffer,
    } = body;

    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 });
    }

    const invite = await getInviteById(inviteId);
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    const code = invite.code || '';

    let emailStatus: string | null = null;
    let whatsappStatus: string | null = null;
    let whatsappProvider: string | null = null;
    let errorMessage: string | null = null;
    const successfulChannels: string[] = [];

    if ((channel === 'email' || channel === 'both') && email && enableEmail) {
      try {
        const imageBuffer = emailImageBuffer
          ? Buffer.from(emailImageBuffer)
          : undefined;

        const emailSuccess = await sendEmail(
          email,
          invite.name || '',
          code,
          emailSubject || 'Your Event Invitation',
          emailMessage || 'Here is your event invitation.',
          eventLink || '',
          imageBuffer
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
        errorMessage = error instanceof Error ? error.message : 'Unknown email error';
      }
    }

    if ((channel === 'whatsapp' || channel === 'both') && phone && enableWhatsApp) {
      try {
        const eventId = await getEventIdForInvite(invite);
        const instanceConfig = eventId
          ? await getInstanceForEvent(eventId)
          : null;

        const imageBuffer = emailImageBuffer
          ? Buffer.from(emailImageBuffer)
          : undefined;

        const whatsappSuccess = await sendWhatsApp(
          phone,
          invite.name || '',
          code,
          whatsappMessage || '',
          eventLink || '',
          imageBuffer,
          undefined,
          instanceConfig?.instanceName,
          instanceConfig?.rateLimitConfig
        );
        whatsappStatus = whatsappSuccess ? 'sent' : 'failed';
        whatsappProvider = instanceConfig?.instanceName || 'evolution-api';
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

    const status = successfulChannels.length > 0 ? 'sent' : 'failed';

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
      updatedAt: new Date(),
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
        errorMessage: updatedInvite.errorMessage,
      },
    });
  } catch (error) {
    console.error('Error in resend invite:', error);
    return NextResponse.json(
      { error: 'Failed to resend invite' },
      { status: 500 }
    );
  }
}