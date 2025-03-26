import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/admin/invitations/accept - Accept an admin invitation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json(
        { error: 'Invitation token is required' },
        { status: 400 }
      );
    }

    // Find the invitation by token
    const invitation = await prisma.adminInvitation.findUnique({
      where: { token },
      include: { event: true }
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid invitation token' },
        { status: 404 }
      );
    }

    // Check if invitation is expired
    if (invitation.status === 'expired' || new Date() > invitation.expiresAt) {
      await prisma.adminInvitation.update({
        where: { id: invitation.id },
        data: { status: 'expired' }
      });
      
      return NextResponse.json(
        { error: 'This invitation has expired' },
        { status: 400 }
      );
    }

    // Check if invitation is already accepted
    if (invitation.status === 'accepted') {
      return NextResponse.json(
        { error: 'This invitation has already been accepted' },
        { status: 400 }
      );
    }

    // For authenticated users
    if (session) {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id }
      });

      if (!user) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }

      // Check if the user's email matches the invitation email
      if (user.email?.toLowerCase() !== invitation.email.toLowerCase()) {
        return NextResponse.json(
          { error: 'This invitation was sent to a different email address' },
          { status: 403 }
        );
      }

      // Check if user is already an admin of this event
      const existingAdmin = await prisma.eventAdmin.findUnique({
        where: {
          userId_eventId: {
            userId: user.id,
            eventId: invitation.eventId
          }
        }
      });

      if (existingAdmin) {
        // Update invitation status
        await prisma.adminInvitation.update({
          where: { id: invitation.id },
          data: { 
            status: 'accepted',
            acceptedAt: new Date()
          }
        });

        return NextResponse.json({
          message: 'You are already an admin of this event',
          eventId: invitation.eventId,
          eventTitle: invitation.event.title
        });
      }

      // Add user as admin to the event
      await prisma.$transaction([
        // Create event admin record
        prisma.eventAdmin.create({
          data: {
            userId: user.id,
            eventId: invitation.eventId
          }
        }),
        // Update invitation status
        prisma.adminInvitation.update({
          where: { id: invitation.id },
          data: { 
            status: 'accepted',
            acceptedAt: new Date()
          }
        })
      ]);

      return NextResponse.json({
        message: 'You have been added as an admin to this event',
        eventId: invitation.eventId,
        eventTitle: invitation.event.title
      });
    } 
    // For non-authenticated users, just verify the token is valid
    else {
      return NextResponse.json({
        message: 'Valid invitation token',
        email: invitation.email,
        eventId: invitation.eventId,
        eventTitle: invitation.event.title
      });
    }
  } catch (error) {
    console.error('Error accepting invitation:', error);
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
