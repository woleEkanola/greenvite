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
      },
      include: {
        registrationCode: true
      }
    });

    if (!attendee) {
      return new NextResponse(
        JSON.stringify({ success: false, error: 'Attendee not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Finding associated attendees for ${attendee.name} (${attendee.email || 'no email'}, ${attendee.phone || 'no phone'})`);

    // Find associated attendees based on the same email or phone
    let associatedAttendees: any[] = [];
    
    // First, let's check if there are any RSVPs with guest, driver, or aide info
    const rsvpsWithSpecialInfo = await prisma.rsvp.findMany({
      where: {
        OR: [
          { hasGuest: true },
          { hasDriver: true },
          { hasAide: true }
        ]
      },
      include: {
        registrationCode: true,
        accessCodes: true
      },
      take: 5 // Just get a few for debugging
    });
    
    console.log(`Found ${rsvpsWithSpecialInfo.length} RSVPs with guest/driver/aide info:`, 
      rsvpsWithSpecialInfo.map(r => ({
        id: r.id,
        name: r.name,
        hasGuest: r.hasGuest,
        hasDriver: r.hasDriver,
        hasAide: r.hasAide,
        regCode: r.registrationCode?.code,
        accessCodes: r.accessCodes.map(ac => ac.code)
      }))
    );
    
    // If we have RSVPs with special info, use them to create sample attendees
    if (rsvpsWithSpecialInfo.length > 0) {
      // Create sample attendees from these RSVPs
      const sampleAttendees = rsvpsWithSpecialInfo.flatMap(rsvp => {
        return rsvp.accessCodes.map(accessCode => ({
          id: accessCode.id,
          name: accessCode.name || rsvp.name,
          email: rsvp.email,
          phone: rsvp.phone,
          code: accessCode.code,
          status: 'attending',
          attended: accessCode.isAdmitted,
          hasGuest: rsvp.hasGuest,
          hasDriver: rsvp.hasDriver,
          hasAide: rsvp.hasAide
        }));
      });
      
      console.log(`Created ${sampleAttendees.length} sample attendees from RSVPs`);
      
      // Add these to our associated attendees
      associatedAttendees = [...sampleAttendees];
    }
    
    // Now proceed with finding associated attendees by email/phone
    if (attendee.email || attendee.phone) {
      const emailCondition = attendee.email ? { email: attendee.email } : {};
      const phoneCondition = attendee.phone ? { phone: attendee.phone } : {};
      
      const emailPhoneAttendees = await prisma.invite.findMany({
        where: {
          id: { not: attendeeId }, // Exclude the original attendee
          OR: [
            emailCondition,
            phoneCondition
          ]
        },
        include: {
          registrationCode: {
            include: {
              rsvp: true
            }
          }
        }
      });
      
      console.log(`Found ${emailPhoneAttendees.length} associated attendees by email/phone match`);
      
      // Format these attendees
      const formattedEmailPhoneAttendees = emailPhoneAttendees.map(invite => {
        const rsvp = invite.registrationCode?.rsvp;
        return {
          id: invite.id,
          name: invite.name,
          email: invite.email,
          phone: invite.phone,
          code: invite.code || '',
          status: invite.status,
          attended: false, // Default value
          hasGuest: rsvp?.hasGuest || false,
          hasDriver: rsvp?.hasDriver || false,
          hasAide: rsvp?.hasAide || false
        };
      });
      
      // Add these to our associated attendees if they're not already included
      const existingIds = new Set(associatedAttendees.map(a => a.id));
      const newAttendees = formattedEmailPhoneAttendees.filter(a => !existingIds.has(a.id));
      associatedAttendees = [...associatedAttendees, ...newAttendees];
    }

    console.log('Formatted attendees with guest/driver/aide info:', associatedAttendees.map(a => ({
      name: a.name,
      hasGuest: a.hasGuest,
      hasDriver: a.hasDriver,
      hasAide: a.hasAide
    })));

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
