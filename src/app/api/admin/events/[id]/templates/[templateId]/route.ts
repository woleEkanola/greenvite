import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET /api/admin/events/[id]/templates/[templateId] - Get a specific template
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; templateId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId, templateId } = params;

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

    // Get the template
    const template = await prisma.messageTemplate.findUnique({
      where: {
        id: templateId,
        eventId
      }
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    return NextResponse.json(
      { error: 'An error occurred while fetching the template' },
      { status: 500 }
    );
  }
}

// PUT /api/admin/events/[id]/templates/[templateId] - Update a template
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; templateId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId, templateId } = params;

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
          isDefault: true,
          id: { not: templateId }
        },
        data: {
          isDefault: false
        }
      });
    }

    // Update the template
    const template = await prisma.messageTemplate.update({
      where: {
        id: templateId,
        eventId
      },
      data: {
        name,
        emailSubject,
        emailContent,
        whatsappContent,
        isDefault: isDefault || false
      }
    });

    return NextResponse.json(template);
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating the template' },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/events/[id]/templates/[templateId] - Delete a template
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; templateId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: eventId, templateId } = params;

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

    // Check if this is the only template
    const templateCount = await prisma.messageTemplate.count({
      where: {
        eventId
      }
    });

    if (templateCount <= 1) {
      return NextResponse.json(
        { error: 'Cannot delete the only template. At least one template must exist.' },
        { status: 400 }
      );
    }

    // Check if this is the default template
    const template = await prisma.messageTemplate.findUnique({
      where: {
        id: templateId
      }
    });

    // If deleting the default template, set another template as default
    if (template?.isDefault) {
      const anotherTemplate = await prisma.messageTemplate.findFirst({
        where: {
          eventId,
          id: { not: templateId }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });

      if (anotherTemplate) {
        await prisma.messageTemplate.update({
          where: {
            id: anotherTemplate.id
          },
          data: {
            isDefault: true
          }
        });
      }
    }

    // Delete the template
    await prisma.messageTemplate.delete({
      where: {
        id: templateId,
        eventId
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json(
      { error: 'An error occurred while deleting the template' },
      { status: 500 }
    );
  }
}
