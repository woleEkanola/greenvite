import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch hosts for a specific event
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
    
    // Get query parameters
    const searchTerm = request.nextUrl.searchParams.get('search') || ''
    
    // Fetch hosts for this event
    const hosts = await prisma.host.findMany({
      where: {
        eventId: params.id,
        OR: searchTerm ? [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { email: { contains: searchTerm, mode: 'insensitive' } },
          { phone: { contains: searchTerm, mode: 'insensitive' } }
        ] : undefined
      },
      include: {
        tables: true
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    return NextResponse.json({ 
      success: true,
      hosts
    })
    
  } catch (error) {
    console.error('Error fetching hosts:', error)
    return NextResponse.json({ error: 'Failed to fetch hosts' }, { status: 500 })
  }
}

// POST: Create a new host for a specific event
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
    const { name, email, phone, role, tableIds } = body
    
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }
    
    // Check if a host with this email already exists for this event
    const existingHost = await prisma.host.findFirst({
      where: {
        email,
        eventId: params.id
      }
    })
    
    if (existingHost) {
      return NextResponse.json({ error: 'A host with this email already exists' }, { status: 400 })
    }
    
    // Create the host
    const host = await prisma.host.create({
      data: {
        name,
        email,
        phone,
        role: role || 'host',
        eventId: params.id,
        tables: tableIds && tableIds.length > 0 ? {
          connect: tableIds.map((id: string) => ({ id }))
        } : undefined
      },
      include: {
        tables: true
      }
    })
    
    return NextResponse.json({ 
      success: true,
      host
    })
    
  } catch (error) {
    console.error('Error creating host:', error)
    return NextResponse.json({ error: 'Failed to create host' }, { status: 500 })
  }
}

// PUT: Update a host
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string, hostId: string } }
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
    const { name, email, phone, role, tableIds } = body
    
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }
    
    // Check if the host exists and belongs to this event
    const host = await prisma.host.findFirst({
      where: {
        id: params.hostId,
        eventId: params.id
      }
    })
    
    if (!host) {
      return NextResponse.json({ error: 'Host not found or does not belong to this event' }, { status: 404 })
    }
    
    // Check if the email is being changed and if it conflicts with another host
    if (email !== host.email) {
      const existingHost = await prisma.host.findFirst({
        where: {
          email,
          eventId: params.id,
          id: { not: params.hostId }
        }
      })
      
      if (existingHost) {
        return NextResponse.json({ error: 'Another host with this email already exists' }, { status: 400 })
      }
    }
    
    // Update the host
    const updatedHost = await prisma.host.update({
      where: {
        id: params.hostId
      },
      data: {
        name,
        email,
        phone,
        role: role || 'host',
        tables: tableIds ? {
          set: tableIds.map((id: string) => ({ id }))
        } : undefined
      },
      include: {
        tables: true
      }
    })
    
    return NextResponse.json({ 
      success: true,
      host: updatedHost
    })
    
  } catch (error) {
    console.error('Error updating host:', error)
    return NextResponse.json({ error: 'Failed to update host' }, { status: 500 })
  }
}

// DELETE: Delete a host
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string, hostId: string } }
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
    
    // Check if the host exists and belongs to this event
    const host = await prisma.host.findFirst({
      where: {
        id: params.hostId,
        eventId: params.id
      }
    })
    
    if (!host) {
      return NextResponse.json({ error: 'Host not found or does not belong to this event' }, { status: 404 })
    }
    
    // Delete the host
    await prisma.host.delete({
      where: {
        id: params.hostId
      }
    })
    
    return NextResponse.json({ 
      success: true,
      message: 'Host deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting host:', error)
    return NextResponse.json({ error: 'Failed to delete host' }, { status: 500 })
  }
}
