import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getRsvpStats, getInviteStats } from '@/lib/db'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    // Check authentication using NextAuth
    const session = await getServerSession(authOptions)
    console.log('[GET /api/admin/stats] Session:', session)
    
    if (!session) {
      console.error('[GET /api/admin/stats] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[GET /api/admin/stats] Authenticated user:', session.user)

    // Check if there's any data in the database
    const registrationCodesCount = await prisma.registrationCode.count()
    const invitesCount = await prisma.invite.count()
    const rsvpsCount = await prisma.rsvp.count()
    
    console.log('[GET /api/admin/stats] Database counts:', {
      registrationCodesCount,
      invitesCount,
      rsvpsCount
    })

    // Fetch actual stats from database
    const [rsvpStats, inviteStats] = await Promise.all([
      getRsvpStats(),
      getInviteStats()
    ])

    const stats = {
      ...rsvpStats,
      ...inviteStats
    }

    console.log('[GET /api/admin/stats] Returning stats:', JSON.stringify(stats, null, 2))
    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
