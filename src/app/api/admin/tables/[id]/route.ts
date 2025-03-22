import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/tables/[id] - Get a specific table
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const table = await prisma.$queryRaw`
      SELECT 
        t.*,
        json_agg(
          CASE WHEN ac.id IS NOT NULL THEN
            json_build_object(
              'id', ac.id,
              'code', ac.code,
              'type', ac.type,
              'name', ac.name,
              'isAdmitted', ac."isAdmitted",
              'admittedAt', ac."admittedAt",
              'isSent', ac."isSent",
              'sentAt', ac."sentAt",
              'rsvp', json_build_object(
                'id', r.id,
                'name', r.name,
                'email', r.email,
                'phone', r.phone,
                'hasGuest', r."hasGuest",
                'hasDriver', r."hasDriver",
                'hasAide', r."hasAide"
              )
            )
          ELSE NULL
          END
        ) FILTER (WHERE ac.id IS NOT NULL) as "accessCodes"
      FROM "Table" t
      LEFT JOIN "AccessCode" ac ON ac."tableId" = t.id
      LEFT JOIN "Rsvp" r ON ac."rsvpId" = r.id
      WHERE t.id = ${params.id}
      GROUP BY t.id
    `;

    if (!table || !Array.isArray(table) || table.length === 0) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, table: table[0] });
  } catch (error) {
    console.error('Error fetching table:', error);
    return NextResponse.json(
      { error: 'Failed to fetch table' },
      { status: 500 }
    );
  }
}

// PATCH /api/admin/tables/[id] - Update a table
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, capacity } = await req.json();

    const table = await prisma.$queryRaw`
      UPDATE "Table"
      SET
        name = COALESCE(${name}, name),
        capacity = COALESCE(${capacity ? parseInt(capacity) : null}, capacity),
        "updatedAt" = now()
      WHERE id = ${params.id}
      RETURNING *
    `;

    if (!table || !Array.isArray(table) || table.length === 0) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, table: table[0] });
  } catch (error) {
    console.error('Error updating table:', error);
    return NextResponse.json(
      { error: 'Failed to update table' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/tables/[id] - Delete a table
export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const table = await prisma.$queryRaw`
      DELETE FROM "Table"
      WHERE id = ${params.id}
      RETURNING *
    `;

    if (!table || !Array.isArray(table) || table.length === 0) {
      return NextResponse.json({ error: 'Table not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting table:', error);
    return NextResponse.json(
      { error: 'Failed to delete table' },
      { status: 500 }
    );
  }
}
