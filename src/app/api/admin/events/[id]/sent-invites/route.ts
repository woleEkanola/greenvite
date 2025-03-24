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
    
    // Fetch sent invites for this event
    const sentInvites = await prisma.sentInvite.findMany({
      where: {
        eventId: params.id
      },
      include: {
        invite: true
      },
      orderBy: {
        sentAt: 'desc'
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
        eventId: params.id
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
        prisma.sentInvite.create({
          data: {
            inviteId: invite.id,
            eventId: params.id,
            sentAt: now,
            sentBy: session.user.id,
            emailTemplate: emailTemplate || null,
            whatsappTemplate: whatsappTemplate || null,
            status: 'sent'
          }
        })
      )
    )
    
    // Update the status of the invites
    await Promise.all(
      invites.map(invite => 
        prisma.invite.update({
          where: { id: invite.id },
          data: { status: 'sent' }
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
    const { sentInviteId } = body
    
    if (!sentInviteId) {
      return NextResponse.json({ error: 'Sent Invite ID is required' }, { status: 400 })
    }
    
    // Check if the sent invite exists and belongs to this event
    const sentInvite = await prisma.sentInvite.findFirst({
      where: {
        id: sentInviteId,
        eventId: params.id
      }
    })
    
    if (!sentInvite) {
      return NextResponse.json({ error: 'Sent invite not found or does not belong to this event' }, { status: 404 })
    }
    
    // Delete the sent invite
    await prisma.sentInvite.delete({
      where: {
        id: sentInviteId
      }
    })
    
    return NextResponse.json({ 
      success: true,
      message: 'Sent invite deleted successfully'
    })
    
  } catch (error) {
    console.error('Error deleting sent invite:', error)
    return NextResponse.json({ error: 'Failed to delete sent invite' }, { status: 500 })
  }
}
