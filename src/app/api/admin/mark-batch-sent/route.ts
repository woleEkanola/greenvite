import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      console.error('[POST /api/admin/mark-batch-sent] Unauthorized access attempt');
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { batchId } = await request.json();
    
    if (!batchId) {
      return NextResponse.json(
        { success: false, error: 'Batch ID is required' },
        { status: 400 }
      );
    }

    // Update the batch status to 'sent'
    const updatedBatch = await prisma.batch.update({
      where: { id: batchId },
      data: { status: 'sent' }
    });

    // Update all invites in this batch to 'sent' status
    const updatedInvites = await prisma.invite.updateMany({
      where: { batchId },
      data: { status: 'sent' }
    });

    return NextResponse.json({
      success: true,
      message: `Batch ${batchId} marked as sent`,
      batch: updatedBatch,
      invitesUpdated: updatedInvites.count
    });
  } catch (error) {
    console.error('[POST /api/admin/mark-batch-sent] Error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to mark batch as sent',
        errorType: error instanceof Error ? error.constructor.name : 'Unknown'
      },
      { status: 500 }
    );
  }
}
