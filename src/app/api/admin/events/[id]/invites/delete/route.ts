import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper function to check event access
async function canAccessEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    // Check if the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return false;
    }

    // Check if the user is the event owner
    if (event.ownerId === userId) {
      return true;
    }

    // Check if the user is an admin of the event
    const eventAdmin = await prisma.eventAdmin.findFirst({
      where: {
        eventId,
        userId
      }
    });

    if (eventAdmin) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking event access:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// POST /api/admin/events/[id]/invites/delete
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const eventId = params.id
    
    // Check if user has access to this event
    if (!session.user.id) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid user session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    const hasAccess = await canAccessEvent(session.user.id, eventId)
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await request.json()
    const { inviteIds } = body

    // Validate required fields
    if (!inviteIds || !Array.isArray(inviteIds) || inviteIds.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'No invites selected for deletion' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the invites to delete
    const invites = await prisma.invite.findMany({
      where: {
        id: { in: inviteIds },
        Batch: {
          eventId: eventId
        }
      },
      select: {
        id: true,
        code: true,
        batchId: true,
        registrationCodeId: true
      }
    })

    if (invites.length === 0) {
      return new NextResponse(
        JSON.stringify({ error: 'No matching invites found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the registration code IDs from the invites
    const registrationCodeIds = invites
      .map(invite => invite.registrationCodeId)
      .filter(Boolean) as string[];

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Delete the invites
      await tx.invite.deleteMany({
        where: {
          id: { in: inviteIds },
          Batch: {
            eventId: eventId
          }
        }
      })

      // Update the registration codes to be available again
      if (registrationCodeIds.length > 0) {
        await tx.registrationCode.updateMany({
          where: {
            id: { in: registrationCodeIds },
            eventId: eventId
          },
          data: {
            used: false,
            usedAt: null,
            status: 'available'
          }
        })
      }

      return { deleted: invites.length, codesFreed: registrationCodeIds.length }
    })

    return new NextResponse(
      JSON.stringify({
        success: true,
        deleted: result.deleted,
        codesFreed: result.codesFreed
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error deleting invites:', errorMessage)
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to delete invites',
        details: errorMessage
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
