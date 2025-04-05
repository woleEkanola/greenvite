import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface TableData {
  name: string
  capacity: number
  color: string
  number?: number
}

// POST /api/admin/events/[id]/tables/bulk - Create multiple tables at once
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get event ID from params
    const eventId = params.id

    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId }
    })

    if (!event) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { tables } = body as { tables: TableData[] }

    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      return NextResponse.json(
        { error: 'Invalid tables data' },
        { status: 400 }
      )
    }

    // Create tables in a transaction
    const createdTables = await prisma.$transaction(
      tables.map(table => 
        prisma.table.create({
          data: {
            name: table.name,
            capacity: table.capacity,
            color: table.color,
            eventId
          }
        })
      )
    )

    return NextResponse.json({
      success: true,
      message: `Created ${createdTables.length} tables`,
      tables: createdTables
    })
  } catch (error) {
    console.error('Error creating tables in bulk:', error)
    return NextResponse.json(
      { error: 'Failed to create tables' },
      { status: 500 }
    )
  }
}
