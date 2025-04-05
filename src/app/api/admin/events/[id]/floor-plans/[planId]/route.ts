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

// GET /api/admin/events/[id]/floor-plans/[planId]
export async function GET(
  request: Request,
  { params }: { params: { id: string, planId: string } }
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
    const planId = params.planId;
    
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

    // Get the floor plan
    const floorPlan = await prisma.floorPlan.findUnique({
      where: {
        id: planId,
      }
    });

    if (!floorPlan || floorPlan.eventId !== eventId) {
      return new NextResponse(
        JSON.stringify({ error: 'Floor plan not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new NextResponse(
      JSON.stringify(floorPlan),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching floor plan:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// PUT /api/admin/events/[id]/floor-plans/[planId]
export async function PUT(
  request: Request,
  { params }: { params: { id: string, planId: string } }
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
    const planId = params.planId;
    
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

    // Check if floor plan exists and belongs to the event
    const existingFloorPlan = await prisma.floorPlan.findFirst({
      where: {
        id: planId,
        eventId
      }
    });

    if (!existingFloorPlan) {
      return new NextResponse(
        JSON.stringify({ error: 'Floor plan not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
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
    if (isDefault && !existingFloorPlan.isDefault) {
      await prisma.floorPlan.updateMany({
        where: {
          eventId,
          isDefault: true,
          id: { not: planId }
        },
        data: {
          isDefault: false
        }
      });
    }

    // Update the floor plan
    const updatedFloorPlan = await prisma.floorPlan.update({
      where: { id: planId },
      data: {
        name,
        description,
        imageUrl,
        layout,
        isDefault: isDefault || false
      }
    });
    
    return new NextResponse(
      JSON.stringify(updatedFloorPlan),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error updating floor plan:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// DELETE /api/admin/events/[id]/floor-plans/[planId]
export async function DELETE(
  request: Request,
  { params }: { params: { id: string, planId: string } }
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
    const planId = params.planId;
    
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

    // Check if floor plan exists and belongs to the event
    const existingFloorPlan = await prisma.floorPlan.findFirst({
      where: {
        id: planId,
        eventId
      }
    });

    if (!existingFloorPlan) {
      return new NextResponse(
        JSON.stringify({ error: 'Floor plan not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If this is the default floor plan and there are other floor plans,
    // set another one as default
    if (existingFloorPlan.isDefault) {
      const otherFloorPlan = await prisma.floorPlan.findFirst({
        where: {
          eventId,
          id: { not: planId }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (otherFloorPlan) {
        await prisma.floorPlan.update({
          where: { id: otherFloorPlan.id },
          data: { isDefault: true }
        });
      }
    }

    // Delete the floor plan
    await prisma.floorPlan.delete({
      where: { id: planId }
    });

    return new NextResponse(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error deleting floor plan:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
