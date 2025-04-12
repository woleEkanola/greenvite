import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { generateRandomCode } from '@/lib/utils'

// GET: Fetch access codes for a specific event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the user session
    const session = await getServerSession(authOptions)
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Check if the user has access to this event
    const event = await prisma.event.findFirst({
      where: {
        id: params.id,
      },
      include: {
        owner: true,
        admins: {
          include: {
            user: true
          }
        }
      }
    })
    
    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }
    
    // Check if the user is either the owner or an admin
    const isOwner = event.ownerId === session.user.id
    const isAdmin = event.admins.some(admin => admin.userId === session.user.id)
    
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }
    
    // Parse query parameters
    const url = new URL(request.url)
    const searchParams = url.searchParams
    const searchTerm = searchParams.get('search') || undefined
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '10')
    const admitted = searchParams.get('admitted') || undefined
    const admissionType = searchParams.get('admissionType') || undefined
    
    // Calculate pagination - skip pagination if limit is very large (e.g., 1000)
    const skipPagination = limit >= 1000
    const skip = skipPagination ? 0 : (page - 1) * limit
    
    // Fetch access codes for this event
    const whereClause: any = {
      rsvp: {
        registrationCode: {
          eventId: params.id
        }
      }
    }
    
    // Add search filter if provided
    if (searchTerm) {
      whereClause.OR = [
        { name: { contains: searchTerm, mode: 'insensitive' } },
        { code: { contains: searchTerm, mode: 'insensitive' } },
        { rsvp: { email: { contains: searchTerm, mode: 'insensitive' } } },
        { rsvp: { phone: { contains: searchTerm, mode: 'insensitive' } } }
      ]
    }
    
    // Add admission filter if provided
    if (admitted === 'true') {
      whereClause.isAdmitted = true
    } else if (admitted === 'false') {
      whereClause.isAdmitted = false
    }
    
    // For hall admission, we don't have a database field yet, so we'll just filter by gate admission
    // In a future update, we can add proper hall admission filtering
    if (admissionType === 'gate') {
      whereClause.isAdmitted = true
    }
    // For hall admission, we'll just use gate admission for now since we don't have a hall admission field
    // This is a placeholder for future implementation
    else if (admissionType === 'hall') {
      whereClause.isAdmitted = true
      // In the future: whereClause.isHallAdmitted = true
    }
    
    // Fetch access codes with pagination (or without if skipPagination is true)
    const [accessCodes, totalCount] = await Promise.all([
      prisma.accessCode.findMany({
        where: whereClause,
        include: {
          rsvp: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              hasGuest: true,
              hasDriver: true,
              hasAide: true
            }
          },
          table: {
            select: {
              id: true,
              name: true,
              capacity: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip: skipPagination ? undefined : skip,
        take: skipPagination ? undefined : limit
      }),
      prisma.accessCode.count({
        where: whereClause
      })
    ])
    
    // Process the access codes to include primary attendee information for non-primary codes
    const processedAccessCodes = await Promise.all(
      accessCodes.map(async (code) => {
        let primaryAttendee = null
        
        // If this is not a primary code, find the primary attendee
        if (code.type !== 'primary') {
          const primary = await prisma.accessCode.findFirst({
            where: {
              rsvpId: code.rsvpId,
              type: 'primary'
            },
            select: {
              id: true,
              name: true,
              code: true
            }
          })
          
          if (primary) {
            primaryAttendee = primary
          }
        }
        
        return {
          ...code,
          primaryAttendee
        }
      })
    )
    
    return NextResponse.json({ 
      success: true,
      accessCodes: processedAccessCodes,
      stats: {
        total: totalCount,
        admitted: accessCodes.filter(code => code.isAdmitted).length,
        notAdmitted: accessCodes.filter(code => !code.isAdmitted).length
      }
    })
    
  } catch (error) {
    console.error('Error fetching access codes:', error)
    return NextResponse.json({ error: 'Failed to fetch access codes' }, { status: 500 })
  }
}
