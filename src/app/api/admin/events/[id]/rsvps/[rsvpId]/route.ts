import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch a single RSVP by ID
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string, rsvpId: string } }
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
    
    // Fetch the RSVP by ID
    const rsvp = await prisma.rsvp.findUnique({
      where: {
        id: params.rsvpId,
        registrationCode: {
          eventId: params.id
        }
      },
      include: {
        registrationCode: true,
        accessCodes: true
      }
    })
    
    if (!rsvp) {
      return NextResponse.json({ error: 'RSVP not found' }, { status: 404 })
    }
    
    return NextResponse.json({ 
      success: true,
      rsvp
    })
    
  } catch (error) {
    console.error('Error fetching RSVP:', error)
    return NextResponse.json({ error: 'Failed to fetch RSVP' }, { status: 500 })
  }
}
