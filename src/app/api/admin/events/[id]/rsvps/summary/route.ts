import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch summary statistics for RSVPs of an event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if the user has access to this event
    const event = await prisma.event.findFirst({
      where: {
        id: params.id,
      },
      include: {
        owner: true,
        admins: {
          include: {
            user: true
          }
        }
      }
    })
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    
    // Check if the user is either the owner or an admin
    const isOwner = event.ownerId === session.user.id
    const isAdmin = event.admins.some(admin => admin.userId === session.user.id)
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Get total number of primary RSVPs
    const totalPrimary = await prisma.rsvp.count({
      where: {
        registrationCode: {
          eventId: params.id
        }
      }
    })
    
    // Get counts of RSVPs with different dependent types
    const rsvpsWithDependents = await prisma.rsvp.findMany({
      where: {
        registrationCode: {
          eventId: params.id
        }
      },
      select: {
        hasGuest: true,
        hasDriver: true,
        hasAide: true
      }
    })
    
    // Count the number of RSVPs with each dependent type
    const totalGuests = rsvpsWithDependents.filter(rsvp => rsvp.hasGuest).length
    const totalDrivers = rsvpsWithDependents.filter(rsvp => rsvp.hasDriver).length
    const totalAides = rsvpsWithDependents.filter(rsvp => rsvp.hasAide).length
    
    // Calculate total invitees (primary + all dependents)
    const totalInvitees = totalPrimary + totalGuests + totalDrivers + totalAides
    
    return NextResponse.json({
      success: true,
      totalInvitees,
      totalPrimary,
      totalGuests,
      totalDrivers,
      totalAides
    })
    
  } catch (error) {
    console.error('Error fetching RSVP summary:', error)
    return NextResponse.json({ error: 'Failed to fetch RSVP summary' }, { status: 500 })
  }
}
