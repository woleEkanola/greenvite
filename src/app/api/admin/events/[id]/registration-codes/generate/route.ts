import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper function to check event access
async function canAccessEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    // Check if the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return false;
    }

    // Check if the user is the event owner
    if (event.ownerId === userId) {
      return true;
    }

    // Check if the user is an admin of the event
    const eventAdmin = await prisma.eventAdmin.findFirst({
      where: {
        eventId,
        userId
      }
    });

    if (eventAdmin) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking event access:', error);
    return false;
  }
}

// Helper function to generate a random code
function generateRandomCode(length = 6) {
  const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed similar looking characters
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// POST /api/admin/events/[id]/registration-codes/generate
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const eventId = params.id
    
    // Check if user has access to this event
    const hasAccess = await canAccessEvent(session.user.id, eventId)
    if (!hasAccess) {
      return new NextResponse(
        JSON.stringify({ error: 'Forbidden' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const body = await request.json()
    const { count = 1, length = 6 } = body

    // Generate the requested number of codes
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const code = generateRandomCode(length);
      codes.push(code);
      
      // Optionally, you can store these codes in the database
      try {
        await prisma.registrationCode.create({
          data: {
            code,
            status: 'available',
            eventId
          }
        });
      } catch (error) {
        console.error(`Error creating registration code ${code}:`, error);
        // Continue generating codes even if one fails to be stored
      }
    }

    return new NextResponse(
      JSON.stringify(codes),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating registration codes:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
