import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all access codes with their RSVP and table details
    const accessCodes = await prisma.$queryRaw`
      SELECT 
        ac.*,
        r.name as rsvp_name,
        r.email as rsvp_email,
        r.phone as rsvp_phone,
        r."hasGuest" as rsvp_has_guest,
        r."hasDriver" as rsvp_has_driver,
        r."hasAide" as rsvp_has_aide,
        t.id as table_id,
        t.name as table_name,
        t.capacity as table_capacity
      FROM "AccessCode" ac
      LEFT JOIN "Rsvp" r ON ac."rsvpId" = r.id
      LEFT JOIN "Table" t ON ac."tableId" = t.id
      ORDER BY ac."isAdmitted" ASC, ac."createdAt" DESC
    `;

    // Transform the data to match the expected structure
    const formattedAccessCodes = (accessCodes as any[]).map((code) => ({
      id: code.id,
      code: code.code,
      rsvpId: code.rsvpId,
      type: code.type,
      name: code.name,
      isAdmitted: code.isAdmitted,
      admittedAt: code.admittedAt,
      createdAt: code.createdAt,
      updatedAt: code.updatedAt,
      isSent: code.isSent,
      sentAt: code.sentAt,
      tableId: code.tableId,
      rsvp: {
        id: code.rsvpId,
        name: code.rsvp_name,
        email: code.rsvp_email,
        phone: code.rsvp_phone,
        hasGuest: code.rsvp_has_guest,
        hasDriver: code.rsvp_has_driver,
        hasAide: code.rsvp_has_aide
      },
      table: code.table_id ? {
        id: code.table_id,
        name: code.table_name,
        capacity: code.table_capacity
      } : null
    }));

    return NextResponse.json({
      success: true,
      accessCodes: formattedAccessCodes
    });
  } catch (error) {
    console.error('Error fetching access codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch access codes' },
      { status: 500 }
    );
  }
}
