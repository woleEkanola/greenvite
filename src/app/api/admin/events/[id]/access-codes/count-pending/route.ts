import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Count RSVPs that don't have access codes yet
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
    
    // Count RSVPs for this event that don't have access codes yet
    const pendingCount = await prisma.rsvp.count({
      where: {
        registrationCode: {
          eventId: params.id
        },
        accessCodes: {
          none: {}
        }
      }
    })
    
    return NextResponse.json({ 
      success: true,
      pendingCount
    })
    
  } catch (error) {
    console.error('Error counting pending RSVPs:', error)
    return NextResponse.json({ error: 'Failed to count pending RSVPs' }, { status: 500 })
  }
}
