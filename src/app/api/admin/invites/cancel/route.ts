import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cancelInvite, getInviteById } from '@/lib/db'

export async function POST(request: Request) {
  // Check authentication
  const session = await getServerSession(authOptions)
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Parse request body
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: 'Invite ID is required' }, { status: 400 })
    }

    // Get the invite to check if it exists and can be canceled
    const invite = await getInviteById(id)
    
    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 })
    }

    // Only allow cancellation of failed or pending invites
    const status = invite.status as string
    if (status !== 'failed' && status !== 'pending' && status !== 'partial') {
      return NextResponse.json({ 
        error: 'Only failed, pending, or partially sent invites can be canceled' 
      }, { status: 400 })
    }

    // Cancel the invite
    const updatedInvite = await cancelInvite(id)

    return NextResponse.json({ 
      message: 'Invite canceled successfully', 
      invite: updatedInvite 
    })
  } catch (error) {
    console.error('[POST /api/admin/invites/cancel] Error:', error)
    return NextResponse.json({ 
      error: 'Failed to cancel invite',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
