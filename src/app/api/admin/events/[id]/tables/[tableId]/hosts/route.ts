import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// PUT: Update host assignments for a table
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string, tableId: string } }
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
    
    // Check if the table exists and belongs to this event
    const table = await prisma.table.findFirst({
      where: {
        id: params.tableId,
        eventId: params.id
      }
    })
    
    if (!table) {
      return NextResponse.json({ error: 'Table not found or does not belong to this event' }, { status: 404 })
    }
    
    // Parse the request body
    const body = await request.json()
    const { hostIds } = body
    
    if (!hostIds || !Array.isArray(hostIds)) {
      return NextResponse.json({ error: 'Host IDs array is required' }, { status: 400 })
    }
    
    // Verify that all hosts belong to this event
    if (hostIds.length > 0) {
      const hosts = await prisma.host.findMany({
        where: {
          id: { in: hostIds },
          eventId: params.id
        }
      })
      
      if (hosts.length !== hostIds.length) {
        return NextResponse.json({ 
          error: 'One or more hosts do not exist or do not belong to this event' 
        }, { status: 400 })
      }
    }
    
    // Update the table's host assignments
    const updatedTable = await prisma.table.update({
      where: {
        id: params.tableId
      },
      data: {
        hosts: {
          set: hostIds.map(id => ({ id }))
        }
      },
      include: {
        hosts: true
      }
    })
    
    return NextResponse.json({ 
      success: true,
      table: updatedTable
    })
    
  } catch (error) {
    console.error('Error updating host assignments:', error)
    return NextResponse.json({ error: 'Failed to update host assignments' }, { status: 500 })
  }
}
