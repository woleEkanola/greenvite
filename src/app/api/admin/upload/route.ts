import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { put } from '@vercel/blob'

// Helper function to check event access
async function canAccessEvent(userId: string, eventId: string): Promise<boolean> {
  try {
    // Check if the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    });

    if (!event) {
      return false;
    }

    // Check if the user is the event owner
    if (event.ownerId === userId) {
      return true;
    }

    // Check if the user is an admin of the event
    const eventAdmin = await prisma.eventAdmin.findFirst({
      where: {
        eventId,
        userId
      }
    });

    if (eventAdmin) {
      return true;
    }

    return false;
  } catch (error) {
    console.error('Error checking event access:', error);
    return false;
  }
}

// POST /api/admin/upload
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !session.user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Parse the multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const eventId = formData.get('eventId') as string | null

    if (!file) {
      return new NextResponse(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Validate file type
    const fileType = file.type
    if (!fileType.startsWith('image/')) {
      return new NextResponse(
        JSON.stringify({ error: 'File must be an image' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // If eventId is provided, check access
    if (eventId) {
      // Check if user has access to this event
      const hasAccess = await canAccessEvent(session.user.id, eventId)
      if (!hasAccess) {
        return new NextResponse(
          JSON.stringify({ error: 'Forbidden' }),
          { status: 403, headers: { 'Content-Type': 'application/json' } }
        )
      }
    }

    // Generate a unique filename
    const uniquePrefix = eventId ? `greenvites-${eventId}` : `greenvites-user-${session.user.id}`
    const filename = `${uniquePrefix}-${Date.now()}-${file.name.replace(/\s+/g, '-')}`

    try {
      // Upload to Vercel Blob Storage
      const { url } = await put(filename, file, {
        access: 'public',
        contentType: fileType
      })
      
      return new NextResponse(
        JSON.stringify({ url }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    } catch (uploadError) {
      console.error('Error uploading to Vercel Blob:', uploadError)
      return new NextResponse(
        JSON.stringify({ error: 'Failed to upload file. Please try again.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  } catch (error) {
    console.error('Error uploading file:', error)
    return new NextResponse(
      JSON.stringify({ error: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
