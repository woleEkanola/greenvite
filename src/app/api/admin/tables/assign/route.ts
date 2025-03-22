import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface AccessCode {
  id: string;
  code: string;
  type: string;
  name: string;
  isAdmitted: boolean;
  admittedAt: Date | null;
  isSent: boolean;
  sentAt: Date | null;
  tableId: string | null;
  rsvpId: string;
  createdAt: Date;
  updatedAt: Date;
}

interface TableWithCount {
  id: string;
  name: string;
  capacity: number;
  current_assigned: bigint;
  createdAt: Date;
  updatedAt: Date;
}

// POST /api/admin/tables/assign - Assign access codes to a table
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tableId, accessCodeIds } = await req.json();

    if (!tableId || !accessCodeIds || !Array.isArray(accessCodeIds)) {
      return NextResponse.json(
        { error: 'Table ID and access code IDs array are required' },
        { status: 400 }
      );
    }

    // Get the table to check capacity
    const tables = await prisma.$queryRaw<TableWithCount[]>`
      SELECT 
        t.*,
        COUNT(ac.id) as current_assigned
      FROM "Table" t
      LEFT JOIN "AccessCode" ac ON ac."tableId" = t.id
      WHERE t.id = ${tableId}
      GROUP BY t.id
    `;

    if (!tables || tables.length === 0) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    const table = tables[0];
    const currentAssigned = Number(table.current_assigned);

    // Check if assigning these access codes would exceed capacity
    if (currentAssigned + accessCodeIds.length > table.capacity) {
      return NextResponse.json(
        { error: 'Table capacity would be exceeded' },
        { status: 400 }
      );
    }

    // Update all access codes' tableId
    const updates = await Promise.all(
      accessCodeIds.map(async (accessCodeId) => {
        const result = await prisma.$queryRaw<AccessCode[]>`
          UPDATE "AccessCode"
          SET "tableId" = ${tableId}
          WHERE id = ${accessCodeId}
          RETURNING *
        `;
        return result[0];
      })
    );

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error('Error assigning access codes to table:', error);
    return NextResponse.json(
      { error: 'Failed to assign access codes to table' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tables/assign - Remove access codes from a table
export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { accessCodeIds } = await req.json();

    if (!accessCodeIds || !Array.isArray(accessCodeIds)) {
      return NextResponse.json(
        { error: 'Access code IDs array is required' },
        { status: 400 }
      );
    }

    // Remove table assignments for the specified access codes
    const updates = await Promise.all(
      accessCodeIds.map(async (accessCodeId) => {
        const result = await prisma.$queryRaw<AccessCode[]>`
          UPDATE "AccessCode"
          SET "tableId" = NULL
          WHERE id = ${accessCodeId}
          RETURNING *
        `;
        return result[0];
      })
    );

    return NextResponse.json({ success: true, updates });
  } catch (error) {
    console.error('Error removing access codes from table:', error);
    return NextResponse.json(
      { error: 'Failed to remove access codes from table' },
      { status: 500 }
    );
  }
}
