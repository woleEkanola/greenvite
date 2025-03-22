import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { hostIds } = await request.json();

    if (!hostIds || !Array.isArray(hostIds)) {
      return NextResponse.json(
        { error: 'Host IDs are required' },
        { status: 400 }
      );
    }

    const table = await prisma.table.findUnique({
      where: { id: params.id },
    });

    if (!table) {
      return NextResponse.json(
        { error: 'Table not found' },
        { status: 404 }
      );
    }

    // Update table-host relationships
    await prisma.table.update({
      where: { id: params.id },
      data: {
        hosts: {
          connect: hostIds.map(id => ({ id })),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error assigning hosts to table:', error);
    return NextResponse.json(
      { error: 'Failed to assign hosts to table' },
      { status: 500 }
    );
  }
}
