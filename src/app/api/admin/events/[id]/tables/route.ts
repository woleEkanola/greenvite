import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch tables for a specific event
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
    
    // Fetch tables for this event
    const tables = await prisma.table.findMany({
      where: {
        eventId: params.id
      },
      include: {
        rsvps: {
          include: {
            accessCodes: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    // Format the response with additional information
    const formattedTables = tables.map(table => {
      const totalSeats = table.capacity
      const assignedSeats = table.rsvps.length
      const availableSeats = Math.max(0, totalSeats - assignedSeats)
      
      return {
        ...table,
        stats: {
          totalSeats,
          assignedSeats,
          availableSeats,
          occupancyRate: totalSeats > 0 ? (assignedSeats / totalSeats) * 100 : 0
        }
      }
    })
    
    return NextResponse.json({ 
      success: true,
      tables: formattedTables
    })
    
  } catch (error) {
    console.error('Error fetching tables:', error)
    return NextResponse.json({ error: 'Failed to fetch tables' }, { status: 500 })
  }
}

// POST: Create a new table for a specific event
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
    const { name, capacity, description } = body
    
    if (!name || !capacity) {
      return NextResponse.json({ error: 'Name and capacity are required' }, { status: 400 })
    }
    
    // Create the table
    const table = await prisma.table.create({
      data: {
        name,
        capacity: parseInt(capacity, 10),
        description: description || '',
        eventId: params.id
      }
    })
    
    return NextResponse.json({ 
      success: true,
      table
    })
    
  } catch (error) {
    console.error('Error creating table:', error)
    return NextResponse.json({ error: 'Failed to create table' }, { status: 500 })
  }
}

// PUT: Update a table
export async function PUT(
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
    const { tableId, name, capacity, description } = body
    
    if (!tableId || !name || !capacity) {
      return NextResponse.json({ error: 'Table ID, name, and capacity are required' }, { status: 400 })
    }
    
    // Check if the table exists and belongs to this event
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        eventId: params.id
      }
    })
    
    if (!table) {
      return NextResponse.json({ error: 'Table not found or does not belong to this event' }, { status: 404 })
    }
    
    // Update the table
    const updatedTable = await prisma.table.update({
      where: {
        id: tableId
      },
      data: {
        name,
        capacity: parseInt(capacity, 10),
        description: description || ''
      }
    })
    
    return NextResponse.json({ 
      success: true,
      table: updatedTable
    })
    
  } catch (error) {
    console.error('Error updating table:', error)
    return NextResponse.json({ error: 'Failed to update table' }, { status: 500 })
  }
}

// DELETE: Delete a table
export async function DELETE(
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
    const { tableId } = body
    
    if (!tableId) {
      return NextResponse.json({ error: 'Table ID is required' }, { status: 400 })
    }
    
    // Check if the table exists and belongs to this event
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        eventId: params.id
      },
      include: {
        rsvps: true
      }
    })
    
    if (!table) {
      return NextResponse.json({ error: 'Table not found or does not belong to this event' }, { status: 404 })
    }
    
    // Check if the table has any assigned RSVPs
    if (table.rsvps.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete a table with assigned guests. Please reassign guests first.' 
      }, { status: 400 })
    }
    
    // Delete the table
    await prisma.table.delete({
      where: {
        id: tableId
      }
    })
    
    return NextResponse.json({ 
      success: true,
      message: 'Table deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting table:', error)
    return NextResponse.json({ error: 'Failed to delete table' }, { status: 500 })
  }
}
