import { NextResponse } from 'next/server'
import { createRegistrationCodes, getRegistrationCodes } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Helper function to generate a random code
function generateUniqueCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    console.log('[POST /api/admin/reg-codes] Unauthorized access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { count } = await request.json()
    
    if (!count || count < 1 || count > 100) {
      console.log(`[POST /api/admin/reg-codes] Invalid count provided: ${count}`)
      return NextResponse.json(
        { error: 'Please provide a valid count between 1 and 100' },
        { status: 400 }
      )
    }

    console.log(`[POST /api/admin/reg-codes] Generating ${count} registration codes`)
    const result = await createRegistrationCodes(count)
    console.log(`[POST /api/admin/reg-codes] Successfully generated ${result.count} codes`)
    
    return NextResponse.json({ 
      message: `Successfully generated ${result.count} registration codes`,
      count: result.count 
    })
  } catch (error) {
    console.error('[POST /api/admin/reg-codes] Error generating registration codes:', error)
    return NextResponse.json(
      { error: 'Failed to generate registration codes' },
      { status: 500 }
    )
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session) {
    console.log('[GET /api/admin/reg-codes] Unauthorized access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[GET /api/admin/reg-codes] Fetching registration codes')
    const codes = await getRegistrationCodes()
    console.log(`[GET /api/admin/reg-codes] Successfully fetched ${codes.length} codes`)
    return NextResponse.json(codes)
  } catch (error) {
    console.error('[GET /api/admin/reg-codes] Error fetching registration codes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch registration codes' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session) {
    console.log('[DELETE /api/admin/reg-codes] Unauthorized access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { codeId } = await request.json()
    
    if (!codeId) {
      console.log('[DELETE /api/admin/reg-codes] No code ID provided')
      return NextResponse.json(
        { error: 'Please provide a code ID to delete' },
        { status: 400 }
      )
    }

    // Get the code to check if it's available
    const code = await prisma.registrationCode.findUnique({
      where: { id: codeId }
    })

    if (!code) {
      console.log(`[DELETE /api/admin/reg-codes] Code with ID ${codeId} not found`)
      return NextResponse.json(
        { error: 'Registration code not found' },
        { status: 404 }
      )
    }

    // Only allow deletion of available codes
    if (code.used || (code as any).status !== 'available') {
      console.log(`[DELETE /api/admin/reg-codes] Cannot delete code ${code.code} because it is not available`)
      return NextResponse.json(
        { error: 'Only available registration codes can be deleted' },
        { status: 400 }
      )
    }

    // Delete the code
    await prisma.registrationCode.delete({
      where: { id: codeId }
    })

    console.log(`[DELETE /api/admin/reg-codes] Successfully deleted registration code ${code.code}`)
    
    return NextResponse.json({ 
      message: `Successfully deleted registration code ${code.code}`,
      code: code.code
    })
  } catch (error) {
    console.error('[DELETE /api/admin/reg-codes] Error deleting registration code:', error)
    return NextResponse.json(
      { error: 'Failed to delete registration code' },
      { status: 500 }
    )
  }
}
