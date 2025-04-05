import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import PDFDocument from 'pdfkit';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get the event ID from the route params
    const eventId = params.id;

    // Check if event exists and user has access
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organization: {
          include: {
            users: {
              where: {
                userId: session.user.id
              }
            }
          }
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Check if user is authorized (admin or belongs to the organization)
    const isAdmin = session.user.role === 'ADMIN' || session.user.role === 'SUPERADMIN';
    const isOrgMember = event.organization.users.length > 0;

    if (!isAdmin && !isOrgMember) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'csv'; // 'csv' or 'pdf'
    const search = searchParams.get('search') || '';
    
    // Build where clause for search and event filter
    let searchQuery: any = {
      eventId: eventId
    };
    
    if (search) {
      searchQuery = {
        AND: [
          { eventId: eventId },
          { 
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
              { registrationCode: { code: { contains: search, mode: 'insensitive' } } }
            ]
          }
        ]
      };
    }
    
    // Get RSVPs with search filter
    const rsvps = await prisma.rsvp.findMany({
      where: searchQuery,
      include: {
        registrationCode: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
    
    // Convert to CSV format
    const formattedRsvps = rsvps.map(rsvp => ({
      Name: rsvp.name,
      Email: rsvp.email,
      Phone: (rsvp as any).phone || '',
      'Registration Code': rsvp.registrationCode?.code || '',
      'Has Guest': rsvp.hasGuest ? 'Yes' : 'No',
      'Has Driver': rsvp.hasDriver ? 'Yes' : 'No',
      'Has Aide': rsvp.hasAide ? 'Yes' : 'No',
      'Date Submitted': new Date(rsvp.createdAt).toLocaleString(),
    }));
    
    // Generate export based on format
    if (format === 'csv') {
      // Generate CSV
      const headers = Object.keys(formattedRsvps[0] || {});
      const csvRows = [
        headers.join(','), // Header row
        ...formattedRsvps.map(row => 
          headers.map(header => {
            const value = row[header as keyof typeof row];
            // Escape commas and quotes in values
            return `"${String(value).replace(/"/g, '""')}"`; 
          }).join(',')
        )
      ];
      
      const csvContent = csvRows.join('\n');
      
      return new NextResponse(csvContent, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="rsvps-${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.csv"`,
        },
      });
    } else if (format === 'pdf') {
      // Generate PDF
      const pdfBuffer = await generatePdf(formattedRsvps, event.title);
      
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="rsvps-${event.title.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf"`,
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid export format' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error exporting RSVPs:', error);
    return NextResponse.json(
      { error: 'An error occurred while exporting RSVPs' },
      { status: 500 }
    );
  }
}

// Helper function to generate PDF
async function generatePdf(data: any[], eventTitle: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      // Create a document
      const doc = new PDFDocument({ margin: 50 });
      const buffers: Buffer[] = [];
      
      // Pipe its output somewhere, like to a Buffer
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });
      
      // Add title
      doc.fontSize(20).text(`RSVP List - ${eventTitle}`, { align: 'center' });
      doc.moveDown();
      
      // Add timestamp
      doc.fontSize(10).text(`Generated on: ${new Date().toLocaleString()}`, { align: 'center' });
      doc.moveDown(2);
      
      // Define table columns
      const columns = Object.keys(data[0] || {});
      const columnWidths: Record<string, number> = {
        'Name': 100,
        'Email': 150,
        'Phone': 80,
        'Registration Code': 80,
        'Has Guest': 50,
        'Has Driver': 50,
        'Has Aide': 50,
        'Date Submitted': 100
      };
      
      // Draw table headers
      let xPos = 50;
      doc.fontSize(10).font('Helvetica-Bold');
      
      columns.forEach(column => {
        doc.text(column, xPos, doc.y, { width: columnWidths[column] || 100 });
        xPos += (columnWidths[column] || 100) + 10;
      });
      
      doc.moveDown();
      doc.font('Helvetica');
      
      // Draw horizontal line
      doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      doc.moveDown(0.5);
      
      // Draw table rows
      data.forEach((row, index) => {
        xPos = 50;
        const startY = doc.y;
        let maxHeight = 0;
        
        columns.forEach(column => {
          const value = row[column as keyof typeof row];
          const textHeight = doc.heightOfString(String(value), { 
            width: columnWidths[column] || 100 
          });
          maxHeight = Math.max(maxHeight, textHeight);
          
          doc.text(String(value), xPos, doc.y, { 
            width: columnWidths[column] || 100 
          });
          
          xPos += (columnWidths[column] || 100) + 10;
        });
        
        // Reset Y position for next row and add some padding
        doc.y = startY + maxHeight + 5;
        
        // Add a light gray background for alternate rows
        if (index % 2 === 0) {
          doc.rect(50, startY - 2, 500, maxHeight + 5).fill('#f9f9f9');
        }
        
        // Check if we need a new page
        if (doc.y > 700) {
          doc.addPage();
        }
      });
      
      // Finalize the PDF
      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}
