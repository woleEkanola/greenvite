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
    const isHost = await prisma.eventAdmin.findFirst({
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

    // Get the attendee to find associated attendees for
    const attendee = await prisma.invite.findUnique({
      where: {
        id: attendeeId
      }
    });

    if (!attendee) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Attendee not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get the event to ensure it exists
    const event = await prisma.event.findUnique({
      where: {
        id: eventId
      }
    });

    if (!event) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Event not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find associated attendees based on the same event
    const associatedAttendees = await prisma.invite.findMany({
      where: {
        id: { not: attendeeId } // Exclude the original attendee
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        status: true
      }
    });

    return new NextResponse(
      JSON.stringify({
        success: true,
        attendees: associatedAttendees
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
