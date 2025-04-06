import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import axios from 'axios';

/**
 * GET /api/admin/events/[id]/image
 * Returns the event image as a binary response
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the event details
    const event = await prisma.event.findUnique({
      where: { id: params.id },
      select: { imageUrl: true }
    });

    if (!event) {
      return new NextResponse('Event not found', { status: 404 });
    }

    if (!event.imageUrl) {
      return new NextResponse('Event has no image', { status: 404 });
    }

    // Fetch the image
    const imageResponse = await axios.get(event.imageUrl, {
      responseType: 'arraybuffer',
      timeout: 15000,
      headers: {
        'Accept': 'image/*',
        'Cache-Control': 'no-cache'
      }
    });

    // Determine content type from the response
    const contentType = imageResponse.headers['content-type'] || 'image/jpeg';

    // Return the image with proper content type
    return new NextResponse(imageResponse.data, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400'
      }
    });
  } catch (error) {
    console.error('Error fetching event image:', error);
    return new NextResponse('Error fetching image', { status: 500 });
  }
}
