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
    console.error('Error checking event access:', error);
    return false;
  }
}

// GET /api/admin/events/[id]/message-templates/[templateId]
export async function GET(
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
    const hasAccess = await canAccessEvent(session.user.id || '', eventId)
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the template
    const template = await prisma.messageTemplate.findUnique({
      where: {
        id: templateId,
        eventId
      }
    })

    if (!template) {
      return new NextResponse(
        JSON.stringify({ error: 'Template not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new NextResponse(
      JSON.stringify(template),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching template:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// PUT /api/admin/events/[id]/message-templates/[templateId]
export async function PUT(
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
    const hasAccess = await canAccessEvent(session.user.id || '', eventId)
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if template exists and belongs to the event
    const existingTemplate = await prisma.messageTemplate.findFirst({
      where: {
        id: templateId,
        eventId
      }
    })

    if (!existingTemplate) {
      return new NextResponse(
        JSON.stringify({ error: 'Template not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await request.json()
    const { name, emailSubject, emailContent, whatsappContent, isDefault, imageUrl } = body

    // Validate required fields
    if (!name || !emailSubject || !emailContent || !whatsappContent) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // If this template is being set as default, unset any existing default templates
    if (isDefault && !existingTemplate.isDefault) {
      await prisma.messageTemplate.updateMany({
        where: {
          eventId,
          isDefault: true,
          id: { not: templateId }
        },
        data: {
          isDefault: false
        }
      })
    }

    // Update the template - handle imageUrl separately due to Prisma schema issue
    const updateData: any = {
      name,
      emailSubject,
      emailContent,
      whatsappContent,
      isDefault,
    }
    
    // Try to update with imageUrl
    try {
      const updatedTemplate = await prisma.messageTemplate.update({
        where: { id: templateId },
        data: {
          ...updateData,
          imageUrl
        }
      })
      
      return new NextResponse(
        JSON.stringify(updatedTemplate),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    } catch (error) {
      console.error('Error updating with imageUrl, trying without:', error)
      
      // If the above fails, try without imageUrl
      const updatedTemplate = await prisma.messageTemplate.update({
        where: { id: templateId },
        data: updateData
      })
      
      // Return the template with the imageUrl added back in the response
      return new NextResponse(
        JSON.stringify({...updatedTemplate, imageUrl}),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error updating template:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// DELETE /api/admin/events/[id]/message-templates/[templateId]
export async function DELETE(
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
    const hasAccess = await canAccessEvent(session.user.id || '', eventId)
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if template exists and belongs to the event
    const existingTemplate = await prisma.messageTemplate.findFirst({
      where: {
        id: templateId,
        eventId
      }
    })

    if (!existingTemplate) {
      return new NextResponse(
        JSON.stringify({ error: 'Template not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // If this is the default template, we should not allow deletion
    if (existingTemplate.isDefault) {
      // Count total templates for this event
      const templateCount = await prisma.messageTemplate.count({
        where: { eventId }
      })
      
      // If this is the only template, allow deletion
      // Otherwise, don't allow deleting the default template
      if (templateCount > 1) {
        return new NextResponse(
          JSON.stringify({ error: 'Cannot delete the default template. Set another template as default first.' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Delete the template
    await prisma.messageTemplate.delete({
      where: { id: templateId }
    })

    return new NextResponse(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error deleting template:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}