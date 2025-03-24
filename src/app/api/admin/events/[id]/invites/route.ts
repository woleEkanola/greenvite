import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch invites for a specific event
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
    
    // Fetch invites for this event
    const invites = await prisma.invite.findMany({
      where: {
        event: {
          id: params.id
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    return NextResponse.json({ 
      success: true,
      invites
    })
    
  } catch (error) {
    console.error('Error fetching invites:', error)
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 })
  }
}

// POST: Create new invites for a specific event
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
    const { invites } = body
    
    if (!invites || !Array.isArray(invites) || invites.length === 0) {
      return NextResponse.json({ error: 'Invites are required' }, { status: 400 })
    }
    
    // Create a batch for these invites
    const batch = await prisma.batch.create({
      data: {
        name: `Batch ${new Date().toISOString()}`,
        status: 'pending',
        totalInvites: invites.length,
        event: {
          connect: {
            id: params.id
          }
        }
      }
    })
    
    // Create the invites
    const createdInvites = await Promise.all(
      invites.map(invite => 
        prisma.invite.create({
          data: {
            name: invite.name,
            email: invite.email,
            phone: invite.phone,
            type: invite.type,
            status: 'pending',
            event: {
              connect: {
                id: params.id
              }
            },
            Batch: {
              connect: {
                id: batch.id
              }
            }
          }
        })
      )
    )
    
    return NextResponse.json({ 
      success: true,
      count: createdInvites.length,
      invites: createdInvites,
      batch
    })
    
  } catch (error) {
    console.error('Error creating invites:', error)
    return NextResponse.json({ error: 'Failed to create invites' }, { status: 500 })
  }
}

// DELETE: Delete an invite
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
    const { inviteId } = body
    
    if (!inviteId) {
      return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 })
    }
    
    // Check if the invite exists and belongs to this event
    const invite = await prisma.invite.findFirst({
      where: {
        id: inviteId,
        event: {
          id: params.id
        }
      }
    })
    
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found or does not belong to this event' }, { status: 404 })
    }
    
    // Delete the invite
    await prisma.invite.delete({
      where: {
        id: inviteId
      }
    })
    
    return NextResponse.json({ 
      success: true,
      message: 'Invite deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting invite:', error)
    return NextResponse.json({ error: 'Failed to delete invite' }, { status: 500 })
  }
}
