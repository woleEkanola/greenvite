import { NextResponse } from 'next/server'
import { compare } from 'bcryptjs'
import { getUser } from '@/lib/db'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    const user = await getUser(username)
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    const isPasswordValid = await compare(password, user.password)
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      )
    }

    // Set a secure HTTP-only cookie for session management
    const response = NextResponse.json({ success: true })
    response.cookies.set('auth_token', user.id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24 hours
    })
    
    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
