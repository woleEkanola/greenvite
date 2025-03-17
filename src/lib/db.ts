import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { prisma } from './prisma'

const prismaClient = prisma as PrismaClient

export interface User {
  id: string
  username: string
  password: string
  role: string
  email?: string | null
  name?: string | null
  createdAt: Date
  updatedAt: Date
}

export interface RsvpData {
  name: string
  email: string
  hasGuest: boolean
  hasDriver: boolean
  hasAide: boolean
  codeId: string
}

export interface InviteData {
  name: string
  email?: string
  phone?: string
  type: 'email' | 'sms' | 'both'
  status?: string
  emailStatus?: string | null
  smsStatus?: string | null
  smsProvider?: string | null
  errorMessage?: string | null
  code?: string
}

// Utility functions
function generateCode(length = 5): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Generate unique codes
async function generateUniqueCodes(count: number): Promise<string[]> {
  console.log(`[generateUniqueCodes] Generating ${count} unique codes`)
  try {
    const codes = new Set<string>()
    const existingCodes = new Set((await prismaClient.registrationCode.findMany()).map((rc: { code: string }) => rc.code))
    console.log(`[generateUniqueCodes] Found ${existingCodes.size} existing codes`)

    let attempts = 0
    const maxAttempts = count * 3 // Limit attempts to avoid infinite loop
    
    while (codes.size < count && attempts < maxAttempts) {
      const code = generateCode()
      if (!existingCodes.has(code) && !codes.has(code)) {
        codes.add(code)
      }
      attempts++
    }

    if (codes.size < count) {
      throw new Error(`Could not generate ${count} unique codes after ${attempts} attempts`)
    }

    console.log(`[generateUniqueCodes] Successfully generated ${codes.size} unique codes`)
    return Array.from(codes)
  } catch (error) {
    console.error('[generateUniqueCodes] Error generating unique codes:', error)
    throw error
  }
}

export async function createUser(username: string, password: string) {
  console.log(`[createUser] Creating user with username: ${username}`)
  try {
    const hashedPassword = await hash(password, 12)
    const user = await prismaClient.user.create({
      data: {
        username,
        password: hashedPassword,
      },
    })
    console.log(`[createUser] Successfully created user: ${username}`)
    return user
  } catch (error) {
    console.error('[createUser] Error creating user:', error)
    throw error
  }
}

export async function getUser(username: string): Promise<User | null> {
  console.log(`[getUser] Fetching user: ${username}`)
  try {
    const user = await prismaClient.user.findUnique({
      where: { username },
    }) as User | null
    console.log(`[getUser] User found: ${!!user}`)
    return user
  } catch (error) {
    console.error('[getUser] Error fetching user:', error)
    throw error
  }
}

export async function createRegistrationCodes(count: number) {
  console.log(`[createRegistrationCodes] Creating ${count} registration codes`)
  try {
    const codes = await generateUniqueCodes(count)
    const result = await prismaClient.registrationCode.createMany({
      data: codes.map(code => ({ code })),
    })
    console.log(`[createRegistrationCodes] Successfully created ${result.count} codes`)
    return result
  } catch (error) {
    console.error('[createRegistrationCodes] Error creating registration codes:', error)
    throw error
  }
}

