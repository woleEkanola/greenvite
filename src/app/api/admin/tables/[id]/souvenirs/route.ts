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

    const { souvenirId, quantity } = await request.json();

    if (!souvenirId || !quantity) {
      return NextResponse.json(
        { error: 'Souvenir ID and quantity are required' },
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

    const souvenir = await prisma.souvenir.findUnique({
      where: { id: souvenirId },
      include: {
        assignments: true,
      },
    });

    if (!souvenir) {
      return NextResponse.json(
        { error: 'Souvenir not found' },
        { status: 404 }
      );
    }

    // Calculate total assigned quantity
    const totalAssigned = souvenir.assignments.reduce(
      (sum: number, assignment: { quantity: number }) => sum + assignment.quantity,
      0
    );

    if (totalAssigned + quantity > souvenir.quantity) {
      return NextResponse.json(
        { error: 'Not enough souvenirs available' },
        { status: 400 }
      );
    }

    // Create souvenir assignment
    const assignment = await prisma.souvenirAssignment.create({
      data: {
        quantity,
        tableId: params.id,
        souvenirId,
      },
    });

    return NextResponse.json({ success: true, assignment });
  } catch (error) {
    console.error('Error assigning souvenir to table:', error);
    return NextResponse.json(
      { error: 'Failed to assign souvenir to table' },
      { status: 500 }
    );
  }
}
