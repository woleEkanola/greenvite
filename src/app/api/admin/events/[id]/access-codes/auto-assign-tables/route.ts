import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST: Auto-assign access codes to tables
export async function POST(
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
    
    // Parse the request body
    const body = await request.json()
    const { 
      tableIds, 
      keepGroupsTogether = true, 
      includeTypes = ['primary', 'guest', 'driver', 'aide'],
      onlyUnassigned = true,
      codeIds = [] // Optional: specific codes to assign (if empty, all matching codes will be assigned)
    } = body
    
    if (!tableIds || !Array.isArray(tableIds) || tableIds.length === 0) {
      return NextResponse.json({ error: 'Table IDs are required' }, { status: 400 })
    }
    
    // Verify all tables belong to this event and get their capacities
    const tables = await prisma.table.findMany({
      where: {
        id: {
          in: tableIds
        },
        eventId: params.id
      },
      include: {
        accessCodes: true
      }
    })
    
    if (tables.length !== tableIds.length) {
      return NextResponse.json({ 
        error: 'One or more tables not found or do not belong to this event',
        found: tables.length,
        requested: tableIds.length
      }, { status: 400 })
    }
    
    // Calculate remaining capacity for each table
    const tableCapacities = tables.map(table => ({
      id: table.id,
      name: table.name,
      capacity: table.capacity,
      currentOccupancy: table.accessCodes.length,
      remainingCapacity: table.capacity - table.accessCodes.length
    }))
    
    // Sort tables by remaining capacity (descending)
    tableCapacities.sort((a, b) => b.remainingCapacity - a.remainingCapacity)
    
    // Calculate total remaining capacity
    const totalRemainingCapacity = tableCapacities.reduce((sum, table) => sum + table.remainingCapacity, 0)
    
    // Build the query to find access codes to assign
    const whereClause: any = {
      rsvp: {
        registrationCode: {
          eventId: params.id
        }
      },
      type: {
        in: includeTypes
      }
    }
    
    // If onlyUnassigned is true, only include codes without a table assignment
    if (onlyUnassigned) {
      whereClause.tableId = null
    }
    
    // If specific codeIds are provided, only include those codes
    if (codeIds.length > 0) {
      whereClause.id = {
        in: codeIds
      }
    }
    
    // Get all access codes that need assignment
    const accessCodes = await prisma.accessCode.findMany({
      where: whereClause,
      include: {
        rsvp: true
      }
    })
    
    if (accessCodes.length === 0) {
      return NextResponse.json({ 
        success: true,
        message: 'No access codes found matching the criteria',
        assignedCount: 0
      })
    }
    
    // Group access codes by RSVP ID if keepGroupsTogether is true
    let groupedCodes: { rsvpId: string, codes: typeof accessCodes }[] = []
    
    if (keepGroupsTogether) {
      // Create a map of RSVP IDs to their access codes
      const codesByRsvpId = accessCodes.reduce((groups, code) => {
        const key = code.rsvpId
        if (!groups[key]) groups[key] = []
        groups[key].push(code)
        return groups
      }, {} as Record<string, typeof accessCodes>)
      
      // Convert the map to an array of groups
      groupedCodes = Object.entries(codesByRsvpId).map(([rsvpId, codes]) => ({
        rsvpId,
        codes
      }))
      
      // Sort groups by size (descending) to assign larger groups first
      groupedCodes.sort((a, b) => b.codes.length - a.codes.length)
    } else {
      // If not keeping groups together, treat each code as its own group
      groupedCodes = accessCodes.map(code => ({
        rsvpId: code.rsvpId,
        codes: [code]
      }))
      
      // Shuffle the groups to randomize assignments when not keeping groups together
      for (let i = groupedCodes.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [groupedCodes[i], groupedCodes[j]] = [groupedCodes[j], groupedCodes[i]];
      }
    }
    
    // Check if we have enough capacity for all codes
    const totalGuestsToAssign = accessCodes.length;
    let capacityWarning = '';
    
    if (totalGuestsToAssign > totalRemainingCapacity) {
      // Instead of returning an error, we'll assign as many guests as possible
      capacityWarning = `Not enough capacity for all guests. Will assign ${totalRemainingCapacity} out of ${totalGuestsToAssign} guests.`;
      console.log(capacityWarning);
    }
    
    // Assign groups to tables
    const assignments: { codeId: string, tableId: string }[] = []
    const updatedTableCapacities = [...tableCapacities]
    
    // Keep track of which groups were assigned
    const assignedGroups = new Set<string>();
    let remainingCapacity = totalRemainingCapacity;
    
    // First pass: try to assign complete groups without splitting
    if (keepGroupsTogether) {
      for (const group of groupedCodes) {
        const groupSize = group.codes.length;
        
        // Skip if this group is too large for any remaining capacity
        if (groupSize > remainingCapacity) {
          continue;
        }
        
        // Find the first table with enough capacity for this group
        const tableIndex = updatedTableCapacities.findIndex(table => table.remainingCapacity >= groupSize);
        
        if (tableIndex === -1) {
          // No single table has enough capacity for this group
          continue;
        }
        
        // Assign the entire group to this table
        for (const code of group.codes) {
          assignments.push({
            codeId: code.id,
            tableId: updatedTableCapacities[tableIndex].id
          });
        }
        
        // Update the table's remaining capacity
        updatedTableCapacities[tableIndex].remainingCapacity -= groupSize;
        remainingCapacity -= groupSize;
        
        // Mark this group as assigned
        assignedGroups.add(group.rsvpId);
        
        // Re-sort tables by remaining capacity
        updatedTableCapacities.sort((a, b) => b.remainingCapacity - a.remainingCapacity);
      }
    }
    
    // Second pass: assign individual codes for remaining capacity or if not keeping groups together
    if (!keepGroupsTogether || remainingCapacity > 0) {
      for (const group of groupedCodes) {
        // Skip if this group was already assigned in the first pass
        if (assignedGroups.has(group.rsvpId)) {
          continue;
        }
        
        for (const code of group.codes) {
          // Stop if we've used all available capacity
          if (remainingCapacity <= 0) {
            break;
          }
          
          // Find the table with the most remaining capacity
          const bestTableIndex = updatedTableCapacities.findIndex(table => table.remainingCapacity > 0);
          
          if (bestTableIndex === -1) {
            // No more capacity left
            break;
          }
          
          // Assign this code to the best table
          assignments.push({
            codeId: code.id,
            tableId: updatedTableCapacities[bestTableIndex].id
          });
          
          // Update the table's remaining capacity
          updatedTableCapacities[bestTableIndex].remainingCapacity--;
          remainingCapacity--;
          
          // Re-sort tables by remaining capacity
          updatedTableCapacities.sort((a, b) => b.remainingCapacity - a.remainingCapacity);
        }
        
        // Stop if we've used all available capacity
        if (remainingCapacity <= 0) {
          break;
        }
      }
    }
    
    // Perform the assignments in the database
    let assignedCount = 0;
    for (const assignment of assignments) {
      await prisma.accessCode.update({
        where: {
          id: assignment.codeId
        },
        data: {
          tableId: assignment.tableId
        }
      });
      assignedCount++;
    }
    
    // Return the results
    return NextResponse.json({ 
      success: true,
      message: capacityWarning 
        ? `${assignedCount} access codes auto-assigned to tables. ${capacityWarning}`
        : `${assignedCount} access codes auto-assigned to tables successfully`,
      assignedCount,
      totalRequested: totalGuestsToAssign,
      tableAssignments: updatedTableCapacities.map(table => ({
        id: table.id,
        name: table.name,
        initialCapacity: table.capacity,
        finalOccupancy: table.capacity - table.remainingCapacity,
        remainingCapacity: table.remainingCapacity
      }))
    })
    
  } catch (error) {
    console.error('Error auto-assigning tables:', error)
    return NextResponse.json({ 
      error: 'Failed to auto-assign tables',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
