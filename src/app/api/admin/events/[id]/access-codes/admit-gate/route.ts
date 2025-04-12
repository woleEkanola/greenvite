import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Mark an access code as gate admitted
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
    const { codeId } = body
    
    if (!codeId) {
      return NextResponse.json({ error: 'Code ID is required' }, { status: 400 })
    }
    
    // Get the access code
    const accessCode = await prisma.accessCode.findFirst({
      where: {
        id: codeId,
        rsvp: {
          registrationCode: {
            eventId: params.id
          }
        }
      },
      include: {
        rsvp: true,
        table: true
      }
    })
    
    if (!accessCode) {
      return NextResponse.json({ error: 'Access code not found or does not belong to this event' }, { status: 404 })
    }
    
    // Mark the access code as gate admitted
    const now = new Date()
    const updatedCode = await prisma.accessCode.update({
      where: { id: accessCode.id },
      data: {
        isAdmitted: true,
        admittedAt: now
      },
      include: {
        table: true,
        rsvp: true
      }
    })
    
    return NextResponse.json({ 
      success: true,
      message: 'Guest admitted at gate successfully',
      accessCode: {
        id: updatedCode.id,
        code: updatedCode.code,
        isAdmitted: updatedCode.isAdmitted,
        admittedAt: updatedCode.admittedAt,
        tableId: updatedCode.tableId,
        tableName: updatedCode.table?.name,
        rsvpId: updatedCode.rsvpId,
        rsvpEmail: updatedCode.rsvp?.email,
        rsvpPhone: updatedCode.rsvp?.phone,
        name: updatedCode.name
      },
      hasTable: !!updatedCode.tableId
    })
    
  } catch (error) {
    console.error('Error admitting guest at gate:', error)
    return NextResponse.json({ error: 'Failed to admit guest at gate' }, { status: 500 })
  }
}
