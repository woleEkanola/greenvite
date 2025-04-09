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

export async function POST(
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

    // Find the attendee
    const attendee = await prisma.invite.findFirst({
      where: {
        id: attendeeId,
        eventId
      }
    });

    if (!attendee) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Attendee not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Mark the attendee as attended
    const updatedAttendee = await prisma.invite.update({
      where: {
        id: attendeeId
      },
      data: {
        attended: true,
        attendedAt: new Date()
      }
    });

    return new NextResponse(
      JSON.stringify({ 
        success: true, 
        message: 'Attendee admitted successfully',
        attendee: {
          id: updatedAttendee.id,
          name: updatedAttendee.name,
          attended: updatedAttendee.attended,
          attendedAt: updatedAttendee.attendedAt
        }
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error admitting attendee:', error);
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
