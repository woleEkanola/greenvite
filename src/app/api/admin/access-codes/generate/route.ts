import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST() {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all RSVPs without access codes
    const rsvps = await prisma.rsvp.findMany({
      where: {
        accessCodes: {
          none: {}
        }
      }
    });

    const generatedCodes = [];

    // Generate access codes for each RSVP
    for (const rsvp of rsvps) {
      // Generate primary code
      const primaryCode = await prisma.accessCode.create({
        data: {
          code: nanoid(8),
          rsvpId: rsvp.id,
          type: 'primary',
          name: rsvp.name
        }
      });
      generatedCodes.push(primaryCode);

      // Generate guest code if needed
      if (rsvp.hasGuest) {
        const guestCode = await prisma.accessCode.create({
          data: {
            code: nanoid(8),
            rsvpId: rsvp.id,
            type: 'guest',
            name: `${rsvp.name}'s Guest`
          }
        });
        generatedCodes.push(guestCode);
      }

      // Generate driver code if needed
      if (rsvp.hasDriver) {
        const driverCode = await prisma.accessCode.create({
          data: {
            code: nanoid(8),
            rsvpId: rsvp.id,
            type: 'driver',
            name: `${rsvp.name}'s Driver`
          }
        });
        generatedCodes.push(driverCode);
      }

      // Generate aide code if needed
      if (rsvp.hasAide) {
        const aideCode = await prisma.accessCode.create({
          data: {
            code: nanoid(8),
            rsvpId: rsvp.id,
            type: 'aide',
            name: `${rsvp.name}'s Aide`
          }
        });
        generatedCodes.push(aideCode);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Generated ${generatedCodes.length} access codes`,
      codes: generatedCodes
    });
  } catch (error) {
    console.error('Error generating access codes:', error);
    return NextResponse.json(
      { error: 'Failed to generate access codes' },
      { status: 500 }
    );
  }
}
