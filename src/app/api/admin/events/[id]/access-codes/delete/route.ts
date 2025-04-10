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
    
    // First, get the access codes to determine their types and RSVP IDs
    const accessCodes = await prisma.accessCode.findMany({
      where: {
        id: {
          in: codeIds
        }
      },
      select: {
        id: true,
        type: true,
        rsvpId: true
      }
    })
    
    if (accessCodes.length === 0) {
      return NextResponse.json({ 
        success: false,
        message: 'No access codes found with the provided IDs.'
      }, { status: 404 })
    }
    
    // Group access codes by RSVP ID
    const rsvpUpdates = new Map()
    
    for (const code of accessCodes) {
      if (!rsvpUpdates.has(code.rsvpId)) {
        rsvpUpdates.set(code.rsvpId, {
          guestCount: 0,
          driverCount: 0,
          aideCount: 0,
          codeIds: []
        })
      }
      
      const update = rsvpUpdates.get(code.rsvpId)
      update.codeIds.push(code.id)
      
      if (code.type === 'guest') update.guestCount++
      if (code.type === 'driver') update.driverCount++
      if (code.type === 'aide') update.aideCount++
    }
    
    // Process each RSVP that needs updating
    for (const [rsvpId, update] of rsvpUpdates.entries()) {
      // Get remaining access codes for this RSVP (excluding the ones being deleted)
      const remainingCodes = await prisma.accessCode.findMany({
        where: {
          rsvpId,
          id: {
            notIn: update.codeIds
          }
        },
        select: {
          type: true
        }
      })
      
      // Count remaining codes by type
      const remainingTypes = {
        guest: remainingCodes.filter(c => c.type === 'guest').length,
        driver: remainingCodes.filter(c => c.type === 'driver').length,
        aide: remainingCodes.filter(c => c.type === 'aide').length
      }
      
      // Update RSVP flags based on remaining codes
      await prisma.rsvp.update({
        where: { id: rsvpId },
        data: {
          hasGuest: remainingTypes.guest > 0,
          hasDriver: remainingTypes.driver > 0,
          hasAide: remainingTypes.aide > 0
        }
      })
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
