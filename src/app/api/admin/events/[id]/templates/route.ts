import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/events/[id]/templates - Get all message templates for an event
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;

    // Check if user has access to this event
    const hasAccess = await prisma.event.findFirst({
      where: {
        id: eventId,
        OR: [
          { ownerId: session.user.id },
          {
            admins: {
              some: {
                userId: session.user.id
              }
            }
          }
        ]
      }
    });

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this event' },
        { status: 403 }
      );
    }

    // Check if MessageTemplate model exists in Prisma client
    if (typeof prisma.messageTemplate === 'undefined') {
      console.warn('MessageTemplate model not found in Prisma client. The database schema may need to be updated.');
      return NextResponse.json([]);
    }

    // Get all templates for this event
    const templates = await prisma.messageTemplate.findMany({
      where: {
        eventId
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching templates' },
      { status: 500 }
    );
  }
}

// POST /api/admin/events/[id]/templates - Create a new message template
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const eventId = params.id;

    // Check if user has access to this event
    const hasAccess = await prisma.event.findFirst({
      where: {
        id: eventId,
        OR: [
          { ownerId: session.user.id },
          {
            admins: {
              some: {
                userId: session.user.id
              }
            }
          }
        ]
      }
    });

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'You do not have permission to access this event' },
        { status: 403 }
      );
    }

    // Check if MessageTemplate model exists in Prisma client
    if (typeof prisma.messageTemplate === 'undefined') {
      console.warn('MessageTemplate model not found in Prisma client. The database schema may need to be updated.');
      return NextResponse.json(
        { error: 'Message templates are not available. Please contact the administrator to update the database schema.' },
        { status: 500 }
      );
    }

    const { name, emailSubject, emailContent, whatsappContent, isDefault } = await request.json();

    // Validate required fields
    if (!name || !emailSubject || !emailContent || !whatsappContent) {
      return NextResponse.json(
        { error: 'Name, email subject, email content, and WhatsApp content are required' },
        { status: 400 }
      );
    }

    // If this template is set as default, unset any existing default templates
    if (isDefault) {
      await prisma.messageTemplate.updateMany({
        where: {
          eventId,
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });
    }

    // Create the new template
    const template = await prisma.messageTemplate.create({
      data: {
        name,
        emailSubject,
        emailContent,
        whatsappContent,
        isDefault: isDefault || false,
        eventId
      }
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'An error occurred while creating the template' },
      { status: 500 }
    );
  }
}
