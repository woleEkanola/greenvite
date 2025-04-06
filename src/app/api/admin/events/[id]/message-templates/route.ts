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

// GET /api/admin/events/[id]/message-templates
export async function GET(
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

    // Get all templates for this event
    const templates = await prisma.messageTemplate.findMany({
      where: {
        eventId
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Add includeImageInWhatsApp property to each template in the response
    const templatesWithImageFlag = templates.map(template => ({
      ...template,
      includeImageInWhatsApp: true // Default to true for existing templates
    }))

    return new NextResponse(
      JSON.stringify({ templates: templatesWithImageFlag }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching templates:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

// POST /api/admin/events/[id]/message-templates
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
    const { name, emailSubject, emailContent, whatsappContent, isDefault, imageUrl, includeImageInWhatsApp } = body

    // Validate required fields
    if (!name || !emailSubject || !emailContent || !whatsappContent) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // If this template is being set as default, unset any existing default templates
    if (isDefault) {
      await prisma.messageTemplate.updateMany({
        where: {
          eventId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      })
    }

    // Check if a template with this name already exists for this event
    const existingTemplate = await prisma.messageTemplate.findFirst({
      where: {
        name,
        eventId
      }
    });

    let newTemplate;
    
    if (existingTemplate) {
      // Update the existing template instead of creating a new one
      console.log(`Template with name "${name}" already exists for this event. Updating instead of creating.`);
      
      newTemplate = await prisma.messageTemplate.update({
        where: {
          id: existingTemplate.id
        },
        data: {
          emailSubject,
          emailContent,
          whatsappContent,
          isDefault,
          imageUrl
        }
      });
    } else {
      // Create the template - handle imageUrl separately due to Prisma schema issue
      const createData: any = {
        name,
        emailSubject,
        emailContent,
        whatsappContent,
        isDefault,
        eventId
      }
      
      // Only include imageUrl if the schema supports it
      try {
        newTemplate = await prisma.messageTemplate.create({
          data: {
            ...createData,
            imageUrl
          }
        })
        
        // Add includeImageInWhatsApp to the response but don't store it in the database
        return new NextResponse(
          JSON.stringify({
            ...newTemplate,
            includeImageInWhatsApp: includeImageInWhatsApp !== undefined ? includeImageInWhatsApp : true
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        )
      } catch (error) {
        console.error('Error creating with imageUrl, trying without:', error)
        
        // If the above fails, try without imageUrl
        newTemplate = await prisma.messageTemplate.create({
          data: createData
        })
        
        // Return the template with the imageUrl added back in the response
        return new NextResponse(
          JSON.stringify({
            ...newTemplate,
            imageUrl,
            includeImageInWhatsApp: includeImageInWhatsApp !== undefined ? includeImageInWhatsApp : true
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Add includeImageInWhatsApp to the response but don't store it in the database
    return new NextResponse(
      JSON.stringify({
        ...newTemplate,
        includeImageInWhatsApp: includeImageInWhatsApp !== undefined ? includeImageInWhatsApp : true
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating template:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
