import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// GET: Fetch table statistics for a specific event
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
    
    // Get all tables for this event
    const tables = await prisma.table.findMany({
      where: {
        eventId: params.id
      },
      include: {
        accessCodes: true
      }
    })
    
    // Calculate total capacity and occupancy
    const totalCapacity = tables.reduce((sum, table) => sum + table.capacity, 0)
    const totalOccupied = tables.reduce((sum, table) => sum + table.accessCodes.length, 0)
    const totalVacant = Math.max(0, totalCapacity - totalOccupied)
    
    // Get count of tables that are full
    const fullTables = tables.filter(table => table.accessCodes.length >= table.capacity).length
    
    // Get count of tables that have some occupants but are not full
    const partiallyOccupiedTables = tables.filter(
      table => table.accessCodes.length > 0 && table.accessCodes.length < table.capacity
    ).length
    
    // Get count of empty tables
    const emptyTables = tables.filter(table => table.accessCodes.length === 0).length
    
    // Get all access codes for this event
    const accessCodes = await prisma.accessCode.findMany({
      where: {
        rsvp: {
          registrationCode: {
            eventId: params.id
          }
        }
      },
      include: {
        table: true
      }
    })
    
    // Count unassigned invitees (access codes without a table)
    const unassignedInvitees = accessCodes.filter(code => !code.tableId).length
    
    // Get breakdown by admission status
    const admittedWithTable = accessCodes.filter(code => code.isAdmitted && code.tableId).length
    const admittedWithoutTable = accessCodes.filter(code => code.isAdmitted && !code.tableId).length
    const notAdmittedWithTable = accessCodes.filter(code => !code.isAdmitted && code.tableId).length
    const notAdmittedWithoutTable = accessCodes.filter(code => !code.isAdmitted && !code.tableId).length
    
    // Get hall admission stats
    const hallAdmittedWithTable = accessCodes.filter(code => code.isHallAdmitted && code.tableId).length
    const hallAdmittedWithoutTable = accessCodes.filter(code => code.isHallAdmitted && !code.tableId).length
    
    return NextResponse.json({
      success: true,
      stats: {
        tables: {
          total: tables.length,
          full: fullTables,
          partiallyOccupied: partiallyOccupiedTables,
          empty: emptyTables
        },
        seats: {
          totalCapacity,
          occupied: totalOccupied,
          vacant: totalVacant,
          occupancyRate: totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0
        },
        invitees: {
          total: accessCodes.length,
          assigned: totalOccupied,
          unassigned: unassignedInvitees
        },
        admission: {
          admittedWithTable,
          admittedWithoutTable,
          notAdmittedWithTable,
          notAdmittedWithoutTable,
          hallAdmittedWithTable,
          hallAdmittedWithoutTable
        }
      }
    })
    
  } catch (error) {
    console.error('Error fetching table statistics:', error)
    return NextResponse.json({ error: 'Failed to fetch table statistics' }, { status: 500 })
  }
}
