import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/email';
import crypto from 'crypto';

// POST /api/admin/events/[id]/invite-admins - Invite admins to an event
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { emails, message } = await request.json();

    if (!Array.isArray(emails) || emails.length === 0) {
      return NextResponse.json(
        { error: 'At least one email address is required' },
        { status: 400 }
      );
    }

    // Check if event exists and the user has access to it
    const event = await prisma.event.findFirst({
      where: {
        id,
        ownerId: session.user.id, // Only the owner can invite admins
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found or access denied. Only the event owner can invite admins.' }, { status: 403 });
    }

    // Get the current user for invitation tracking
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, name: true, email: true, username: true }
    });

    if (!currentUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const invitationResults = await Promise.all(
      emails.map(async (email: string) => {
        try {
          // Check if this email is already invited to this event
          const existingInvitation = await prisma.adminInvitation.findUnique({
            where: {
              email_eventId: {
                email,
                eventId: id
              }
            }
          });

          if (existingInvitation) {
            if (existingInvitation.status === 'pending') {
              // Resend the invitation
              await sendInvitationEmail(
                email,
                event,
                existingInvitation.token,
                message,
                currentUser
              );
              return { email, status: 'resent' };
            } else {
              // Already accepted or expired
              return { email, status: 'already_processed' };
            }
          }

          // Check if user with this email already exists
          const existingUser = await prisma.user.findFirst({
            where: { email }
          });

          // Check if user is already an admin of this event
          if (existingUser) {
            const isAlreadyAdmin = await prisma.eventAdmin.findUnique({
              where: {
                userId_eventId: {
                  userId: existingUser.id,
                  eventId: id
                }
              }
            });

            if (isAlreadyAdmin) {
              return { email, status: 'already_admin' };
            }
          }

          // Generate a unique token for the invitation
          const token = crypto.randomBytes(32).toString('hex');
          
          // Set expiration date (7 days from now)
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 7);

          // Create invitation record
          const invitation = await prisma.adminInvitation.create({
            data: {
              email,
              token,
              status: 'pending',
              message: message || null,
              expiresAt,
              event: { connect: { id } },
              inviter: { connect: { id: currentUser.id } }
            }
          });

          // Send invitation email
          await sendInvitationEmail(
            email,
            event,
            token,
            message,
            currentUser
          );

          return { email, status: 'sent' };
        } catch (error) {
          console.error(`Error processing invitation for ${email}:`, error);
          return { email, status: 'error', error };
        }
      })
    );

    // Count successful invitations
    const sent = invitationResults.filter(
      result => result.status === 'sent' || result.status === 'resent'
    ).length;

    return NextResponse.json({
      sent,
      total: emails.length,
      results: invitationResults
    });
  } catch (error) {
    console.error('Error inviting admins:', error);
    return NextResponse.json(
      { error: 'Failed to send invitations' },
      { status: 500 }
    );
  }
}

async function sendInvitationEmail(
  email: string,
  event: any,
  token: string,
  message: string | null,
  inviter: { name?: string | null; email?: string | null; username: string }
) {
  // Check if user with this email already exists
  const existingUser = await prisma.user.findFirst({
    where: { email }
  });

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  let inviteUrl;
  let emailSubject;
  let emailContent;

  if (existingUser) {
    // User exists - direct them to the event page
    inviteUrl = `${baseUrl}/admin/dashboard/events/${event.id}?token=${token}`;
    emailSubject = `You've been invited to manage ${event.title}`;
    
    emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">You've been invited to manage an event</h2>
        <p>Hello,</p>
        <p>${inviter.name || inviter.username} has invited you to be an admin for the following event:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">${event.title}</h3>
          ${event.description ? `<p>${event.description}</p>` : ''}
          <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}</p>
          ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
        </div>
        ${message ? `<p><strong>Message from ${inviter.name || inviter.username}:</strong> ${message}</p>` : ''}
        <p>Since you already have an account, you can access this event immediately:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${inviteUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">View Event</a>
        </div>
        <p>If you have any questions, you can reply to this email to contact ${inviter.name || inviter.username}.</p>
        <p>Thank you,<br>The Greenvites Team</p>
      </div>
    `;
  } else {
    // New user - direct them to sign up page
    inviteUrl = `${baseUrl}/signup?token=${token}&email=${encodeURIComponent(email)}`;
    emailSubject = `Invitation to join ${event.title} as an admin`;
    
    emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2c3e50;">You've been invited to join Greenvites</h2>
        <p>Hello,</p>
        <p>${inviter.name || inviter.username} has invited you to be an admin for the following event:</p>
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #2c3e50;">${event.title}</h3>
          ${event.description ? `<p>${event.description}</p>` : ''}
          <p><strong>Date:</strong> ${new Date(event.startDate).toLocaleDateString()} - ${new Date(event.endDate).toLocaleDateString()}</p>
          ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ''}
        </div>
        ${message ? `<p><strong>Message from ${inviter.name || inviter.username}:</strong> ${message}</p>` : ''}
        <p>To accept this invitation, you'll need to create an account:</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="${inviteUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Create Account</a>
        </div>
        <p>This invitation will expire in 7 days.</p>
        <p>If you have any questions, you can reply to this email to contact ${inviter.name || inviter.username}.</p>
        <p>Thank you,<br>The Greenvites Team</p>
      </div>
    `;
  }

  return await sendEmail({
    to: email,
    subject: emailSubject,
    html: emailContent
  });
}
