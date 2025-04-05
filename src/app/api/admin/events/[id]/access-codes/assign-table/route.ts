import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Assign access codes to a table
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
    const { codeIds, tableId } = body
    
    if (!codeIds || !Array.isArray(codeIds) || codeIds.length === 0) {
      return NextResponse.json({ error: 'Access code IDs are required' }, { status: 400 })
    }
    
    if (!tableId && tableId !== null) {
      return NextResponse.json({ error: 'Table ID is required (can be null to unassign)' }, { status: 400 })
    }
    
    // If tableId is not null, verify the table exists and belongs to this event
    if (tableId !== null) {
      const table = await prisma.table.findFirst({
        where: {
          id: tableId,
          eventId: params.id
        }
      })
      
      if (!table) {
        return NextResponse.json({ error: 'Table not found or does not belong to this event' }, { status: 404 })
      }
    }
    
    // Verify all access codes belong to this event
    const accessCodes = await prisma.accessCode.findMany({
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
    
    if (accessCodes.length !== codeIds.length) {
      return NextResponse.json({ 
        error: 'One or more access codes not found or do not belong to this event',
        found: accessCodes.length,
        requested: codeIds.length
      }, { status: 400 })
    }
    
    // Update the access codes with the new table assignment
    const updateResult = await prisma.accessCode.updateMany({
      where: {
        id: {
          in: codeIds
        },
        rsvp: {
          registrationCode: {
            eventId: params.id
          }
        }
      },
      data: {
        tableId: tableId
      }
    })
    
    return NextResponse.json({ 
      success: true,
      message: `${updateResult.count} access codes ${tableId ? 'assigned to table' : 'unassigned from table'} successfully`,
      updatedCount: updateResult.count
    })
    
  } catch (error) {
    console.error('Error assigning table:', error)
    return NextResponse.json({ error: 'Failed to assign table' }, { status: 500 })
  }
}
