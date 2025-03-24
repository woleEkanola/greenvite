import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'

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
    const event = await prisma.event.findUnique({
      where: {
        id: params.id,
        OR: [
          { ownerId: session.user.id },
          {
            admins: {
              some: {
                userId: session.user.id
              }
            }
          }
        ]
      }
    })
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found or access denied' }, { status: 404 })
    }
    
    // Get counts for different resources related to this event
    const [
      regCodesCount,
      accessCodesCount,
      invitesCount,
      rsvpsCount,
      tablesCount
    ] = await Promise.all([
      // Count registration codes for this event
      prisma.registrationCode.count({
        where: { eventId: params.id }
      }),
      
      // Count access codes for this event (via registration codes)
      prisma.accessCode.count({
        where: {
          rsvp: {
            registrationCode: {
              eventId: params.id
            }
          }
        }
      }),
      
      // Count invites for this event
      prisma.invite.count({
        where: {
          batch: {
            eventId: params.id
          }
        }
      }),
      
      // Count RSVPs for this event
      prisma.rSVP.count({
        where: {
          registrationCode: {
            eventId: params.id
          }
        }
      }),
      
      // Count tables for this event
      prisma.table.count({
        where: { eventId: params.id }
      })
    ])
    
    // Return the stats
    return NextResponse.json({
      regCodes: regCodesCount,
      accessCodes: accessCodesCount,
      invites: invitesCount,
      rsvps: rsvpsCount,
      tables: tablesCount
    })
    
  } catch (error) {
    console.error('Error fetching event stats:', error)
    return NextResponse.json({ error: 'Failed to fetch event statistics' }, { status: 500 })
  }
}
