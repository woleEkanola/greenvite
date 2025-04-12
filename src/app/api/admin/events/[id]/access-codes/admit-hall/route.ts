import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Mark an access code as hall admitted
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
    
    // Check if the guest has been admitted at the gate first
    if (!accessCode.isAdmitted) {
      return NextResponse.json({ 
        error: 'Guest must be admitted at the gate first',
        requiresGateAdmission: true
      }, { status: 400 })
    }
    
    // Update the access code to mark as hall admitted
    const updatedAccessCode = await prisma.accessCode.update({
      where: {
        id: codeId
      },
      data: {
        isHallAdmitted: true,
        hallAdmittedAt: new Date()
      },
      include: {
        table: true,
        rsvp: true
      }
    })
    
    // Log the updated access code for debugging
    console.log('Successfully updated hall admission status:', {
      id: updatedAccessCode.id,
      code: updatedAccessCode.code,
      isHallAdmitted: updatedAccessCode.isHallAdmitted,
      hallAdmittedAt: updatedAccessCode.hallAdmittedAt
    });
    
    return NextResponse.json({ 
      success: true,
      message: 'Guest admitted to hall successfully',
      accessCode: {
        id: updatedAccessCode.id,
        code: updatedAccessCode.code,
        isAdmitted: updatedAccessCode.isAdmitted,
        admittedAt: updatedAccessCode.admittedAt,
        isHallAdmitted: updatedAccessCode.isHallAdmitted,
        hallAdmittedAt: updatedAccessCode.hallAdmittedAt,
        tableId: updatedAccessCode.tableId,
        tableName: updatedAccessCode.table?.name,
        rsvpId: updatedAccessCode.rsvpId,
        rsvpEmail: updatedAccessCode.rsvp?.email,
        rsvpPhone: updatedAccessCode.rsvp?.phone,
        name: updatedAccessCode.name
      },
      hasTable: !!updatedAccessCode.tableId
    })
    
  } catch (error) {
    console.error('Error admitting guest to hall:', error)
    return NextResponse.json({ error: 'Failed to admit guest to hall' }, { status: 500 })
  }
}
