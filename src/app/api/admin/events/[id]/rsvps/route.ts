import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch RSVPs for a specific event
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
    
    // Get query parameters
    const searchTerm = request.nextUrl.searchParams.get('search') || ''
    
    // Fetch RSVPs for this event
    const rsvps = await prisma.rsvp.findMany({
      where: {
        registrationCode: {
          eventId: params.id
        },
        OR: searchTerm ? [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } }
        ] : undefined
      },
      include: {
        registrationCode: true,
        accessCodes: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Calculate statistics
    const attending = rsvps.filter(rsvp => rsvp.registrationCode.status === 'attending').length
    const notAttending = rsvps.filter(rsvp => rsvp.registrationCode.status === 'not_attending').length
    const pending = rsvps.filter(rsvp => rsvp.registrationCode.status === 'pending').length
    const totalGuests = rsvps.reduce((sum, rsvp) => {
      // Count guests based on hasGuest, hasDriver, hasAide
      let guestCount = 0;
      if (rsvp.hasGuest) guestCount += 1;
      if (rsvp.hasDriver) guestCount += 1;
      if (rsvp.hasAide) guestCount += 1;
      return sum + guestCount;
    }, 0);
    
    return NextResponse.json({ 
      success: true,
      rsvps,
      stats: {
        total: rsvps.length,
        attending,
        notAttending,
        pending,
        totalGuests
      }
    })
    
  } catch (error) {
    console.error('Error fetching RSVPs:', error)
    return NextResponse.json({ error: 'Failed to fetch RSVPs' }, { status: 500 })
  }
}

// PUT: Update an RSVP
export async function PUT(
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
    
    // Parse the request body
    const body = await request.json()
    const { rsvpId, tableId, ...updateData } = body
    
    if (!rsvpId) {
      return NextResponse.json({ error: 'RSVP ID is required' }, { status: 400 })
    }
    
    // Check if the RSVP exists and belongs to this event
    const rsvp = await prisma.rsvp.findFirst({
      where: {
        id: rsvpId,
        registrationCode: {
          eventId: params.id
        }
      },
      include: {
        registrationCode: true
      }
    })
    
    if (!rsvp) {
      return NextResponse.json({ error: 'RSVP not found or does not belong to this event' }, { status: 404 })
    }
    
    // Update the RSVP
    const updatedRsvp = await prisma.rsvp.update({
      where: {
        id: rsvpId
      },
      data: {
        ...updateData,
        tableId: tableId || null
      },
      include: {
        registrationCode: true,
        accessCodes: true
      }
    })
    
    return NextResponse.json({ 
      success: true,
      rsvp: updatedRsvp
    })
    
  } catch (error) {
    console.error('Error updating RSVP:', error)
    return NextResponse.json({ error: 'Failed to update RSVP' }, { status: 500 })
  }
}

// DELETE: Delete an RSVP
export async function DELETE(
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
    
    // Parse the request body
    const body = await request.json()
    const { rsvpId } = body
    
    if (!rsvpId) {
      return NextResponse.json({ error: 'RSVP ID is required' }, { status: 400 })
    }
    
    // Check if the RSVP exists and belongs to this event
    const rsvp = await prisma.rsvp.findFirst({
      where: {
        id: rsvpId,
        registrationCode: {
          eventId: params.id
        }
      }
    })
    
    if (!rsvp) {
      return NextResponse.json({ error: 'RSVP not found or does not belong to this event' }, { status: 404 })
    }
    
    // Delete the RSVP
    await prisma.rsvp.delete({
      where: {
        id: rsvpId
      }
    })
    
    return NextResponse.json({ 
      success: true,
      message: 'RSVP deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting RSVP:', error)
    return NextResponse.json({ error: 'Failed to delete RSVP' }, { status: 500 })
  }
}
