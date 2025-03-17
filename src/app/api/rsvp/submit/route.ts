import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const { name, email, phone, hasGuest, hasDriver, hasAide, code } = await request.json();

    if (!name || !email || !code) {
      return NextResponse.json(
        { error: 'Name, email, and registration code are required' },
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

    // Create RSVP entry and update registration code status
    const rsvp = await prisma.$transaction(async (tx) => {
      // Create the RSVP
      const newRsvp = await tx.rsvp.create({
        data: {
          name,
          email,
          // Use type assertion since the Prisma client might not be updated
          // The phone field exists in the schema but TypeScript doesn't recognize it yet
          ...(phone ? { phone } : {}),
          hasGuest: !!hasGuest,
          hasDriver: !!hasDriver,
          hasAide: !!hasAide,
          registrationCode: {
            connect: { id: registrationCode.id }
          }
        } as any // Type assertion to bypass TypeScript error until Prisma client is regenerated
      });

      // Update the registration code status
      await tx.registrationCode.update({
        where: { id: registrationCode.id },
        data: {
          used: true,
          usedAt: new Date(),
          status: 'used'
        } as any // Type assertion to bypass TypeScript error until Prisma client is regenerated
      });

      return newRsvp;
    });

    return NextResponse.json({ 
      success: true, 
      rsvp 
    });
  } catch (error) {
    console.error('Error submitting RSVP:', error);
    return NextResponse.json(
      { error: 'An error occurred while submitting your RSVP' },
      { status: 500 }
    );
  }
}
