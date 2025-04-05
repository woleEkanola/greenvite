import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

// GET /api/admin/events/[id]/floor-plans
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const eventId = params.id;
    
    // Check if user has access to this event
    if (!session.user.id) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid user session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const hasAccess = await canAccessEvent(session.user.id, eventId);
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get all floor plans for this event
    const floorPlans = await prisma.floorPlan.findMany({
      where: {
        eventId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return new NextResponse(
      JSON.stringify({ floorPlans }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching floor plans:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST /api/admin/events/[id]/floor-plans
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const eventId = params.id;
    
    // Check if user has access to this event
    if (!session.user.id) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid user session' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const hasAccess = await canAccessEvent(session.user.id, eventId);
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const body = await request.json();
    const { name, description, imageUrl, layout, isDefault } = body;

    // Validate required fields
    if (!name || !layout) {
      return new NextResponse(
        JSON.stringify({ error: 'Name and layout are required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If this floor plan is being set as default, unset any existing default floor plans
    if (isDefault) {
      await prisma.floorPlan.updateMany({
        where: {
          eventId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    // Create the floor plan
    const floorPlan = await prisma.floorPlan.create({
      data: {
        name,
        description,
        imageUrl,
        layout,
        isDefault: isDefault || false,
        eventId
      }
    });
    
    return new NextResponse(
      JSON.stringify(floorPlan),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating floor plan:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
