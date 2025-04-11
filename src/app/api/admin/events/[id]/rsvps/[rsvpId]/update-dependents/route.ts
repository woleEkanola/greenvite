import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Update RSVP dependent flags (hasGuest, hasDriver, hasAide)
export async function POST(
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
    
    // Find the RSVP
    const rsvp = await prisma.rsvp.findUnique({
      where: {
        id: params.rsvpId
      },
      include: {
        registrationCode: {
          select: {
            eventId: true
          }
        }
      }
    })
    
    if (!rsvp) {
      return NextResponse.json({ 
        success: false, 
        error: 'RSVP not found' 
      }, { status: 404 })
    }
    
    // Ensure the RSVP belongs to this event
    if (rsvp.registrationCode?.eventId !== params.id) {
      return NextResponse.json({ 
        success: false, 
        error: 'RSVP does not belong to this event' 
      }, { status: 403 })
    }
    
    // Parse request body
    const body = await request.json()
    const { dependentType, action } = body
    
    // Validate the dependent type
    if (!['guest', 'driver', 'aide'].includes(dependentType)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid dependent type. Must be one of: guest, driver, aide' 
      }, { status: 400 })
    }
    
    // Validate the action
    if (!['add', 'remove'].includes(action)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid action. Must be one of: add, remove' 
      }, { status: 400 })
    }
    
    // Update the RSVP to reflect the dependent status
    const updateData: { 
      hasGuest?: boolean;
      hasDriver?: boolean;
      hasAide?: boolean;
    } = {};
    
    if (dependentType === 'guest') {
      updateData.hasGuest = action === 'add'
    } else if (dependentType === 'driver') {
      updateData.hasDriver = action === 'add'
    } else if (dependentType === 'aide') {
      updateData.hasAide = action === 'add'
    }
    
    // Update the RSVP
    const updatedRsvp = await prisma.rsvp.update({
      where: {
        id: params.rsvpId
      },
      data: updateData
    })
    
    return NextResponse.json({ 
      success: true,
      message: `${action === 'add' ? 'Added' : 'Removed'} ${dependentType} for attendee ${updatedRsvp.name}`,
      rsvp: updatedRsvp
    })
    
  } catch (error) {
    console.error('Error updating RSVP dependents:', error)
    return NextResponse.json({ error: 'Failed to update RSVP dependents' }, { status: 500 })
  }
}