export async function getRegistrationCodes() {
  console.log('[getRegistrationCodes] Fetching all registration codes')
  try {
    const codes = await prismaClient.registrationCode.findMany({
      include: {
        rsvp: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    console.log(`[getRegistrationCodes] Successfully fetched ${codes.length} codes`)
    return codes
  } catch (error) {
    console.error('[getRegistrationCodes] Error fetching registration codes:', error)
    throw error
  }
}

export async function getRegistrationCode(code: string) {
  console.log(`[getRegistrationCode] Fetching code: ${code}`)
  try {
    const regCode = await prismaClient.registrationCode.findUnique({
      where: { code },
    })
    console.log(`[getRegistrationCode] Code found: ${!!regCode}`)
    return regCode
  } catch (error) {
    console.error('[getRegistrationCode] Error fetching registration code:', error)
    throw error
  }
}

export async function createRsvp(data: RsvpData) {
  console.log(`[createRsvp] Creating RSVP for code: ${data.codeId}`)
  try {
    const rsvp = await prismaClient.rsvp.create({
      data,
    })
    console.log(`[createRsvp] Successfully created RSVP for: ${data.name}`)
    return rsvp
  } catch (error) {
    console.error('[createRsvp] Error creating RSVP:', error)
    throw error
  }
}

export async function getRsvpStats() {
  console.log('[getRsvpStats] Fetching RSVP statistics')
  try {
    const [totalRsvp, availableRegistrations] = await Promise.all([
      prismaClient.rsvp.count(),
      prismaClient.registrationCode.count({
        where: { used: false },
      }),
    ])

    console.log(`[getRsvpStats] Stats - Total RSVPs: ${totalRsvp}, Available Codes: ${availableRegistrations}`)
    return {
      totalRsvp,
      availableRegistrations,
    }
  } catch (error) {
    console.error('[getRsvpStats] Error fetching RSVP stats:', error)
    throw error
  }
}

export async function createInvites(invites: InviteData[]) {
  console.log(`[createInvites] Creating ${invites.length} invites`)
  try {
    const result = await prismaClient.invite.createMany({
      data: invites.map(invite => ({
        ...invite,
        status: 'pending',
      })),
    })
    console.log(`[createInvites] Successfully created ${result.count} invites`)
    return result
  } catch (error) {
    console.error('[createInvites] Error creating invites:', error)
    throw error
  }
}

export async function getInviteStats() {
  console.log('[getInviteStats] Fetching invite statistics')
  try {
    const totalInvitesSent = await prismaClient.invite.count({
      where: { sent: true },
    })

    console.log(`[getInviteStats] Total invites sent: ${totalInvitesSent}`)
    return { totalInvitesSent }
  } catch (error) {
    console.error('[getInviteStats] Error fetching invite stats:', error)
    throw error
  }
}

export async function getInvites() {
  console.log('[getInvites] Fetching all invites')
  try {
    const invites = await prismaClient.invite.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    })
    return invites
  } catch (error) {
    console.error('[getInvites] Error fetching invites:', error)
    throw error
  }
}

export async function getInviteById(id: string) {
  console.log(`[getInviteById] Fetching invite with id: ${id}`)
  try {
    const invite = await prismaClient.invite.findUnique({
      where: { id }
    })
    return invite
  } catch (error) {
    console.error(`[getInviteById] Error fetching invite with id ${id}:`, error)
    throw error
  }
}

export async function updateInvite(id: string, data: Partial<InviteData>) {
  console.log(`[updateInvite] Updating invite with id: ${id}`)
  try {
    const invite = await prismaClient.invite.update({
      where: { id },
      data
    })
    return invite
  } catch (error) {
    console.error(`[updateInvite] Error updating invite with id ${id}:`, error)
    throw error
  }
}

export async function cancelInvite(id: string) {
  console.log(`[cancelInvite] Canceling invite with id: ${id}`)
  try {
    // Get the invite to retrieve the code
    const invite = await prismaClient.invite.findUnique({
      where: { id }
    }) as any; // Use any type to bypass TypeScript checks for dynamic properties

    if (!invite) {
      throw new Error(`Invite with id ${id} not found`)
    }

    // Update the invite status to canceled
    const updateData: any = { status: 'canceled' };
    
    // Add email and SMS status updates if they exist
    if (invite.hasOwnProperty('emailStatus')) {
      updateData.emailStatus = invite.emailStatus === 'failed' ? 'canceled' : invite.emailStatus;
    }
    
    if (invite.hasOwnProperty('smsStatus')) {
      updateData.smsStatus = invite.smsStatus === 'failed' ? 'canceled' : invite.smsStatus;
    }
    
    const updatedInvite = await prismaClient.invite.update({
      where: { id },
      data: updateData
    });

    // If the invite has a code, mark it as available again
    if (invite.hasOwnProperty('code') && invite.code) {
      await markRegistrationCodeAsUsed(invite.code, 'available');
      console.log(`[cancelInvite] Registration code ${invite.code} marked as available`)
    }

    return updatedInvite
  } catch (error) {
    console.error(`[cancelInvite] Error canceling invite with id ${id}:`, error)
    throw error
  }
}

export async function markRegistrationCodeAsUsed(code: string, status: 'pending' | 'used' | 'available' | 'invite-sent' = 'used') {
  console.log(`[markRegistrationCodeAsUsed] Marking registration code ${code} as ${status}`)
  try {
    const regCode = await prismaClient.registrationCode.findFirst({
      where: { code }
    })

    if (!regCode) {
      console.warn(`[markRegistrationCodeAsUsed] Registration code ${code} not found`)
      return null
    }

    // For 'used' status, mark as used with timestamp
    // For 'available' status, mark as not used with null timestamp
    // For 'pending' status, we don't change anything (code is reserved but not marked as used yet)
    // For 'invite-sent' status, mark the status as invite-sent but not used yet
    const updateData: any = {
      status: status // Always update the status field
    }
    
    if (status === 'used') {
      updateData.used = true
      updateData.usedAt = new Date()
    } else if (status === 'available') {
      updateData.used = false
      updateData.usedAt = null
    } else if (status === 'invite-sent') {
      updateData.used = false
      updateData.usedAt = null
    }
    // For 'pending', we only update the status field

    // Only update if we have changes to make
    if (Object.keys(updateData).length > 0) {
      const updatedCode = await prismaClient.registrationCode.update({
        where: { id: regCode.id },
        data: updateData
      })
      return updatedCode
    }
    
    return regCode
  } catch (error) {
    console.error(`[markRegistrationCodeAsUsed] Error updating registration code ${code}:`, error)
    throw error
  }
}
