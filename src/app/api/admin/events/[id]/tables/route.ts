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
        hosts: true,
        accessCodes: {
          include: {
            rsvp: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    // Calculate occupancy for each table and format the response
    const tablesWithOccupancy = tables.map(table => {
      const occupancy = table.accessCodes.length;
      const vacancy = Math.max(0, table.capacity - occupancy);
      
      // Format access codes to include guest details
      const guests = table.accessCodes.map(code => ({
        id: code.id,
        name: code.name,
        type: code.type,
        code: code.code,
        isAdmitted: code.isAdmitted,
        rsvpId: code.rsvpId,
        rsvpName: code.rsvp?.name || 'Unknown',
        rsvpEmail: code.rsvp?.email || '',
        rsvpPhone: code.rsvp?.phone || ''
      }));
      
      // Remove the accessCodes array from the response to reduce payload size
      const { accessCodes, ...tableWithoutAccessCodes } = table;
      
      return {
        ...tableWithoutAccessCodes,
        occupancy,
        vacancy,
        isFull: vacancy <= 0,
        guests
      };
    });

    console.log('Tables with occupancy:', tablesWithOccupancy.map(t => ({
      id: t.id,
      name: t.name,
      capacity: t.capacity,
      occupancy: t.occupancy,
      vacancy: t.vacancy,
      isFull: t.isFull
    })));

    return NextResponse.json({ 
      success: true,
      tables: tablesWithOccupancy
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
    const { name, capacity, color, hostIds } = body
    
    if (!name || !capacity) {
      return NextResponse.json({ error: 'Name and capacity are required' }, { status: 400 })
    }
    
    // Create the table
    const table = await prisma.table.create({
      data: {
        name,
        capacity: parseInt(capacity.toString()),
        color: color || '#000000',
        eventId: params.id,
        hosts: Array.isArray(hostIds) && hostIds.length > 0 ? {
          connect: hostIds.map((id: string) => ({ id }))
        } : undefined
      },
      include: {
        hosts: true
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
    const { id: tableId, name, capacity, color, hostIds } = body
    
    console.log('Table update request body:', { 
      tableId,
      name, 
      capacity: typeof capacity === 'number' ? capacity : parseInt(capacity?.toString() || '0'), 
      color,
      hostIds: Array.isArray(hostIds) ? hostIds : [] 
    })
    
    if (!tableId) {
      console.error('Missing table ID in update request')
      return NextResponse.json({ error: 'Table ID is required for updates' }, { status: 400 })
    }
    
    if (!name || capacity === undefined || capacity === null) {
      console.error('Missing required fields:', { name, capacity })
      return NextResponse.json({ error: 'Name and capacity are required' }, { status: 400 })
    }
    
    // Check if the table exists and belongs to this event
    const table = await prisma.table.findFirst({
      where: {
        id: tableId,
        eventId: params.id
      },
      include: {
        hosts: true,
        accessCodes: true
      }
    })
    
    if (!table) {
      console.error('Table not found:', tableId)
      return NextResponse.json({ error: 'Table not found or does not belong to this event' }, { status: 404 })
    }
    
    // Check if the new capacity is less than the current number of assigned guests
    const currentOccupancy = table.accessCodes.length
    const newCapacity = typeof capacity === 'number' ? capacity : parseInt(capacity.toString())
    
    if (newCapacity < currentOccupancy) {
      console.error('Cannot reduce capacity below current occupancy:', { 
        currentOccupancy, 
        requestedCapacity: newCapacity 
      })
      return NextResponse.json({ 
        error: 'Cannot reduce capacity below current occupancy', 
        currentOccupancy,
        requestedCapacity: newCapacity
      }, { status: 400 })
    }
    
    // Prepare the host connection data safely
    let hostConnection = {}
    if (Array.isArray(hostIds)) {
      hostConnection = {
        set: hostIds.map((id) => ({ id }))
      }
    } else {
      console.log('hostIds is not an array, using empty array instead')
      hostConnection = { set: [] }
    }
    
    try {
      // Update the table
      const updatedTable = await prisma.table.update({
        where: {
          id: tableId
        },
        data: {
          name,
          capacity: newCapacity,
          color: color || '#000000',
          hosts: hostConnection
        },
        include: {
          hosts: true,
          accessCodes: true
        }
      })
      
      console.log('Table updated successfully:', updatedTable.id)
      
      return NextResponse.json({ 
        success: true,
        table: {
          ...updatedTable,
          occupancy: updatedTable.accessCodes.length,
          vacancy: updatedTable.capacity - updatedTable.accessCodes.length
        }
      })
    } catch (prismaError) {
      console.error('Prisma error updating table:', prismaError)
      return NextResponse.json({ 
        error: 'Database error updating table', 
        details: prismaError instanceof Error ? prismaError.message : 'Unknown error'
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error updating table:', error)
    return NextResponse.json({ 
      error: 'Failed to update table',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// DELETE: Delete a table
export async function DELETE(
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
    
    // Delete the table
    await prisma.table.delete({
      where: {
        id: params.tableId
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
