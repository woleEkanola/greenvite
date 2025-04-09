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
    
    console.log(`Looking up attendee with access code: ${code} for event: ${eventId}`);

    // Check if user has access to this event
    const hasAccess = await canAccessEvent(userId, eventId);
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find the access code
    const accessCode = await prisma.accessCode.findFirst({
      where: {
        code: code,
        rsvp: {
          registrationCode: {
            eventId: eventId
          }
        }
      },
      include: {
        rsvp: {
          include: {
            registrationCode: true
          }
        },
        table: {
          select: {
            id: true,
            name: true,
            capacity: true
          }
        }
      }
    });

    if (!accessCode) {
      console.log(`No access code found with code ${code} for event ${eventId}`);
      
      // Try a case-insensitive search
      const allCodes = await prisma.accessCode.findMany({
        where: {
          rsvp: {
            registrationCode: {
              eventId: eventId
            }
          }
        },
        select: {
          id: true,
          code: true
        }
      });
      
      console.log(`Found ${allCodes.length} total access codes for event ${eventId}`);
      if (allCodes.length > 0) {
        const sampleCodes = allCodes.slice(0, 10).map(c => c.code);
        console.log(`Sample access codes: ${sampleCodes.join(', ')}`);
      }
      
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Attendee not found',
          message: `No access code found with code ${code} for event ${eventId}`
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Format the attendee data
    const attendee = {
      id: accessCode.id,
      name: accessCode.name,
      email: accessCode.rsvp?.email || null,
      phone: accessCode.rsvp?.phone || null,
      code: accessCode.code,
      rsvpStatus: 'attending', // Access codes are for confirmed attendees
      tableId: accessCode.tableId,
      tableName: accessCode.table?.name || null,
      attended: accessCode.isAdmitted,
      attendedAt: accessCode.admittedAt,
      createdAt: accessCode.createdAt,
      updatedAt: accessCode.updatedAt
    };

    return new NextResponse(
      JSON.stringify({ success: true, attendee }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching attendee by access code:', error);
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
