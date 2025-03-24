import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Send access codes to guests
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
    const { codeIds } = body
    
    if (!codeIds || !Array.isArray(codeIds) || codeIds.length === 0) {
      return NextResponse.json({ error: 'Code IDs are required' }, { status: 400 })
    }
    
    // Get the access codes to send
    const accessCodes = await prisma.accessCode.findMany({
      where: {
        id: {
          in: codeIds
        },
        rsvp: {
          registrationCode: {
            eventId: params.id
          }
        }
      },
      include: {
        rsvp: true
      }
    })
    
    if (accessCodes.length === 0) {
      return NextResponse.json({ error: 'No valid access codes found' }, { status: 404 })
    }
    
    // In a real implementation, you would send emails or SMS here
    // For now, we'll just mark them as sent
    
    const now = new Date()
    const updatedCodes = await Promise.all(
      accessCodes.map(code => 
        prisma.accessCode.update({
          where: { id: code.id },
          data: {
            isSent: true,
            sentAt: now
          }
        })
      )
    )
    
    return NextResponse.json({ 
      success: true,
      message: `Sent ${updatedCodes.length} access codes.`,
      count: updatedCodes.length
    })
    
  } catch (error) {
    console.error('Error sending access codes:', error)
    return NextResponse.json({ error: 'Failed to send access codes' }, { status: 500 })
  }
}
