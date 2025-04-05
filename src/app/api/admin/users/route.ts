import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'

const prisma = new PrismaClient()

// GET - Get all admin users
export async function GET(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if the current user is an admin or superadmin
    const currentUser = await prisma.user.findUnique({
      where: {
        username: session.user?.name as string
      }
    })

    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'ADMIN' && currentUser.role !== 'superadmin')) {
      return NextResponse.json(
        { error: 'Forbidden - Requires admin privileges' },
        { status: 403 }
      )
    }

    // Get all users
    const users = await prisma.user.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(users)
  } catch (error) {
    console.error('Error fetching admin users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin users' },
      { status: 500 }
    )
  }
}

// POST - Create a new admin user
export async function POST(request: Request) {
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
    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      )
    }

    // Check if username already exists
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

    // Check if email already exists (if provided)
    if (email) {
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

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create the new user
    const newUser = await prisma.user.create({
      data: {
        username,
        password: hashedPassword,
        email,
        name,
        role: role === 'superadmin' ? 'superadmin' : 'admin'
      }
    })

    // Remove password from response
    const { password: _, ...userWithoutPassword } = newUser

    return NextResponse.json({
      message: 'Admin user created successfully',
      user: userWithoutPassword
    })
  } catch (error) {
    console.error('Error creating admin user:', error)
    return NextResponse.json(
      { error: 'Failed to create admin user' },
      { status: 500 }
    )
  }
}
