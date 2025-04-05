import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: Request,
  { params }: { params: { slug: string } }
) {
  try {
    // Fetch event by slug
    const event = await prisma.event.findUnique({
      where: { 
        slug: params.slug
      },
      select: {
        id: true,
        title: true,
        description: true,
        customizations: true,
        location: true,
        startDate: true,
        endDate: true,
        imageUrl: true,
        status: true,
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

    // Default customization data
    let customizationData = {
      pageTitle: event.pageTitle || event.title,
      pageDescription: event.pageDescription || null,
      headerImage: event.headerImage || event.imageUrl,
      logoImage: event.logoImage || null,
      primaryColor: event.primaryColor || '#10b981', // Default emerald color
      secondaryColor: event.secondaryColor || '#064e3b', // Default dark emerald
      fontFamily: event.fontFamily || 'Inter, sans-serif',
      showLocationMap: event.showLocationMap !== false,
      showAddToCalendar: event.showAddToCalendar !== false,
      customCss: event.customCss || null,
      isPagePublished: event.isPagePublished || event.status === 'published'
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

    // Check if the event page is published
    if (!customizationData.isPagePublished && event.status !== 'published') {
      return NextResponse.json({ error: 'Event page is not published' }, { status: 404 })
    }

    // Return event with customization data
    return NextResponse.json({
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      startDate: event.startDate,
      endDate: event.endDate,
      imageUrl: event.imageUrl,
      ...customizationData
    })
  } catch (error) {
    console.error('Error fetching event data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}