import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getQrCode } from '@/lib/evolution-api/service';

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
    const result = await getQrCode(instanceName);

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('Error getting QR code:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}