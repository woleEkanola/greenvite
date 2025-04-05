import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/superadmin/events - Get all events with owner and admin details
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is a superadmin
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const events = await prisma.event.findMany({
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
      orderBy: {
        createdAt: 'desc',
      },
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

// POST /api/superadmin/events - Create a new event
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is a superadmin
    if (!session || session.user.role !== 'SUPERADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const data = await request.json();
    const { title, description, location, startDate, endDate, imageUrl, status, slug, ownerId } = data;

    // Validate required fields
    if (!title || !startDate || !endDate || !ownerId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Check if slug is unique if provided
    if (slug) {
      const existingEvent = await prisma.event.findUnique({
        where: { slug },
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
        status,
        slug,
        ownerId,
      },
    });

    // Add the owner as an admin as well
    await prisma.eventAdmin.create({
      data: {
        userId: ownerId,
        eventId: event.id,
      },
    });

    return NextResponse.json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { error: 'Failed to create event' },
      { status: 500 }
    );
  }
}
