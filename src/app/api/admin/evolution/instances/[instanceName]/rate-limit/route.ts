import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateRateLimitConfig } from '@/lib/evolution-api/service';
import type { RateLimitConfig } from '@/lib/evolution-api/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { instanceName: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { instanceName } = params;
    const body = await request.json();

    const config: Partial<RateLimitConfig> = {};
    if (body.messagesPerMinute !== undefined) {
      config.messagesPerMinute = Math.max(1, Math.min(30, Number(body.messagesPerMinute)));
    }
    if (body.delayBetweenMs !== undefined) {
      config.delayBetweenMs = Math.max(500, Math.min(30000, Number(body.delayBetweenMs)));
    }
    if (body.maxBurst !== undefined) {
      config.maxBurst = Math.max(1, Math.min(10, Number(body.maxBurst)));
    }

    await updateRateLimitConfig(instanceName, config);

    return NextResponse.json({
      success: true,
      instanceName,
      updatedConfig: config,
    });
  } catch (error) {
    console.error('Error updating rate limit config:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}