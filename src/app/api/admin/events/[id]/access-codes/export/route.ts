import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper function to convert array of objects to CSV
function convertToCSV(objArray: any[]) {
  if (objArray.length === 0) return '';
  
  const fields = Object.keys(objArray[0]);
  
  // Create header row
  const csvRows = [fields.join(',')];
  
  // Create data rows
  for (const obj of objArray) {
    const values = fields.map(field => {
      const value = obj[field];
      // Handle strings with commas by wrapping in quotes
      return typeof value === 'string' && value.includes(',') 
        ? `"${value.replace(/"/g, '""')}"` 
        : value === null || value === undefined ? '' : value;
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

// GET: Export access codes as CSV
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
    const format = searchParams.get('format') || 'csv'
    const admitted = searchParams.get('admitted') || undefined
    const admissionType = searchParams.get('admissionType') || undefined
    
    // Build the where clause
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
    if (admissionType === 'gate') {
      whereClause.isAdmitted = true
    }
    // For hall admission, we'll just use gate admission for now
    else if (admissionType === 'hall') {
      whereClause.isAdmitted = true
    }
    
    // Fetch all access codes matching the criteria
    const accessCodes = await prisma.accessCode.findMany({
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
      }
    })
    
    // Process the data for export
    const exportData = await Promise.all(
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
              name: true
            }
          })
          
          if (primary) {
            primaryAttendee = primary.name
          }
        }
        
        // Format the data for export
        return {
          Name: code.name,
          Code: code.code,
          Email: code.rsvp?.email || '',
          Phone: code.rsvp?.phone || '',
          Type: code.type.charAt(0).toUpperCase() + code.type.slice(1),
          Table: code.table?.name || 'Not Assigned',
          AdmittedAt: code.admittedAt ? new Date(code.admittedAt).toLocaleString() : '',
          PrimaryAttendee: primaryAttendee || ''
        }
      })
    )
    
    // Generate CSV
    if (format === 'csv') {
      const csv = convertToCSV(exportData);
      
      // Set headers for CSV download
      const headers = new Headers();
      headers.set('Content-Type', 'text/csv');
      headers.set('Content-Disposition', `attachment; filename="admitted-guests-${new Date().toISOString().split('T')[0]}.csv"`);
      
      return new NextResponse(csv, {
        status: 200,
        headers
      });
    }
    
    // Default to JSON if format is not recognized
    return NextResponse.json({ 
      success: true,
      data: exportData
    })
    
  } catch (error) {
    console.error('Error exporting access codes:', error)
    return NextResponse.json({ error: 'Failed to export access codes' }, { status: 500 })
  }
}
