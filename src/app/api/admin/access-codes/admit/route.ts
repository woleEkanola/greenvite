import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();

    // Find and validate access code
    const accessCode = await prisma.accessCode.findUnique({
      where: { code },
      include: { rsvp: true }
    });

    if (!accessCode) {
      return NextResponse.json(
        { error: 'Access code not found' },
        { status: 404 }
      );
    }

    if (accessCode.isAdmitted) {
      return NextResponse.json(
        { error: 'Access code already used' },
        { status: 400 }
      );
    }

    // Mark code as admitted
    const updatedCode = await prisma.accessCode.update({
      where: { id: accessCode.id },
      data: {
        isAdmitted: true,
        admittedAt: new Date()
      },
      include: { rsvp: true }
    });

    return NextResponse.json({
      success: true,
      message: 'Visitor admitted successfully',
      accessCode: updatedCode
    });
  } catch (error) {
    console.error('Error admitting visitor:', error);
    return NextResponse.json(
      { error: 'Failed to admit visitor' },
      { status: 500 }
    );
  }
}
