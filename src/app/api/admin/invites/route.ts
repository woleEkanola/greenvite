import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getInvites } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session) {
      console.error('[GET /api/admin/invites] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const invites = await getInvites();
    
    return NextResponse.json({ 
      success: true,
      invites
    });
  } catch (error) {
    console.error('[GET /api/admin/invites] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch invites' },
      { status: 500 }
    );
  }
}
