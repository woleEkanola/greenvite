import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateRandomCode } from '@/lib/utils'

// GET: Fetch registration codes for a specific event
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
    
    // Fetch registration codes for this event
    const registrationCodes = await prisma.registrationCode.findMany({
      where: {
        eventId: params.id
      },
      include: {
        rsvp: {
          select: {
            name: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })
    
    // Format the response
    const formattedCodes = registrationCodes.map(code => ({
      id: code.id,
      code: code.code,
      used: code.used,
      status: code.status,
      usedBy: code.rsvp?.name || null,
      usedAt: code.rsvp?.createdAt ? code.rsvp.createdAt.toISOString() : null
    }))
    
    return NextResponse.json(formattedCodes)
    
  } catch (error) {
    console.error('Error fetching registration codes:', error)
    return NextResponse.json({ error: 'Failed to fetch registration codes' }, { status: 500 })
  }
}

// POST: Generate new registration codes for a specific event
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
    const count = body.count || 1
    
    // Validate the count
    if (count < 1 || count > 100) {
      return NextResponse.json({ error: 'Count must be between 1 and 100' }, { status: 400 })
    }
    
    // Generate the registration codes
    const codes = []
    for (let i = 0; i < count; i++) {
      const code = generateRandomCode(6)
      codes.push({
        code,
        eventId: params.id,
        status: 'available'
      })
    }
    
    // Create the registration codes in the database
    const result = await prisma.registrationCode.createMany({
      data: codes
    })
    
    return NextResponse.json({ count: result.count })
    
  } catch (error) {
    console.error('Error generating registration codes:', error)
    return NextResponse.json({ error: 'Failed to generate registration codes' }, { status: 500 })
  }
}

// DELETE: Delete a registration code
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
    const codeId = body.codeId
    
    if (!codeId) {
      return NextResponse.json({ error: 'Code ID is required' }, { status: 400 })
    }
    
    // Check if the code exists and belongs to this event
    const code = await prisma.registrationCode.findFirst({
      where: {
        id: codeId,
        eventId: params.id
      }
    })
    
    if (!code) {
      return NextResponse.json({ error: 'Registration code not found or does not belong to this event' }, { status: 404 })
    }
    
    // Check if the code is used
    if (code.used) {
      return NextResponse.json({ error: 'Cannot delete a used registration code' }, { status: 400 })
    }
    
    // Delete the registration code
    await prisma.registrationCode.delete({
      where: {
        id: codeId
      }
    })
    
    return NextResponse.json({ success: true })
    
  } catch (error) {
    console.error('Error deleting registration code:', error)
    return NextResponse.json({ error: 'Failed to delete registration code' }, { status: 500 })
  }
}
