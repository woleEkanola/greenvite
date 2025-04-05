import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const { code, status } = body
    
    if (!code || !status) {
      return NextResponse.json({ error: 'Code and status are required' }, { status: 400 })
    }
    
    // Validate the status
    const validStatuses = ['available', 'used', 'pending', 'invite-sent']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }
    
    // Find the registration code
    const registrationCode = await prisma.registrationCode.findFirst({
      where: {
        code,
        eventId: params.id
      }
    })
    
    if (!registrationCode) {
      return NextResponse.json({ error: 'Registration code not found or does not belong to this event' }, { status: 404 })
    }
    
    // Update the registration code status
    const updatedCode = await prisma.registrationCode.update({
      where: {
        id: registrationCode.id
      },
      data: {
        status,
        used: status === 'used'
      }
    })
    
    return NextResponse.json({
      success: true,
      code: updatedCode.code,
      status: updatedCode.status
    })
    
  } catch (error) {
    console.error('Error updating registration code status:', error)
    return NextResponse.json({ error: 'Failed to update registration code status' }, { status: 500 })
  }
}
