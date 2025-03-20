import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPendingInvites } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      console.error('[GET /api/admin/retrigger] Unauthorized access attempt');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all invites that are part of batches not marked as 'sent'
    const pendingInvites = await getPendingInvites();
    
    return NextResponse.json(pendingInvites);
  } catch (error) {
    console.error('[GET /api/admin/retrigger] Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch pending invites',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      },
      { status: 500 }
    );
  }
}
