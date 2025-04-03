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
    const isAdmin = await prisma.eventAdmin.findFirst({
      where: {
        eventId: eventId,
        userId: userId
      }
    });

    return !!isAdmin;
  } catch (error) {
    console.error('Error checking event access:', error);
    return false;
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has access to this event
    const hasAccess = await canAccessEvent(session.user.id, params.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Fetch event
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        title: true,
        description: true,
        customizations: true,
        imageUrl: true,
        pageTitle: true,
        pageDescription: true,
        headerImage: true,
        logoImage: true,
        primaryColor: true,
        secondaryColor: true,
        fontFamily: true,
        showLocationMap: true,
        showAddToCalendar: true,
        customCss: true,
        isPagePublished: true
      }
    })

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Parse customization data if available
    let customizationData = {
      pageTitle: event.pageTitle || event.title,
      pageDescription: event.pageDescription || event.description,
      headerImage: event.headerImage || event.imageUrl,
      logoImage: event.logoImage,
      primaryColor: event.primaryColor || '#10b981',
      secondaryColor: event.secondaryColor || '#064e3b',
      fontFamily: event.fontFamily || 'Inter, sans-serif',
      showLocationMap: event.showLocationMap,
      showAddToCalendar: event.showAddToCalendar,
      customCss: event.customCss,
      isPagePublished: event.isPagePublished
    };

    // If we have customizations data in JSON format, use that
    if (event.customizations) {
      try {
        const parsedCustomizations = JSON.parse(event.customizations);
        customizationData = {
          ...customizationData,
          ...parsedCustomizations
        };
      } catch (error) {
        console.error('Error parsing customizations data:', error);
      }
    }

    // Return event with customization data
    return NextResponse.json({
      id: event.id,
      title: event.title,
      description: event.description,
      ...customizationData
    })
  } catch (error) {
    console.error('Error fetching event page settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has access to this event
    const hasAccess = await canAccessEvent(session.user.id, params.id)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get request body
    const data = await request.json()
    
    // Validate required fields
    if (!params.id) {
      return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
    }

    console.log('Received event page settings:', JSON.stringify(data, null, 2))

    try {
      // First, get the current event data
      const event = await prisma.event.findUnique({
        where: { id: params.id }
      });

      if (!event) {
        return NextResponse.json({ error: 'Event not found' }, { status: 404 })
      }

      // Prepare the customization data
      const customizationData = {
        pageTitle: data.pageTitle || null,
        pageDescription: data.pageDescription || null,
        headerImage: data.headerImage || null,
        logoImage: data.logoImage || null,
        primaryColor: data.primaryColor || null,
        secondaryColor: data.secondaryColor || null,
        fontFamily: data.fontFamily || null,
        showLocationMap: data.showLocationMap === false ? false : true,
        showAddToCalendar: data.showAddToCalendar === false ? false : true,
        customCss: data.customCss || null,
        isPagePublished: data.isPagePublished === true ? true : false
      };

      console.log('Saving customization data:', JSON.stringify(customizationData, null, 2));

      // Update the event with customization data
      await prisma.event.update({
        where: { id: params.id },
        data: { 
          customizations: JSON.stringify(customizationData),
          // Also update the individual fields for backward compatibility
          pageTitle: customizationData.pageTitle,
          pageDescription: customizationData.pageDescription,
          headerImage: customizationData.headerImage,
          logoImage: customizationData.logoImage,
          primaryColor: customizationData.primaryColor,
          secondaryColor: customizationData.secondaryColor,
          fontFamily: customizationData.fontFamily,
          showLocationMap: customizationData.showLocationMap,
          showAddToCalendar: customizationData.showAddToCalendar,
          customCss: customizationData.customCss,
          isPagePublished: customizationData.isPagePublished
        }
      });

      // Return the updated event with the customization data
      const updatedEvent = {
        id: event.id,
        title: event.title,
        description: event.description,
        ...customizationData
      };

      return NextResponse.json(updatedEvent)
    } catch (prismaError) {
      // Log the full error for debugging
      console.error('Prisma error updating event page settings:', prismaError)
      
      // Check for specific Prisma error types
      const errorMessage = prismaError instanceof Error ? prismaError.message : 'Unknown database error';
      const errorName = prismaError instanceof Error ? prismaError.name : 'Error';
      
      // Log the error details
      console.error(`Error type: ${errorName}, Message: ${errorMessage}`);
      
      return NextResponse.json({ 
        error: 'Database error updating event page settings',
        details: errorMessage
      }, { status: 500 })
    }
  } catch (error) {
    console.error('Error updating event page settings:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
