import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper function to check event access
async function canAccessEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    // Check if the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return false;
    }

    // Check if the user is the event owner
    if (event.ownerId === userId) {
      return true;
    }

    // Check if the user is a host for this event
    const isHost = await prisma.eventHost.findFirst({
      where: {
        eventId,
        userId
      }
    });

    return !!isHost;
  } catch (error) {
    console.error('Error checking event access:', error);
    return false;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string, attendeeId: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const userId = session.user.id;
    const eventId = params.id;
    const attendeeId = params.attendeeId;

    // Check if user has access to this event
    const hasAccess = await canAccessEvent(userId, eventId);
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find the original attendee
    const originalAttendee = await prisma.invite.findUnique({
      where: {
        id: attendeeId
      }
    });

    if (!originalAttendee) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Attendee not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find associated attendees based on email or phone
    const associatedAttendees = await prisma.invite.findMany({
      where: {
        eventId,
        id: { not: attendeeId }, // Exclude the original attendee
        OR: [
          // Match by email if available
          ...(originalAttendee.email ? [{ email: originalAttendee.email }] : []),
          // Match by phone if available
          ...(originalAttendee.phone ? [{ phone: originalAttendee.phone }] : [])
        ]
      },
      select: {
        id: true,
        name: true,
        code: true,
        rsvpStatus: true,
        attended: true
      }
    });

    return new NextResponse(
      JSON.stringify({ 
        success: true, 
        attendees: associatedAttendees.map(attendee => ({
          ...attendee,
          rsvpStatus: attendee.rsvpStatus || 'pending'
        }))
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching associated attendees:', error);
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
