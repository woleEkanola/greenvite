import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { markRegistrationCodeAsUsed, getRegistrationCode } from '@/lib/db'

export async function POST(request: Request) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session) {
      console.error('[POST /api/admin/update-code-status] Unauthorized access attempt')
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Parse request body
    const { code, status } = await request.json()

    // Validate inputs
    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Registration code is required' },
        { status: 400 }
      )
    }

    if (!['pending', 'used', 'available', 'invite-sent'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Invalid status. Must be one of: pending, used, available, invite-sent' },
        { status: 400 }
      )
    }

    // Get current code status
    const currentCode = await getRegistrationCode(code)
    if (!currentCode) {
      return NextResponse.json(
        { success: false, error: 'Registration code not found' },
        { status: 404 }
      )
    }

    // Update code status
    const updatedCode = await markRegistrationCodeAsUsed(code, status as 'pending' | 'used' | 'available' | 'invite-sent')

    return NextResponse.json({
      success: true,
      message: `Registration code ${code} status updated to ${status}`,
      previousStatus: currentCode.status,
      newStatus: updatedCode.status,
      code: updatedCode
    })
  } catch (error) {
    console.error('[POST /api/admin/update-code-status] Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to update registration code status' 
      },
      { status: 500 }
    )
  }
}
