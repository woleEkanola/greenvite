import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { codeIds } = await req.json();

    if (!Array.isArray(codeIds) || codeIds.length === 0) {
      return NextResponse.json(
        { error: 'No access codes selected' },
        { status: 400 }
      );
    }

    // Get access codes with RSVP details
    const accessCodes = await prisma.AccessCode.findMany({
      where: {
        id: { in: codeIds },
        isSent: false
      },
      include: {
        rsvp: true
      }
    });

    const results = [];

    // Send emails with access codes
    for (const code of accessCodes) {
      try {
        // Send email
        await sendEmail({
          to: code.rsvp.email,
          subject: 'Your Event Access Code',
          html: `
            <h1>Hello ${code.name},</h1>
            <p>Here is your access code for the event:</p>
            <h2 style="font-family: monospace; background: #f0f0f0; padding: 10px; text-align: center;">
              ${code.code}
            </h2>
            <p>Please keep this code safe and present it at the event entrance.</p>
            <p>Type: ${code.type}</p>
          `
        });

        // Mark code as sent
        const updatedCode = await prisma.AccessCode.update({
          where: { id: code.id },
          data: {
            isSent: true,
            sentAt: new Date()
          }
        });

        results.push({
          id: code.id,
          success: true,
          message: 'Access code sent successfully'
        });
      } catch (error) {
        results.push({
          id: code.id,
          success: false,
          message: 'Failed to send access code'
        });
      }
    }

    return NextResponse.json({
      success: true,
      results
    });
  } catch (error) {
    console.error('Error sending access codes:', error);
    return NextResponse.json(
      { error: 'Failed to send access codes' },
      { status: 500 }
    );
  }
}
