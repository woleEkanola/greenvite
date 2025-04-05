import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Delete access codes
export async function POST(
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
    const { codeIds } = body
    
    if (!codeIds || !Array.isArray(codeIds) || codeIds.length === 0) {
      return NextResponse.json({ error: 'Code IDs are required' }, { status: 400 })
    }
    
    // Delete the access codes
    const deleteResult = await prisma.accessCode.deleteMany({
      where: {
        id: {
          in: codeIds
        },
        rsvp: {
          registrationCode: {
            eventId: params.id
          }
        }
      }
    })
    
    return NextResponse.json({ 
      success: true,
      message: `Deleted ${deleteResult.count} access codes.`,
      count: deleteResult.count
    })
    
  } catch (error) {
    console.error('Error deleting access codes:', error)
    return NextResponse.json({ error: 'Failed to delete access codes' }, { status: 500 })
  }
}
