import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { prisma } from './prisma'

export const prismaClient = prisma as PrismaClient

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

/**
 * Get all registration codes, optionally filtered by status
 * @param status Optional status filter ('available', 'used', 'pending', 'invite-sent')
 * @returns Array of registration codes
 */
export async function getRegistrationCodes(status?: 'available' | 'used' | 'pending' | 'invite-sent') {
  console.log(`[getRegistrationCodes] Fetching registration codes${status ? ` with status: ${status}` : ''}`)
  try {
    let whereClause: any = {};
    
    if (status) {
      whereClause = { status };
    }
    
    const codes = await prismaClient.registrationCode.findMany({
      where: whereClause,
      include: {
        rsvp: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
    console.log(`[getRegistrationCodes] Successfully fetched ${codes.length} codes${status ? ` with status: ${status}` : ''}`)
    return codes
  } catch (error) {
    console.error(`[getRegistrationCodes] Error fetching registration codes${status ? ` with status: ${status}` : ''}:`, error)
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
    const [
      totalRsvp, 
      totalRegistrationCodes,
      availableRegistrations,
      pendingRegistrations,
      usedRegistrations,
      inviteSentRegistrations
    ] = await Promise.all([
      prismaClient.rsvp.count(),
      prismaClient.registrationCode.count(),
      prismaClient.registrationCode.count({
        where: { status: 'available' },
      }),
      prismaClient.registrationCode.count({
        where: { status: 'pending' },
      }),
      prismaClient.registrationCode.count({
        where: { status: 'used' },
      }),
      prismaClient.registrationCode.count({
        where: { status: 'invite-sent' },
      }),
    ])

    console.log(`[getRsvpStats] Stats - Total RSVPs: ${totalRsvp}, Available Codes: ${availableRegistrations}, Pending: ${pendingRegistrations}, Used: ${usedRegistrations}, Invite Sent: ${inviteSentRegistrations}, Total Codes: ${totalRegistrationCodes}`)
    return {
      totalRsvp,
      availableRegistrations,
      pendingRegistrations,
      usedRegistrations,
      inviteSentRegistrations,
      totalRegistrationCodes
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
    // Get total invites
    const totalInvitesSent = await prismaClient.invite.count()
    
    // Count invites by type
    const [emailInvites, smsInvites, bothInvites] = await Promise.all([
      prismaClient.invite.count({
        where: { type: 'email' },
      }),
      prismaClient.invite.count({
        where: { type: 'sms' },
      }),
      prismaClient.invite.count({
        where: { type: 'both' },
      }),
    ])
    
    // Count invites by status
    const [successfulInvites, failedInvites, pendingInvites, canceledInvites] = await Promise.all([
      prismaClient.invite.count({
        where: { 
          OR: [
            { status: 'sent' },
            { status: 'partial' }
          ]
        },
      }),
      prismaClient.invite.count({
        where: { status: 'failed' },
      }),
      prismaClient.invite.count({
        where: { status: 'pending' },
      }),
      prismaClient.invite.count({
        where: { status: 'canceled' },
      }),
    ])

    console.log(`[getInviteStats] Total invites: ${totalInvitesSent}, Email: ${emailInvites}, SMS: ${smsInvites}, Both: ${bothInvites}`)
    console.log(`[getInviteStats] Status - Success: ${successfulInvites}, Failed: ${failedInvites}, Pending: ${pendingInvites}, Canceled: ${canceledInvites}`)
    
    return { 
      totalInvitesSent,
      emailInvites,
      smsInvites,
      bothInvites,
      successfulInvites,
      failedInvites,
      pendingInvites,
      canceledInvites
    }
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
  console.log(`[markRegistrationCodeAsUsed] Marking code ${code} as ${status}`)
  try {
    const registrationCode = await prismaClient.registrationCode.findUnique({
      where: { code },
    })

    if (!registrationCode) {
      console.error(`[markRegistrationCodeAsUsed] Registration code ${code} not found`)
      throw new Error('Registration code not found')
    }

    // Update the registration code status
    const updatedCode = await prismaClient.registrationCode.update({
      where: { id: registrationCode.id },
      data: {
        used: status === 'used',
        usedAt: status === 'used' ? new Date() : null,
        status,
      },
    })
    
    console.log(`[markRegistrationCodeAsUsed] Successfully updated code ${code} to ${status}`)
    return updatedCode
  } catch (error) {
    console.error(`[markRegistrationCodeAsUsed] Error updating code ${code}:`, error)
    throw error
  }
}

/**
 * Deletes an invite and marks its registration code as available
 * @param id The ID of the invite to delete
 * @returns The deleted invite
 */
export async function deleteInvite(id: string) {
  console.log(`[deleteInvite] Deleting invite with id: ${id}`)
  try {
    // Get the invite to retrieve the code
    const invite = await prismaClient.invite.findUnique({
      where: { id }
    }) as any; // Use any type to bypass TypeScript checks for dynamic properties

    if (!invite) {
      throw new Error(`Invite with id ${id} not found`)
    }

    // If the invite has a code, mark it as available before deleting
    if (invite.hasOwnProperty('code') && invite.code) {
      await markRegistrationCodeAsUsed(invite.code, 'available');
      console.log(`[deleteInvite] Registration code ${invite.code} marked as available`)
    }

    // Delete the invite
    const deletedInvite = await prismaClient.invite.delete({
      where: { id }
    });

    return deletedInvite
  } catch (error) {
    console.error(`[deleteInvite] Error deleting invite with id ${id}:`, error)
    throw error
  }
}

/**
 * Checks if a registration code is already being used by a non-cancelled invite
 * @param code The registration code to check
 * @returns True if the code is already being used by a non-cancelled invite, false otherwise
 */
export async function isCodeUsedByActiveInvite(code: string): Promise<boolean> {
  console.log(`[isCodeUsedByActiveInvite] Checking if code ${code} is used by an active invite`)
  try {
    // Find invites that use this code and are not cancelled
    const invites = await prismaClient.invite.findMany({
      where: {
        code: code,
        status: {
          not: 'canceled'
        }
      }
    })
    
    const isUsed = invites.length > 0
    console.log(`[isCodeUsedByActiveInvite] Code ${code} is ${isUsed ? 'used' : 'not used'} by an active invite`)
    return isUsed
  } catch (error) {
    console.error(`[isCodeUsedByActiveInvite] Error checking code ${code}:`, error)
    // In case of error, assume it's used to be safe
    return true
  }
}
