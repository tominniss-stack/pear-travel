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
    const userToAdd = await prisma.user.findUnique({ 
      where: { username: username.toLowerCase() } 
    });
    
    if (!userToAdd) {
      return { error: 'User not found. Please check the username and try again.' };
    }

    // 4. Validate they aren't adding themselves or an existing collaborator
    if (trip.ownerId === userToAdd.id) return { error: 'You cannot invite the trip owner.' };
    if (trip.collaborators.some(c => c.id === userToAdd.id)) {
      return { error: 'User is already a collaborator on this trip.' };
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