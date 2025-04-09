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

    // First, look for the registration code
    const registrationCode = await prisma.registrationCode.findFirst({
      where: {
        code: code,
        eventId: eventId
      },
      include: {
        invite: {
          include: {
            table: {
              select: {
                id: true,
                name: true,
                capacity: true
              }
            }
          }
        }
      }
    });

    if (!registrationCode) {
      console.log(`No registration code found with code ${code} for event ${eventId}`);
      
      // Try a case-insensitive search
      const allCodes = await prisma.registrationCode.findMany({
        where: {
          eventId: eventId
        },
        select: {
          id: true,
          code: true
        }
      });
      
      console.log(`Found ${allCodes.length} total registration codes for event ${eventId}`);
      if (allCodes.length > 0) {
        const sampleCodes = allCodes.slice(0, 10).map(c => c.code);
        console.log(`Sample registration codes: ${sampleCodes.join(', ')}`);
      }
      
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Attendee not found',
          message: `No registration code found with code ${code} for event ${eventId}`
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Check if the registration code has an associated invite
    if (!registrationCode.invite) {
      console.log(`Registration code ${code} found but has no associated invite`);
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Attendee not found',
          message: `Registration code ${code} has no associated attendee`
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const invite = registrationCode.invite;
    console.log(`Found invite via registration code: ${code}`);

    // Format the attendee data
    const attendee = {
      id: invite.id,
      name: invite.name,
      email: invite.email,
      phone: invite.phone,
      code: invite.code || registrationCode.code,
      rsvpStatus: invite.status === 'sent' ? 'attending' : 'pending',
      tableId: invite.tableId,
      tableName: invite.table?.name || null,
      attended: invite.attended || false,
      attendedAt: invite.attendedAt,
      createdAt: invite.createdAt,
      updatedAt: invite.updatedAt
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
