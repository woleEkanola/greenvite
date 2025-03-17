import { NextResponse } from 'next/server'
import { createRegistrationCodes, getRegistrationCodes } from '@/lib/db'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

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
