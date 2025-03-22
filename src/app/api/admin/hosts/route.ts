import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/hosts - List all hosts
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hosts = await prisma.host.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(hosts);
  } catch (error) {
    console.error('Error fetching hosts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch hosts' },
      { status: 500 }
    );
  }
}

// POST /api/admin/hosts - Create a new host
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, email, phone, role } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const existingHost = await prisma.host.findUnique({
      where: { email }
    });

    if (existingHost) {
      return NextResponse.json(
        { error: 'A host with this email already exists' },
        { status: 400 }
      );
    }

    const host = await prisma.host.create({
      data: {
        name,
        email,
        phone,
        role: role || 'host'
      }
    });

    return NextResponse.json(host);
  } catch (error) {
    console.error('Error creating host:', error);
    return NextResponse.json(
      { error: 'Failed to create host' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/hosts/[id] - Update a host
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
    const { name, email, phone, role } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: 'Name and email are required' },
        { status: 400 }
      );
    }

    const existingHost = await prisma.host.findUnique({
      where: { email },
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
      },
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
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.host.delete({
      where: { id: params.id },
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
