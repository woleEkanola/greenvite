import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/souvenirs - List all souvenirs
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const souvenirs = await prisma.souvenir.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(souvenirs);
  } catch (error) {
    console.error('Error fetching souvenirs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch souvenirs' },
      { status: 500 }
    );
  }
}

// POST /api/admin/souvenirs - Create a new souvenir
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, image, quantity } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const souvenir = await prisma.souvenir.create({
      data: {
        name,
        description,
        image,
        quantity: quantity || 0
      }
    });

    return NextResponse.json(souvenir);
  } catch (error) {
    console.error('Error creating souvenir:', error);
    return NextResponse.json(
      { error: 'Failed to create souvenir' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/souvenirs/[id] - Update a souvenir
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, image, quantity } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    const souvenir = await prisma.souvenir.update({
      where: { id: params.id },
      data: {
        name,
        description,
        image,
        quantity,
      },
      include: {
        assignments: true,
      },
    });

    return NextResponse.json(souvenir);
  } catch (error) {
    console.error('Error updating souvenir:', error);
    return NextResponse.json(
      { error: 'Failed to update souvenir' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/souvenirs/[id] - Delete a souvenir
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.souvenir.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting souvenir:', error);
    return NextResponse.json(
      { error: 'Failed to delete souvenir' },
      { status: 500 }
    );
  }
}
