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
    
    console.log(`Looking up attendee with code: ${code} for event: ${eventId}`);

    // Check if user has access to this event
    const hasAccess = await canAccessEvent(userId, eventId);
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Find the invite by code - first try exact match
    let invite = await prisma.invite.findFirst({
      where: {
        code: code,
        eventId: eventId
      },
      include: {
        table: {
          select: {
            id: true,
            name: true,
            capacity: true
          }
        }
      }
    });

    // If not found with exact match, try case-insensitive search
    if (!invite) {
      console.log(`No exact match found for code ${code}, trying case-insensitive search`);
      
      // Get all invites for this event and filter manually for case-insensitive match
      const allInvites = await prisma.invite.findMany({
        where: {
          eventId: eventId
        }
      });
      
      console.log(`Found ${allInvites.length} total invites for event ${eventId}`);
      
      // Log some sample codes to help diagnose the issue
      const sampleCodes = allInvites.slice(0, 10).map(i => i.code);
      console.log(`Sample invite codes: ${sampleCodes.join(', ')}`);
      
      // Find a case-insensitive match
      invite = allInvites.find(i => 
        i.code && i.code.toLowerCase() === code.toLowerCase()
      );
      
      if (invite) {
        console.log(`Found invite with case-insensitive match: ${invite.code}`);
      }
    }

    // If still not found, check if it's a registration code instead
    if (!invite) {
      console.log(`No invite found with code ${code}, checking registration codes`);
      
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
      
      if (registrationCode?.invite) {
        console.log(`Found invite via registration code: ${registrationCode.code}`);
        invite = registrationCode.invite;
      }
    }

    if (!invite) {
      return new NextResponse(
        JSON.stringify({ 
          success: false, 
          error: 'Attendee not found',
          message: `No attendee found with code ${code} for event ${eventId}`
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Format the attendee data
    const attendee = {
      id: invite.id,
      name: invite.name,
      email: invite.email,
      phone: invite.phone,
      code: invite.code,
      rsvpStatus: invite.rsvpStatus || 'pending',
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
    console.error('Error fetching attendee by code:', error);
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
