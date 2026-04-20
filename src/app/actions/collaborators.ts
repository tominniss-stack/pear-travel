'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function getCollaborators(tripId: string) {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        owner: { select: { id: true, username: true, name: true } },
        collaborators: { select: { id: true, username: true, name: true } }
      }
    });
    return trip;
  } catch (error) {
    console.error("Failed to fetch collaborators", error);
    return null;
  }
}

export async function addCollaborator(tripId: string, username: string) {
  try {
    // 1. Authenticate the caller
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: 'Unauthorized. Please log in.' };

    // 2. Fetch the trip and verify Ownership
    const trip = await prisma.trip.findUnique({ 
      where: { id: tripId }, 
      select: { ownerId: true, collaborators: { select: { id: true } } } 
    });
    
    if (!trip) return { error: 'Trip not found.' };
    if (trip.ownerId !== session.user.id) {
      return { error: 'Only the trip owner can manage collaborators.' };
    }

    // 3. Find the user they are trying to invite
    const userToAdd = await prisma.user.findFirst({ 
      where: {
        OR: [
          { username: username.toLowerCase() },
          { email: username.toLowerCase() }
        ]
      }
    });
    
    if (!userToAdd) {
      return { error: 'User not found. Please check the username and try again.' };
    }

    // Guard 1: Prevent self-invitation
    if (userToAdd.id === session.user.id) {
      return { success: false, error: 'You cannot invite yourself.' };
    }

    // Guard 2: Prevent duplicate collaborator
    const alreadyCollaborator = await prisma.trip.findFirst({
      where: {
        id: tripId,
        collaborators: { some: { id: userToAdd.id } }
      }
    });
    if (alreadyCollaborator) {
      return { success: false, error: 'This user is already a collaborator.' };
    }

    // 5. Connect in the database
    await prisma.trip.update({
      where: { id: tripId },
      data: { collaborators: { connect: { id: userToAdd.id } } }
    });

    revalidatePath(`/itinerary/${tripId}`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: 'Failed to add collaborator due to a server error.' };
  }
}

export async function removeCollaborator(tripId: string, userId: string) {
  try {
    // 1. Authenticate the caller
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) return { error: 'Unauthorized. Please log in.' };

    // 2. Verify Ownership
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { ownerId: true }
    });

    if (!trip) return { error: 'Trip not found.' };
    if (trip.ownerId !== session.user.id) {
      return { error: 'Only the trip owner can remove collaborators.' };
    }

    // 3. Disconnect in the database
    await prisma.trip.update({
      where: { id: tripId },
      data: { collaborators: { disconnect: { id: userId } } }
    });
    
    revalidatePath(`/itinerary/${tripId}`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: 'Failed to remove collaborator.' };
  }
}