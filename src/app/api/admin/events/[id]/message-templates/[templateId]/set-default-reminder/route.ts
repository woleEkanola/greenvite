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

// POST /api/admin/events/[id]/message-templates/[templateId]/set-default-reminder
export async function POST(
  request: Request,
  { params }: { params: { id: string, templateId: string } }
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
    const templateId = params.templateId
    
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

    // Check if the template exists and belongs to the event
    const template = await prisma.messageTemplate.findFirst({
      where: {
        id: templateId,
        eventId: eventId
      }
    })

    if (!template) {
      return new NextResponse(
        JSON.stringify({ error: 'Template not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // First, check if we need to add the isDefaultReminder field to the schema
    try {
      // Try to update a template with the new field to see if it exists
      await prisma.messageTemplate.update({
        where: { id: templateId },
        data: { isDefaultReminder: true }
      })
    } catch (error) {
      // If the field doesn't exist, we'll get an error
      console.error('isDefaultReminder field may not exist in the schema:', error)
      
      // Return a more helpful error message
      return new NextResponse(
        JSON.stringify({ 
          error: 'Database schema update required',
          details: 'The isDefaultReminder field needs to be added to the MessageTemplate model in the Prisma schema.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Use a transaction to update templates
    await prisma.$transaction([
      // First, unset default reminder for all templates in this event
      prisma.messageTemplate.updateMany({
        where: {
          eventId: eventId,
          isDefaultReminder: true
        },
        data: {
          isDefaultReminder: false
        }
      }),
      
      // Then, set the selected template as default reminder
      prisma.messageTemplate.update({
        where: {
          id: templateId
        },
        data: {
          isDefaultReminder: true
        }
      })
    ])

    return new NextResponse(
      JSON.stringify({
        success: true,
        message: 'Default reminder template set successfully'
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Error setting default reminder template:', errorMessage)
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Failed to set default reminder template',
        details: errorMessage
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
