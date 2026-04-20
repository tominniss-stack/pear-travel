'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function updateBaseCurrency(currency: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      throw new Error('Unauthorised');
    }

    await prisma.user.update({
      where: { username: session.user.username },
      data: { baseCurrency: currency }
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorised') throw error;
    console.error('Update base currency error:', error);
    throw new Error('Failed to update base currency.');
  }
}

export async function updatePersonalDetails(data: { name?: string, email?: string }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      throw new Error('Unauthorised');
    }

    await prisma.user.update({
      where: { username: session.user.username },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.email !== undefined && { email: data.email }),
      }
    });

    return { success: true };
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorised') throw error;
    console.error('Update personal details error:', error);
    throw new Error('Failed to update personal details.');
  }
}

export async function getUserProfile() {

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { username: session.user.username },
      select: {
        baseCurrency: true,
        aestheticPreference: true,
      }
    });

    return user;
  } catch (error) {
    console.error('Fetch user profile error:', error);
    return null;
  }
}
