import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface TableResponse {
  id: string;
  name: string;
  capacity: number;
  createdAt: Date;
  updatedAt: Date;
  accessCodes: Array<{
    id: string;
    code: string;
    type: string;
    name: string;
    isAdmitted: boolean;
    admittedAt: Date | null;
    isSent: boolean;
    sentAt: Date | null;
    rsvp: {
      id: string;
      name: string;
      email: string;
      phone: string | null;
      hasGuest: boolean;
      hasDriver: boolean;
      hasAide: boolean;
    };
  }>;
}

// GET /api/admin/tables - List all tables
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tables = await prisma.$queryRaw<TableResponse[]>`
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
      GROUP BY t.id
      ORDER BY t."createdAt" DESC
    `;

    return NextResponse.json({ success: true, tables });
  } catch (error) {
    console.error('Error fetching tables:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tables' },
      { status: 500 }
    );
  }
}

// POST /api/admin/tables - Create a new table
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, capacity } = await req.json();

    if (!name || !capacity) {
      return NextResponse.json(
        { error: 'Name and capacity are required' },
        { status: 400 }
      );
    }

    const newTable = await prisma.$queryRaw<TableResponse[]>`
      INSERT INTO "Table" (id, name, capacity, "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        ${name},
        ${parseInt(capacity)},
        now(),
        now()
      )
      RETURNING *
    `;

    return NextResponse.json({ success: true, table: newTable[0] });
  } catch (error) {
    console.error('Error creating table:', error);
    return NextResponse.json(
      { error: 'Failed to create table' },
      { status: 500 }
    );
  }
}
