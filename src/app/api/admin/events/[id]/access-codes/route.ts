import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateRandomCode } from '@/lib/utils'

// GET: Fetch access codes for a specific event
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
    
    // Fetch access codes for this event
    const accessCodes = await prisma.accessCode.findMany({
      where: {
        rsvp: {
          registrationCode: {
            eventId: params.id
          }
        }
      },
      include: {
        rsvp: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            hasGuest: true,
            hasDriver: true,
            hasAide: true
          }
        },
        table: {
          select: {
            id: true,
            name: true,
            capacity: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({ 
      success: true,
      accessCodes
    })
    
  } catch (error) {
    console.error('Error fetching access codes:', error)
    return NextResponse.json({ error: 'Failed to fetch access codes' }, { status: 500 })
  }
}
