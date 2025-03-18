import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { code } = await request.json();

    if (!code) {
      return NextResponse.json(
        { error: 'Registration code is required' },
        { status: 400 }
      );
    }

    // Find the registration code in the database
    const registrationCode = await prisma.registrationCode.findUnique({
      where: { code },
      include: { rsvp: true }
    });

    // Check if code exists
    if (!registrationCode) {
      return NextResponse.json(
        { error: 'Invalid registration code' },
        { status: 400 }
      );
    }

    // Check if code has already been used
    if (registrationCode.used || registrationCode.rsvp) {
      return NextResponse.json(
        { error: 'This registration code has already been used' },
        { status: 400 }
      );
    }

    // The status field might not be recognized by TypeScript yet
    // but it exists in the database schema
    const regCodeWithStatus = registrationCode as any;
    
    // Check if code is available - both 'available' and 'invite-sent' status should be valid for RSVP
    // Only other statuses like 'used' or 'pending' should be rejected
    if (regCodeWithStatus.status && 
        regCodeWithStatus.status !== 'available' && 
        regCodeWithStatus.status !== 'invite-sent') {
      return NextResponse.json(
        { error: 'This registration code is not available for use' },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      code: registrationCode.code 
    });
  } catch (error) {
    console.error('Error validating code:', error);
    return NextResponse.json(
      { error: 'An error occurred while validating the code' },
      { status: 500 }
    );
  }
}
