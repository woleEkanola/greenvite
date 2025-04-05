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

    // Get all events the user has access to (either as owner or admin)
    const userEvents = await prisma.event.findMany({
      where: {
        OR: [
          { ownerId: session.user.id },
          {
            admins: {
              some: {
                userId: session.user.id
              }
            }
          }
        ]
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true
      }
    })

    console.log(`[GET /api/admin/stats] Found ${userEvents.length} events for user`)
    
    if (userEvents.length === 0) {
      return NextResponse.json({
        events: [],
        totalRsvp: 0,
        availableRegistrations: 0,
        pendingRegistrations: 0,
        usedRegistrations: 0,
        inviteSentRegistrations: 0,
        totalRegistrationCodes: 0,
        totalInvitesSent: 0,
        emailInvites: 0,
        smsInvites: 0,
        bothInvites: 0,
        successfulInvites: 0,
        failedInvites: 0,
        pendingInvites: 0,
        canceledInvites: 0,
        totalTables: 0,
        totalAccessCodes: 0
      })
    }

    // Get event IDs
    const eventIds = userEvents.map(event => event.id)

    // Aggregate stats across all events
    const [
      totalRsvp,
      totalRegistrationCodes,
      availableRegistrations,
      pendingRegistrations,
      usedRegistrations,
      inviteSentRegistrations,
      totalInvites,
      emailInvites,
      smsInvites,
      bothInvites,
      successfulInvites,
      failedInvites,
      pendingInvites,
      canceledInvites,
      totalTables,
      totalAccessCodes
    ] = await Promise.all([
      // Total RSVPs
      prisma.rsvp.count({
        where: {
          registrationCode: {
            eventId: { in: eventIds }
          }
        }
      }),
      
      // Total registration codes
      prisma.registrationCode.count({
        where: {
          eventId: { in: eventIds }
        }
      }),
      
      // Available registration codes
      prisma.registrationCode.count({
        where: {
          eventId: { in: eventIds },
          status: 'available'
        }
      }),
      
      // Pending registration codes
      prisma.registrationCode.count({
        where: {
          eventId: { in: eventIds },
          status: 'pending'
        }
      }),
      
      // Used registration codes
      prisma.registrationCode.count({
        where: {
          eventId: { in: eventIds },
          status: 'used'
        }
      }),
      
      // Invite sent registration codes
      prisma.registrationCode.count({
        where: {
          eventId: { in: eventIds },
          status: 'invite-sent'
        }
      }),
      
      // Total invites
      prisma.invite.count({
        where: {
          batch: {
            eventId: { in: eventIds }
          }
        }
      }),
      
      // Email invites
      prisma.invite.count({
        where: {
          batch: {
            eventId: { in: eventIds }
          },
          type: 'email'
        }
      }),
      
      // SMS invites
      prisma.invite.count({
        where: {
          batch: {
            eventId: { in: eventIds }
          },
          type: 'sms'
        }
      }),
      
      // Both invites
      prisma.invite.count({
        where: {
          batch: {
            eventId: { in: eventIds }
          },
          type: 'both'
        }
      }),
      
      // Successful invites
      prisma.invite.count({
        where: {
          batch: {
            eventId: { in: eventIds }
          },
          status: 'sent'
        }
      }),
      
      // Failed invites
      prisma.invite.count({
        where: {
          batch: {
            eventId: { in: eventIds }
          },
          status: 'failed'
        }
      }),
      
      // Pending invites
      prisma.invite.count({
        where: {
          batch: {
            eventId: { in: eventIds }
          },
          status: 'pending'
        }
      }),
      
      // Canceled invites
      prisma.invite.count({
        where: {
          batch: {
            eventId: { in: eventIds }
          },
          status: 'canceled'
        }
      }),
      
      // Total tables
      prisma.table.count({
        where: {
          eventId: { in: eventIds }
        }
      }),
      
      // Total access codes
      prisma.accessCode.count({
        where: {
          rsvp: {
            registrationCode: {
              eventId: { in: eventIds }
            }
          }
        }
      })
    ])

    // Get event-specific stats for the dashboard
    const eventStats = await Promise.all(
      userEvents.map(async (event) => {
        const [regCodes, rsvps, tables, invites] = await Promise.all([
          prisma.registrationCode.count({
            where: { eventId: event.id }
          }),
          prisma.rsvp.count({
            where: {
              registrationCode: {
                eventId: event.id
              }
            }
          }),
          prisma.table.count({
            where: { eventId: event.id }
          }),
          prisma.invite.count({
            where: {
              batch: {
                eventId: event.id
              }
            }
          })
        ])

        return {
          id: event.id,
          title: event.title,
          slug: event.slug,
          status: event.status,
          stats: {
            regCodes,
            rsvps,
            tables,
            invites
          }
        }
      })
    )

    const stats = {
      events: eventStats,
      totalRsvp,
      availableRegistrations,
      pendingRegistrations,
      usedRegistrations,
      inviteSentRegistrations,
      totalRegistrationCodes,
      totalInvitesSent: totalInvites,
      emailInvites,
      smsInvites,
      bothInvites,
      successfulInvites,
      failedInvites,
      pendingInvites,
      canceledInvites,
      totalTables,
      totalAccessCodes
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
