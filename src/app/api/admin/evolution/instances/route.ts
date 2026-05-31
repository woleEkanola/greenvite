import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { listUserInstances, createInstanceForUser } from '@/lib/evolution-api/service';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const instances = await listUserInstances(session.user.id);

    const instancesWithLiveStatus = await Promise.all(
      instances.map(async (inst) => {
        try {
          const { getConnectionStatus } = await import('@/lib/evolution-api/service');
          const liveStatus = await getConnectionStatus(inst.instanceName);
          return {
            ...inst,
            liveStatus,
          };
        } catch {
          return { ...inst, liveStatus: 'error' };
        }
      })
    );

    return NextResponse.json({ success: true, instances: instancesWithLiveStatus });
  } catch (error) {
    console.error('Error listing instances:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { instanceName } = body;

    if (!instanceName || typeof instanceName !== 'string') {
      return NextResponse.json(
        { error: 'instanceName is required' },
        { status: 400 }
      );
    }

    const alphanumericWithUnderscore = /^[a-zA-Z0-9_-]+$/;
    if (!alphanumericWithUnderscore.test(instanceName)) {
      return NextResponse.json(
        { error: 'instanceName must contain only letters, numbers, hyphens, and underscores' },
        { status: 400 }
      );
    }

    const result = await createInstanceForUser(session.user.id, instanceName);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error creating instance:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}