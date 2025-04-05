import { prisma } from './prisma';

/**
 * Check if a user has access to an event
 * @param userId The ID of the user
 * @param eventId The ID of the event
 * @param requiredRole Optional role requirement ('admin', 'owner', etc.)
 * @returns A boolean indicating if the user has access to the event
 */
export async function canAccessEvent(userId: string, eventId: string, requiredRole?: string): Promise<boolean> {
  try {
    // Check if the event exists
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        owner: true,
        admins: {
          where: { userId },
          select: { userId: true }
        }
      }
    });

    if (!event) {
      return false;
    }

    // Check if the user is the event owner
    if (event.ownerId === userId) {
      return requiredRole ? requiredRole === 'owner' || requiredRole === 'admin' : true;
    }

    // Check if the user is an admin of the event
    if (event.admins.length > 0) {
      return requiredRole ? requiredRole === 'admin' : true;
    }

    return false;
  } catch (error) {
    console.error('Error checking event access:', error);
    return false;
  }
}

/**
 * This function is not implemented as the Organization model is not in the Prisma schema
 * 
 * Check if a user has access to an organization
 * @param userId The ID of the user
 * @param organizationId The ID of the organization
 * @returns A boolean indicating if the user has access to the organization
 */
export async function canAccessOrganization(userId: string, organizationId: string): Promise<boolean> {
  // This function is not implemented as the Organization model doesn't exist
  console.warn('canAccessOrganization is not implemented');
  return false;
}

/**
 * Check if a user is a superadmin
 * @param userId The ID of the user
 * @returns A boolean indicating if the user is a superadmin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    return user?.role === 'SUPERADMIN';
  } catch (error) {
    console.error('Error checking superadmin status:', error);
    return false;
  }
}
