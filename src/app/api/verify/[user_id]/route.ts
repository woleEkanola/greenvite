import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Handle GET requests (when user clicks link from email or WhatsApp)
export async function GET(
  request: NextRequest,
  { params }: { params: { user_id: string } }
) {
  try {
    const userId = params.user_id;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      // Redirect to error page or login with error parameter
      return NextResponse.redirect(new URL(`/login?error=user-not-found`, request.url));
    }

    // Update user verification status using raw SQL
    await prisma.$executeRaw`UPDATE "User" SET "verified" = true WHERE "id" = ${userId}`;

    // Redirect to login page with success message
    return NextResponse.redirect(new URL(`/login?verified=true`, request.url));
  } catch (error) {
    console.error('Error verifying user:', error);
    // Redirect to error page or login with error parameter
    return NextResponse.redirect(new URL(`/login?error=verification-failed`, request.url));
  }
}

// Handle POST requests (from frontend verification page)
export async function POST(
  request: NextRequest,
  { params }: { params: { user_id: string } }
) {
  try {
    const userId = params.user_id;

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update user verification status using Prisma's raw SQL execution to avoid type issues
    // This is a workaround for TypeScript issues with the verified field
    await prisma.$executeRaw`UPDATE "User" SET "verified" = true WHERE "id" = ${userId}`;

    return NextResponse.json(
      { message: 'User verified successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error verifying user:', error);
    return NextResponse.json(
      { error: 'Failed to verify user' },
      { status: 500 }
    );
  }
}
