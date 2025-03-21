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

    // Get all access codes with their RSVP details
    const accessCodes = await prisma.AccessCode.findMany({
      include: {
        rsvp: {
          select: {
            name: true,
            email: true,
            phone: true
          }
        }
      },
      orderBy: [
        { isAdmitted: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    return NextResponse.json({
      success: true,
      accessCodes
    });
  } catch (error) {
    console.error('Error fetching access codes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch access codes' },
      { status: 500 }
    );
  }
}
