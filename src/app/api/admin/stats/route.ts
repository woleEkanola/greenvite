import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { getRsvpStats, getInviteStats } from '@/lib/db'

export async function GET(request: Request) {
  try {
    // Check authentication
    const cookieStore = cookies()
    const authToken = cookieStore.get('auth_token')

    if (!authToken) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Fetch actual stats from database
    const [rsvpStats, inviteStats] = await Promise.all([
      getRsvpStats(),
      getInviteStats()
    ])

    const stats = {
      ...rsvpStats,
      ...inviteStats
    }

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
