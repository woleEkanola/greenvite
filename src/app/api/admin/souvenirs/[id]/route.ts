import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/souvenirs/[id] - Get a specific souvenir
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const souvenir = await prisma.souvenir.findUnique({
      where: { id: params.id }
    });

    if (!souvenir) {
      return NextResponse.json({ error: 'Souvenir not found' }, { status: 404 });
    }

    return NextResponse.json(souvenir);
  } catch (error) {
    console.error('Error fetching souvenir:', error);
    return NextResponse.json(
      { error: 'Failed to fetch souvenir' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/souvenirs/[id] - Update a souvenir
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, description, image, quantity } = await req.json();

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
        quantity: quantity || 0
      }
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
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.souvenir.delete({
      where: { id: params.id }
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
