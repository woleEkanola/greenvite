import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getConnectionStatus } from '@/lib/evolution-api/service';

export async function GET(
  request: NextRequest,
  { params }: { params: { instanceName: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { instanceName } = params;
    const status = await getConnectionStatus(instanceName);

    return NextResponse.json({ success: true, instanceName, status });
  } catch (error) {
    console.error('Error checking connection status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}