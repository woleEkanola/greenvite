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
  { params }: { params: { id: string, code: string } }
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
    const code = params.code;
    
    console.log(`Looking up attendee with registration code: ${code} for event: ${eventId}`);

    // Check if user has access to this event
    const hasAccess = await canAccessEvent(userId, eventId);
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find the registration code
    const registrationCode = await prisma.registrationCode.findFirst({
      where: {
        code: code
      },
      include: {
        rsvp: {
          include: {
            accessCodes: true
          }
        }
      }
    });

    if (!registrationCode) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Registration code not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find the associated invite by code
    const invite = await prisma.invite.findFirst({
      where: {
        code: registrationCode.code
      }
    });

    if (!invite) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'No attendee associated with this registration code' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get access code if available
    const accessCode = registrationCode.rsvp?.accessCodes?.[0];
    
    // Format the attendee data
    const attendee = {
      id: invite.id,
      name: invite.name,
      email: invite.email,
      phone: invite.phone,
      code: invite.code,
      status: invite.status,
      attended: accessCode?.isAdmitted || false,
      attendedAt: accessCode?.admittedAt || null,
      isHallAdmitted: accessCode?.isHallAdmitted || false,
      hallAdmittedAt: accessCode?.hallAdmittedAt || null,
      createdAt: invite.createdAt,
      updatedAt: invite.updatedAt,
      registrationCode: registrationCode.code
    };

    return new NextResponse(
      JSON.stringify({ success: true, attendee }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching attendee by registration code:', error);
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
