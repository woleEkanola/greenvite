import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/admin/events/[id]/admins - Get all admins for an event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // Check if event exists and the user has access to it
    const event = await prisma.event.findFirst({
      where: {
        id,
        ownerId: session.user.id, // Only the owner can view admins
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found or access denied. Only the event owner can view admins.' }, { status: 403 });
    }

    // Get all admins for the event
    const admins = await prisma.eventAdmin.findMany({
      where: { eventId: id },
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
    });

    return NextResponse.json(admins);
  } catch (error) {
    console.error('Error fetching event admins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event admins' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/events/[id]/admins - Update admins for an event
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;
    const { adminIds } = await request.json();

    if (!Array.isArray(adminIds)) {
      return NextResponse.json(
        { error: 'adminIds must be an array' },
        { status: 400 }
      );
    }

    // Check if event exists and the user is the owner
    const event = await prisma.event.findFirst({
      where: {
        id,
        ownerId: session.user.id
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found or you are not the owner' }, { status: 404 });
    }

    // Make sure owner is always included in admins
    if (!adminIds.includes(event.ownerId)) {
      adminIds.push(event.ownerId);
    }

    // Get current admins
    const currentAdmins = await prisma.eventAdmin.findMany({
      where: { eventId: id },
      select: { userId: true },
    });
    const currentAdminIds = currentAdmins.map(admin => admin.userId);

    // Determine which admins to add and which to remove
    const adminsToAdd = adminIds.filter(userId => !currentAdminIds.includes(userId));
    const adminsToRemove = currentAdminIds.filter(userId => !adminIds.includes(userId));

    // Start a transaction to update admins
    await prisma.$transaction(async (tx) => {
      // Remove admins that are no longer in the list
      if (adminsToRemove.length > 0) {
        await tx.eventAdmin.deleteMany({
          where: {
            eventId: id,
            userId: { in: adminsToRemove },
          },
        });
      }

      // Add new admins
      for (const userId of adminsToAdd) {
        await tx.eventAdmin.create({
          data: {
            eventId: id,
            userId,
          },
        });
      }
    });

    // Get updated admins
    const updatedAdmins = await prisma.eventAdmin.findMany({
      where: { eventId: id },
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
    });

    return NextResponse.json(updatedAdmins);
  } catch (error) {
    console.error('Error updating event admins:', error);
    return NextResponse.json(
      { error: 'Failed to update event admins' },
      { status: 500 }
    );
  }
}
