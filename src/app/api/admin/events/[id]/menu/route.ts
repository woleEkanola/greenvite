import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Since there's no MenuItem model in the schema, we'll create a simple structure
// for storing menu items in the Event model as JSON data
interface MenuItem {
  id: string
  name: string
  description?: string
  type: string // 'appetizer' | 'main' | 'dessert' | 'drink' | 'other'
  dietaryInfo?: string[]
  image?: string
}

// GET: Fetch menu items for a specific event
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
    
    // Get query parameters
    const searchTerm = request.nextUrl.searchParams.get('search') || ''
    
    // Get menu items from event metadata
    const metadataMenuItems = await prisma.$queryRaw`
      SELECT metadata->>'menuItems' as "menuItems"
      FROM "Event"
      WHERE id = ${params.id}
    ` as { menuItems: string }[];
    
    // Parse menu items or return empty array if not found
    let parsedMenuItems: MenuItem[] = [];
    try {
      if (metadataMenuItems && metadataMenuItems[0] && metadataMenuItems[0].menuItems) {
        parsedMenuItems = JSON.parse(metadataMenuItems[0].menuItems);
        
        // Filter by search term if provided
        if (searchTerm) {
          const term = searchTerm.toLowerCase();
          parsedMenuItems = parsedMenuItems.filter(item => 
            item.name.toLowerCase().includes(term) || 
            (item.description && item.description.toLowerCase().includes(term)) ||
            item.type.toLowerCase().includes(term)
          );
        }
      }
    } catch (e) {
      console.error('Error parsing menu items:', e);
    }
    
    return NextResponse.json({ 
      success: true,
      menuItems: parsedMenuItems || []
    })
    
  } catch (error) {
    console.error('Error fetching menu items:', error)
    return NextResponse.json({ error: 'Failed to fetch menu items' }, { status: 500 })
  }
}

// POST: Add a new menu item for a specific event
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
    const { name, description, type, dietaryInfo, image } = body
    
    if (!name || !type) {
      return NextResponse.json({ error: 'Name and type are required' }, { status: 400 })
    }
    
    // Get existing menu items from metadata
    const metadataMenuItems = await prisma.$queryRaw`
      SELECT metadata->>'menuItems' as "menuItems"
      FROM "Event"
      WHERE id = ${params.id}
    ` as { menuItems: string }[];
    
    // Parse existing menu items or create empty array
    let parsedMenuItems: MenuItem[] = [];
    try {
      if (metadataMenuItems && metadataMenuItems[0] && metadataMenuItems[0].menuItems) {
        parsedMenuItems = JSON.parse(metadataMenuItems[0].menuItems);
      }
    } catch (e) {
      console.error('Error parsing menu items:', e);
    }
    
    // Create new menu item
    const newMenuItem: MenuItem = {
      id: Date.now().toString(), // Simple ID generation
      name,
      description,
      type,
      dietaryInfo,
      image
    }
    
    // Add new menu item to the array
    parsedMenuItems.push(newMenuItem)
    
    // Update event metadata with new menu items
    await prisma.$executeRaw`
      UPDATE "Event"
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{menuItems}',
        ${JSON.stringify(parsedMenuItems)}::jsonb
      )
      WHERE id = ${params.id}
    `;
    
    return NextResponse.json({ 
      success: true,
      menuItem: newMenuItem
    })
    
  } catch (error) {
    console.error('Error adding menu item:', error)
    return NextResponse.json({ error: 'Failed to add menu item' }, { status: 500 })
  }
}

// PUT: Update a menu item
export async function PUT(
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
    const { id, name, description, type, dietaryInfo, image } = body
    
    if (!id || !name || !type) {
      return NextResponse.json({ error: 'ID, name, and type are required' }, { status: 400 })
    }
    
    // Get existing menu items from metadata
    const metadataMenuItems = await prisma.$queryRaw`
      SELECT metadata->>'menuItems' as "menuItems"
      FROM "Event"
      WHERE id = ${params.id}
    ` as { menuItems: string }[];
    
    // Parse existing menu items
    let parsedMenuItems: MenuItem[] = [];
    try {
      if (metadataMenuItems && metadataMenuItems[0] && metadataMenuItems[0].menuItems) {
        parsedMenuItems = JSON.parse(metadataMenuItems[0].menuItems);
      }
    } catch (e) {
      console.error('Error parsing menu items:', e);
      return NextResponse.json({ error: 'Failed to parse menu items' }, { status: 500 })
    }
    
    // Find and update the menu item
    const updatedMenuItems = parsedMenuItems.map(item => {
      if (item.id === id) {
        return {
          ...item,
          name,
          description,
          type,
          dietaryInfo,
          image
        }
      }
      return item
    })
    
    // Update event metadata with updated menu items
    await prisma.$executeRaw`
      UPDATE "Event"
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{menuItems}',
        ${JSON.stringify(updatedMenuItems)}::jsonb
      )
      WHERE id = ${params.id}
    `;
    
    return NextResponse.json({ 
      success: true,
      menuItems: updatedMenuItems
    })
    
  } catch (error) {
    console.error('Error updating menu item:', error)
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 })
  }
}

// DELETE: Delete a menu item
export async function DELETE(
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
    const { menuItemId } = body
    
    if (!menuItemId) {
      return NextResponse.json({ error: 'Menu item ID is required' }, { status: 400 })
    }
    
    // Get existing menu items from metadata
    const metadataMenuItems = await prisma.$queryRaw`
      SELECT metadata->>'menuItems' as "menuItems"
      FROM "Event"
      WHERE id = ${params.id}
    ` as { menuItems: string }[];
    
    // Parse existing menu items
    let parsedMenuItems: MenuItem[] = [];
    try {
      if (metadataMenuItems && metadataMenuItems[0] && metadataMenuItems[0].menuItems) {
        parsedMenuItems = JSON.parse(metadataMenuItems[0].menuItems);
      }
    } catch (e) {
      console.error('Error parsing menu items:', e);
      return NextResponse.json({ error: 'Failed to parse menu items' }, { status: 500 })
    }
    
    // Filter out the menu item to delete
    const updatedMenuItems = parsedMenuItems.filter(item => item.id !== menuItemId)
    
    // Update event metadata with updated menu items
    await prisma.$executeRaw`
      UPDATE "Event"
      SET metadata = jsonb_set(
        COALESCE(metadata, '{}'::jsonb),
        '{menuItems}',
        ${JSON.stringify(updatedMenuItems)}::jsonb
      )
      WHERE id = ${params.id}
    `;
    
    return NextResponse.json({ 
      success: true
    })
    
  } catch (error) {
    console.error('Error deleting menu item:', error)
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 })
  }
}
