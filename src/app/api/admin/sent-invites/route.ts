import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  // Check authentication
  const session = await getServerSession(authOptions);
  if (!session) {
    console.log('[GET /api/admin/sent-invites] Unauthorized access attempt');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Get query parameters for filtering
    const url = new URL(request.url);
    const search = url.searchParams.get('search') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Build the query
    const whereClause: any = {};
    
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get total count for pagination
    const totalCount = await prisma.invite.count({
      where: whereClause,
    });

    // Fetch invites with their associated registration codes and RSVPs
    const invites = await prisma.invite.findMany({
      where: whereClause,
      include: {
        registrationCode: {
          include: {
            rsvp: true,
          },
        },
      },
      orderBy: {
        sentAt: 'desc',
      },
      skip,
      take: limit,
    });

    // Transform the data to include RSVP status
    const formattedInvites = invites.map(invite => {
      const hasRsvp = invite.registrationCode?.rsvp !== null;
      
      return {
        id: invite.id,
        name: invite.name,
        email: invite.email,
        phone: invite.phone,
        code: invite.code,
        sentAt: invite.sentAt,
        type: invite.type,
        status: invite.status,
        emailStatus: invite.emailStatus,
        smsStatus: invite.smsStatus,
        hasRsvp,
        rsvpDetails: invite.registrationCode?.rsvp ? {
          id: invite.registrationCode.rsvp.id,
          name: invite.registrationCode.rsvp.name,
          email: invite.registrationCode.rsvp.email,
          hasGuest: invite.registrationCode.rsvp.hasGuest,
          hasDriver: invite.registrationCode.rsvp.hasDriver,
          hasAide: invite.registrationCode.rsvp.hasAide,
          createdAt: invite.registrationCode.rsvp.createdAt,
        } : null,
      };
    });

    return NextResponse.json({
      invites: formattedInvites,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/sent-invites] Error fetching sent invites:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sent invites' },
      { status: 500 }
    );
  }
}
