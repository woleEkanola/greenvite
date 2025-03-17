import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient, Prisma } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

// GET all RSVPs
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const search = searchParams.get('search') || '';
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Build where clause for search
    let where: Prisma.RsvpWhereInput = {};
    
    if (search) {
      where = {
        OR: [
          { name: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
          { email: { contains: search, mode: 'insensitive' as Prisma.QueryMode } },
        ],
      };
    }
    
    // Get RSVPs with pagination and search
    const [rsvps, totalCount] = await Promise.all([
      prisma.rsvp.findMany({
        where,
        include: {
          registrationCode: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: limit,
      }),
      prisma.rsvp.count({ where }),
    ]);
    
    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limit);
    
    return NextResponse.json({
      rsvps,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages,
      },
    });
  } catch (error) {
    console.error('Error fetching RSVPs:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching RSVPs' },
      { status: 500 }
    );
  }
}
