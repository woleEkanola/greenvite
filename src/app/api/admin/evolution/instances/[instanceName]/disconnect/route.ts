import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { disconnectInstance } from '@/lib/evolution-api/service';

export async function POST(
  request: NextRequest,
  { params }: { params: { instanceName: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { instanceName } = params;
    await disconnectInstance(instanceName);

    return NextResponse.json({
      success: true,
      instanceName,
      status: 'disconnected',
    });
  } catch (error) {
    console.error('Error disconnecting instance:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { instanceName: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { instanceName } = params;
    const { deleteInstanceRecord } = await import('@/lib/evolution-api/service');
    await deleteInstanceRecord(instanceName);

    return NextResponse.json({
      success: true,
      message: `Instance ${instanceName} deleted`,
    });
  } catch (error) {
    console.error('Error deleting instance:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}