import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface AccessCode {
  id: string;
  rsvpId: string;
  type: string;
  isAdmitted: boolean;
  rsvp?: {
    id: string;
    eventId: string;
    hasGuest: boolean;
    hasDriver: boolean;
    hasAide: boolean;
  };
}

interface RsvpData {
  id: string;
  eventId: string;
  hasGuest: boolean;
  hasDriver: boolean;
  hasAide: boolean;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const eventId = params.id
    console.log('Fetching RSVP summary for event:', eventId)

    // Verify event exists and user has access
    const event = await prisma.event.findUnique({
      where: {
        id: eventId,
      },
      include: {
        admins: {
          where: {
            userId: session.user.id,
          },
        },
        owner: true,
      },
    })

    if (!event) {
      console.log('Event not found:', eventId)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Check if user is admin or owner
    const isOwner = event.ownerId === session.user.id
    const isAdmin = event.admins.length > 0

    if (!isOwner && !isAdmin) {
      console.log('User not authorized for event:', eventId)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get all RSVPs for the event first
    const rsvps = await prisma.rsvp.findMany({
      where: {
        registrationCode: {
          eventId: eventId
        }
      }
    })
    
    console.log(`Found ${rsvps.length} RSVPs for event ${eventId}`)

    // Get all access codes for the event
    const accessCodes = await prisma.accessCode.findMany({
      where: {
        rsvp: {
          registrationCode: {
            eventId: eventId
          }
        }
      },
      include: {
        rsvp: true
      }
    })
    
    console.log(`Found ${accessCodes.length} access codes for event ${eventId}`)

    // Calculate summary statistics
    const primaryAttendees = accessCodes.filter((code) => code.type === 'primary').length
    const guests = accessCodes.filter((code) => code.type === 'guest').length
    const drivers = accessCodes.filter((code) => code.type === 'driver').length
    const aides = accessCodes.filter((code) => code.type === 'aide').length
    const admitted = accessCodes.filter((code) => code.isAdmitted).length
    const notAdmitted = accessCodes.filter((code) => !code.isAdmitted).length
    const totalInvitees = primaryAttendees + guests + drivers + aides

    console.log('Base statistics:', { primaryAttendees, guests, drivers, aides, admitted, notAdmitted })

    // Count virtual dependents (RSVPs with hasGuest, hasDriver, or hasAide flags but no actual codes)
    const primaryRsvpIds = accessCodes.filter((code) => code.type === 'primary').map((code) => code.rsvpId)
    console.log(`Found ${primaryRsvpIds.length} primary RSVP IDs`)

    // Count virtual dependents
    let virtualGuests = 0
    let virtualDrivers = 0
    let virtualAides = 0

    rsvps.forEach((rsvp) => {
      // Check for guests without codes
      if (rsvp.hasGuest) {
        const hasGuestCode = accessCodes.some((code) => 
          code.rsvpId === rsvp.id && code.type === 'guest'
        )
        if (!hasGuestCode) virtualGuests++
      }

      // Check for drivers without codes
      if (rsvp.hasDriver) {
        const hasDriverCode = accessCodes.some((code) => 
          code.rsvpId === rsvp.id && code.type === 'driver'
        )
        if (!hasDriverCode) virtualDrivers++
      }

      // Check for aides without codes
      if (rsvp.hasAide) {
        const hasAideCode = accessCodes.some((code) => 
          code.rsvpId === rsvp.id && code.type === 'aide'
        )
        if (!hasAideCode) virtualAides++
      }
    })

    console.log('Virtual dependents:', { virtualGuests, virtualDrivers, virtualAides })

    // Add virtual dependents to the totals
    const totalGuests = guests + virtualGuests
    const totalDrivers = drivers + virtualDrivers
    const totalAides = aides + virtualAides
    const totalVirtualDependents = virtualGuests + virtualDrivers + virtualAides
    const totalInviteesWithVirtual = totalInvitees + totalVirtualDependents

    const summaryData = {
      totalInvitees: totalInviteesWithVirtual,
      primaryAttendees,
      guests: totalGuests,
      drivers: totalDrivers,
      aides: totalAides,
      admitted,
      notAdmitted: notAdmitted + totalVirtualDependents, // Virtual dependents are not admitted
    }
    
    console.log('Final summary data:', summaryData)

    return NextResponse.json(summaryData)
  } catch (error) {
    console.error('Error fetching RSVP summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch RSVP summary' },
      { status: 500 }
    )
  }
}
