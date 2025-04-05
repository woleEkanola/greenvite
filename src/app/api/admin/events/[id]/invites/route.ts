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
    
    // Fetch invites for this event with detailed includes
    const invites = await prisma.invite.findMany({
      where: {
        batchId: {
          in: await prisma.batch.findMany({
            where: { eventId: params.id },
            select: { id: true }
          }).then(batches => batches.map(batch => batch.id))
        }
      },
      include: {
        registrationCode: {
          include: {
            rsvp: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Also fetch all RSVPs for this event to handle cases where the invite might not have the correct registrationCodeId
    const eventRsvps = await prisma.rsvp.findMany({
      where: {
        registrationCode: {
          eventId: params.id
        }
      },
      include: {
        registrationCode: true
      }
    })
    
    // Create a lookup map of registration codes by code
    const rsvpsByCode = new Map()
    eventRsvps.forEach(rsvp => {
      if (rsvp.registrationCode?.code) {
        rsvpsByCode.set(rsvp.registrationCode.code, rsvp)
      }
    })
    
    // Map the invites to include RSVP status
    const mappedInvites = invites.map(invite => {
      // Default RSVP status
      let rsvpStatus = "not_responded"
      
      // Get the invite code (either from invite.code or from the registration code)
      const inviteCode = invite.code || invite.registrationCode?.code
      
      // First check if the invite has a registration code with an RSVP
      if (invite.registrationCode?.rsvp) {
        rsvpStatus = "attending"
      } 
      // Then check if the invite code matches a registration code with an RSVP
      else if (inviteCode && rsvpsByCode.has(inviteCode)) {
        rsvpStatus = "attending"
      }
      // Finally check if the registration code was used but no RSVP record exists
      else if (invite.registrationCode?.used) {
        rsvpStatus = "pending"
      }
      
      return {
        id: invite.id,
        name: invite.name,
        email: invite.email,
        phone: invite.phone,
        type: invite.type,
        status: invite.status,
        rsvpStatus,
        code: inviteCode || '',
        emailStatus: invite.emailStatus || 'not_sent',
        whatsappStatus: invite.whatsappStatus || 'not_sent',
        createdAt: invite.createdAt,
        updatedAt: invite.updatedAt
      }
    })
    
    // For debugging
    console.log(`Found ${mappedInvites.length} invites for event ${params.id}`)
    
    return NextResponse.json({ 
      success: true,
      invites: mappedInvites
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
    
    // Check if we're creating a single invite or multiple invites
    if (body.invites && Array.isArray(body.invites)) {
      // Handle batch creation of invites
      const { invites, batchId } = body
      
      if (!invites || invites.length === 0) {
        return NextResponse.json({ error: 'Invites are required' }, { status: 400 })
      }
      
      // Use existing batch if provided, otherwise create a new one
      let batch;
      if (batchId) {
        batch = await prisma.batch.findUnique({
          where: { id: batchId }
        });
        
        if (!batch) {
          return NextResponse.json({ error: 'Batch not found' }, { status: 404 })
        }
      } else {
        // Create a batch for these invites
        batch = await prisma.batch.create({
          data: {
            name: `Batch ${new Date().toISOString()}`,
            status: 'pending',
            totalInvites: invites.length,
            eventId: params.id
          }
        })
      }
      
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
              code: invite.code,
              emailStatus: invite.emailStatus,
              whatsappStatus: invite.whatsappStatus,
              errorMessage: invite.errorMessage,
              eventId: params.id,
              batchId: batch.id
            }
          })
        )
      )
      
      return NextResponse.json({ 
        success: true,
        invites: createdInvites,
        batch
      })
    } else {
      // Handle single invite creation
      const { name, email, phone, type, code, emailStatus, whatsappStatus, errorMessage, batchId } = body
      
      // Validate required fields
      if (!name && !email && !phone) {
        return NextResponse.json({ error: 'At least one of name, email, or phone is required' }, { status: 400 })
      }
      
      // Create the invite
      const invite = await prisma.invite.create({
        data: {
          name,
          email,
          phone,
          type: type || 'both',
          status: 'pending',
          code,
          emailStatus,
          whatsappStatus,
          errorMessage,
          eventId: params.id,
          batchId
        }
      })
      
      return NextResponse.json({ 
        success: true,
        invite
      })
    }
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
        eventId: params.id
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
