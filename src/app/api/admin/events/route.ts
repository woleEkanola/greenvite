import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/events - Get all events for the current user
export async function GET(request: NextRequest) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Fetch all events where the user is either the owner or an admin
    const events = await prisma.event.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          {
            admins: {
              some: {
                userId: session.user.id
              }
            }
          }
        ]
      },
      include: {
        owner: {
          select: {
            id: true,
            username: true,
            name: true,
            email: true,
            role: true,
          },
        },
        admins: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { error: 'Failed to fetch events' },
      { status: 500 }
    );
  }
}

// POST /api/admin/events - Create a new event
export async function POST(request: NextRequest) {
  try {
    // Get the current user session
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user ID is available
    if (!session.user.id) {
      return NextResponse.json(
        { error: 'Invalid user session' },
        { status: 401 }
      );
    }

    // Parse the request body
    const { title, description, location, startDate, endDate, imageUrl, status, slug } = await request.json();

    // Validate required fields
    if (!title || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Title, start date, and end date are required' },
        { status: 400 }
      );
    }

    // Check if slug is unique if provided
    if (slug) {
      const existingEvent = await prisma.event.findFirst({
        where: {
          slug: {
            equals: slug
          }
        },
      });

      if (existingEvent) {
        return NextResponse.json(
          { error: 'Slug already in use' },
          { status: 400 }
        );
      }
    }

    // Create the event
    const event = await prisma.event.create({
      data: {
        title,
        description,
        location,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        imageUrl,
        status: status || 'draft',
        slug,
        ownerId: session.user.id,
      },
    });

    // Add the creator as an admin as well
    await prisma.eventAdmin.create({
      data: {
        userId: session.user.id,
        eventId: event.id,
      },
    });

    return NextResponse.json(event, { status: 201 });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
