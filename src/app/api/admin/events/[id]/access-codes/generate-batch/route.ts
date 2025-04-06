import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateRandomCode } from '@/lib/utils'

// POST: Generate access codes for a batch of RSVPs that don't have them yet
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
    
    // Get batch size from request
    const { batchSize = 20 } = await request.json();
    
    // Find RSVPs for this event that don't have access codes yet
    const rsvpsWithoutAccessCodes = await prisma.rsvp.findMany({
      where: {
        registrationCode: {
          eventId: params.id
        },
        accessCodes: {
          none: {}
        }
      },
      take: batchSize
    })
    
    if (rsvpsWithoutAccessCodes.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No new access codes needed. All RSVPs already have access codes.',
        count: 0,
        remaining: 0
      })
    }
    
    // Generate access codes for each RSVP
    const createdCodes = []
    
    for (const rsvp of rsvpsWithoutAccessCodes) {
      // Generate a primary code for the RSVP
      const primaryCode = await prisma.accessCode.create({
        data: {
          code: generateRandomCode(6),
          rsvpId: rsvp.id,
          type: 'primary',
          name: rsvp.name,
          isAdmitted: false,
          isSent: false
        }
      })
      
      createdCodes.push(primaryCode)
      
      // If the RSVP has a guest, generate a guest code
      if (rsvp.hasGuest) {
        const guestCode = await prisma.accessCode.create({
          data: {
            code: generateRandomCode(6),
            rsvpId: rsvp.id,
            type: 'guest',
            name: `${rsvp.name}'s Guest`,
            isAdmitted: false,
            isSent: false
          }
        })
        
        createdCodes.push(guestCode)
      }
      
      // If the RSVP has a driver, generate a driver code
      if (rsvp.hasDriver) {
        const driverCode = await prisma.accessCode.create({
          data: {
            code: generateRandomCode(6),
            rsvpId: rsvp.id,
            type: 'driver',
            name: `${rsvp.name}'s Driver`,
            isAdmitted: false,
            isSent: false
          }
        })
        
        createdCodes.push(driverCode)
      }
      
      // If the RSVP has an aide, generate an aide code
      if (rsvp.hasAide) {
        const aideCode = await prisma.accessCode.create({
          data: {
            code: generateRandomCode(6),
            rsvpId: rsvp.id,
            type: 'aide',
            name: `${rsvp.name}'s Aide`,
            isAdmitted: false,
            isSent: false
          }
        })
        
        createdCodes.push(aideCode)
      }
    }
    
    // Count remaining RSVPs without access codes
    const remainingCount = await prisma.rsvp.count({
      where: {
        registrationCode: {
          eventId: params.id
        },
        accessCodes: {
          none: {}
        }
      }
    });
    
    return NextResponse.json({ 
      success: true,
      message: `Generated ${createdCodes.length} access codes for ${rsvpsWithoutAccessCodes.length} RSVPs.`,
      count: createdCodes.length,
      remaining: remainingCount
    })
    
  } catch (error) {
    console.error('Error generating access codes:', error)
    return NextResponse.json({ error: 'Failed to generate access codes' }, { status: 500 })
  }
}
