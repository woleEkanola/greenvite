import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// GET - Get a specific admin user
export async function GET(
  request: Request,
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

    // Check if the current user is a superadmin
    const currentUser = await prisma.user.findUnique({
      where: {
        username: session.user?.name as string
      }
    })

    if (!currentUser || currentUser.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden - Requires superadmin privileges' },
        { status: 403 }
      )
    }

    // Get the user
    const user = await prisma.user.findUnique({
      where: {
        id: params.id
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user

    return NextResponse.json({ user: userWithoutPassword })
  } catch (error) {
    console.error('Error fetching admin user:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin user' },
      { status: 500 }
    )
  }
}

// PUT - Update an admin user
export async function PUT(
  request: Request,
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

    // Check if the current user is a superadmin
    const currentUser = await prisma.user.findUnique({
      where: {
        username: session.user?.name as string
      }
    })

    if (!currentUser || currentUser.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden - Requires superadmin privileges' },
        { status: 403 }
      )
    }

    // Parse request body
    const { username, password, email, name, role } = await request.json()

    // Validate required fields
    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: {
        id: params.id
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if username already exists (if changing username)
    if (username !== user.username) {
      const existingUser = await prisma.user.findUnique({
        where: {
          username
        }
      })

      if (existingUser) {
        return NextResponse.json(
          { error: 'Username already exists' },
          { status: 400 }
        )
      }
    }

    // Check if email already exists (if provided and changing email)
    if (email && email !== user.email) {
      const existingEmail = await prisma.user.findUnique({
        where: {
          email
        }
      })

      if (existingEmail) {
        return NextResponse.json(
          { error: 'Email already exists' },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {
      username,
      email,
      name,
      role: role === 'superadmin' ? 'superadmin' : 'admin'
    }

    // Hash the password if provided
    if (password) {
      updateData.password = await bcrypt.hash(password, 10)
    }

    // Update the user
    const updatedUser = await prisma.user.update({
      where: {
        id: params.id
      },
      data: updateData
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = updatedUser

    return NextResponse.json({
      message: 'Admin user updated successfully',
      user: userWithoutPassword
    })
  } catch (error) {
    console.error('Error updating admin user:', error)
    return NextResponse.json(
      { error: 'Failed to update admin user' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an admin user
export async function DELETE(
  request: Request,
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

    // Check if the current user is a superadmin
    const currentUser = await prisma.user.findUnique({
      where: {
        username: session.user?.name as string
      }
    })

    if (!currentUser || currentUser.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Forbidden - Requires superadmin privileges' },
        { status: 403 }
      )
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: {
        id: params.id
      }
    })

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Prevent deleting yourself
    if (user.username === session.user?.name) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      )
    }

    // Delete the user
    await prisma.user.delete({
      where: {
        id: params.id
      }
    })

    return NextResponse.json({
      message: 'Admin user deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting admin user:', error)
    return NextResponse.json(
      { error: 'Failed to delete admin user' },
      { status: 500 }
    )
  }
}
