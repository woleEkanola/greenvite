import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/hosts/[id] - Get a specific host
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const host = await prisma.host.findUnique({
      where: { id: params.id }
    });

    if (!host) {
      return NextResponse.json({ error: 'Host not found' }, { status: 404 });
    }

    return NextResponse.json(host);
  } catch (error) {
    console.error('Error fetching host:', error);
    return NextResponse.json(
      { error: 'Failed to fetch host' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/hosts/[id] - Update a host
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, email, phone, role } = await req.json();

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    // Check if email is already taken by another host
    const existingHost = await prisma.host.findUnique({
      where: { email }
    });

    if (existingHost && existingHost.id !== params.id) {
      return NextResponse.json(
        { error: 'A host with this email already exists' },
        { status: 400 }
      );
    }

    const host = await prisma.host.update({
      where: { id: params.id },
      data: {
        name,
        email,
        phone,
        role,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(host);
  } catch (error) {
    console.error('Error updating host:', error);
    return NextResponse.json(
      { error: 'Failed to update host' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/hosts/[id] - Delete a host
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.host.delete({
      where: { id: params.id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting host:', error);
    return NextResponse.json(
      { error: 'Failed to delete host' },
      { status: 500 }
    );
  }
}
