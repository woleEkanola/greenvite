import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch souvenirs for a specific event
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
    
    // Fetch souvenirs for this event
    const souvenirs = await prisma.souvenir.findMany({
      where: {
        eventId: params.id,
        OR: searchTerm ? [
          { name: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ] : undefined
      },
      include: {
        assignments: {
          include: {
            host: true,
            table: true,
            accessCode: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })
    
    return NextResponse.json({ 
      success: true,
      souvenirs
    })
    
  } catch (error) {
    console.error('Error fetching souvenirs:', error)
    return NextResponse.json({ error: 'Failed to fetch souvenirs' }, { status: 500 })
  }
}

// POST: Create a new souvenir for a specific event
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
    const { name, description, image, quantity } = body
    
    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    
    // Create the souvenir
    const souvenir = await prisma.souvenir.create({
      data: {
        name,
        description,
        image,
        quantity: quantity || 0,
        eventId: params.id
      }
    })
    
    return NextResponse.json({ 
      success: true,
      souvenir
    })
    
  } catch (error) {
    console.error('Error creating souvenir:', error)
    return NextResponse.json({ error: 'Failed to create souvenir' }, { status: 500 })
  }
}

// PUT: Update a souvenir
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
    const { souvenirId, name, description, image, quantity } = body
    
    if (!souvenirId || !name) {
      return NextResponse.json({ error: 'Souvenir ID and name are required' }, { status: 400 })
    }
    
    // Check if the souvenir exists and belongs to this event
    const existingSouvenir = await prisma.souvenir.findFirst({
      where: {
        id: souvenirId,
        eventId: params.id
      }
    })
    
    if (!existingSouvenir) {
      return NextResponse.json({ error: 'Souvenir not found' }, { status: 404 })
    }
    
    // Update the souvenir
    const souvenir = await prisma.souvenir.update({
      where: {
        id: souvenirId
      },
      data: {
        name,
        description,
        image,
        quantity: quantity || 0
      }
    })
    
    return NextResponse.json({ 
      success: true,
      souvenir
    })
    
  } catch (error) {
    console.error('Error updating souvenir:', error)
    return NextResponse.json({ error: 'Failed to update souvenir' }, { status: 500 })
  }
}

// DELETE: Delete a souvenir
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
    const { souvenirId } = body
    
    if (!souvenirId) {
      return NextResponse.json({ error: 'Souvenir ID is required' }, { status: 400 })
    }
    
    // Check if the souvenir exists and belongs to this event
    const existingSouvenir = await prisma.souvenir.findFirst({
      where: {
        id: souvenirId,
        eventId: params.id
      }
    })
    
    if (!existingSouvenir) {
      return NextResponse.json({ error: 'Souvenir not found' }, { status: 404 })
    }
    
    // First delete all assignments for this souvenir
    await prisma.souvenirAssignment.deleteMany({
      where: {
        souvenirId
      }
    })
    
    // Then delete the souvenir
    await prisma.souvenir.delete({
      where: {
        id: souvenirId
      }
    })
    
    return NextResponse.json({ 
      success: true
    })
    
  } catch (error) {
    console.error('Error deleting souvenir:', error)
    return NextResponse.json({ error: 'Failed to delete souvenir' }, { status: 500 })
  }
}
