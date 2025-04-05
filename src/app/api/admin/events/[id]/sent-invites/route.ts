import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch sent invites for a specific event
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
    
    // Fetch sent invites for this event (using the Invite model with status='sent')
    const sentInvites = await prisma.invite.findMany({
      where: {
        Batch: {
          eventId: params.id
        },
        status: 'sent'
      },
      include: {
        Batch: true
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })
    
    return NextResponse.json({ 
      success: true,
      sentInvites
    })
    
  } catch (error) {
    console.error('Error fetching sent invites:', error)
    return NextResponse.json({ error: 'Failed to fetch sent invites' }, { status: 500 })
  }
}

// POST: Send invites for a specific event
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
    const { inviteIds, emailTemplate, whatsappTemplate } = body
    
    if (!inviteIds || !Array.isArray(inviteIds) || inviteIds.length === 0) {
      return NextResponse.json({ error: 'Invite IDs are required' }, { status: 400 })
    }
    
    if (!emailTemplate && !whatsappTemplate) {
      return NextResponse.json({ error: 'At least one template (email or WhatsApp) is required' }, { status: 400 })
    }
    
    // Get the invites to send
    const invites = await prisma.invite.findMany({
      where: {
        id: {
          in: inviteIds
        },
        Batch: {
          eventId: params.id
        }
      }
    })
    
    if (invites.length === 0) {
      return NextResponse.json({ error: 'No valid invites found' }, { status: 404 })
    }
    
    // In a real implementation, you would send emails or WhatsApp messages here
    // For now, we'll just mark them as sent
    
    const now = new Date()
    const sentInvites = await Promise.all(
      invites.map(invite => 
        prisma.invite.update({
          where: { id: invite.id },
          data: {
            status: 'sent',
            updatedAt: now,
            errorMessage: null
          }
        })
      )
    )
    
    return NextResponse.json({ 
      success: true,
      message: `Sent ${sentInvites.length} invites.`,
      count: sentInvites.length,
      sentInvites
    })
    
  } catch (error) {
    console.error('Error sending invites:', error)
    return NextResponse.json({ error: 'Failed to send invites' }, { status: 500 })
  }
}

// DELETE: Delete a sent invite record
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
        Batch: {
          eventId: params.id
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
