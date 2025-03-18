import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST() {
  try {
    // Get the current session
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ success: true, message: 'Already logged out' });
    }

    // Return success response
    return NextResponse.json({ success: true, message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { success: false, message: 'An error occurred during logout' },
      { status: 500 }
    );
  }
}
