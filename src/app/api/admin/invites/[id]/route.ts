import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { cancelInvite, updateInvite, getInviteById, deleteInvite } from '@/lib/db'

// GET a specific invite by ID
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('[GET /api/admin/invites/:id] Unauthorized access attempt')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const invite = await getInviteById(params.id)
    
    if (!invite) {
      return NextResponse.json(
        { success: false, error: 'Invite not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      invite
    })
  } catch (error) {
    console.error('[GET /api/admin/invites/:id] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to get invite' 
      },
      { status: 500 }
    )
  }
}

// PATCH to update an invite's status
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('[PATCH /api/admin/invites/:id] Unauthorized access attempt')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { status, emailStatus, whatsappStatus } = await request.json()
    
    // Validate inputs
    if (!status && !emailStatus && !whatsappStatus) {
      return NextResponse.json(
        { success: false, error: 'No update data provided' },
        { status: 400 }
      )
    }

    // Validate status values
    const validStatuses = ['pending', 'sent', 'failed', 'partial', 'canceled']
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (status) updateData.status = status
    if (emailStatus) updateData.emailStatus = emailStatus
    if (whatsappStatus) updateData.whatsappStatus = whatsappStatus

    let updatedInvite;
    
    // If status is 'canceled', use cancelInvite function to properly handle registration code
    if (status === 'canceled') {
      updatedInvite = await cancelInvite(params.id);
    } else {
      // Otherwise, use regular updateInvite function
      updatedInvite = await updateInvite(params.id, updateData);
    }

    return NextResponse.json({
      success: true,
      message: 'Invite updated successfully',
      invite: updatedInvite
    })
  } catch (error) {
    console.error('[PATCH /api/admin/invites/:id] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update invite' 
      },
      { status: 500 }
    )
  }
}

// DELETE to delete an invite
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('[DELETE /api/admin/invites/:id] Unauthorized access attempt')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Delete the invite
    const deletedInvite = await deleteInvite(params.id)

    return NextResponse.json({
      success: true,
      message: 'Invite deleted successfully',
      invite: deletedInvite
    })
  } catch (error) {
    console.error('[DELETE /api/admin/invites/:id] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to delete invite' 
      },
      { status: 500 }
    )
  }
}
