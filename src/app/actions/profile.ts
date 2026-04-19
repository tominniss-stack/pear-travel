'use server';

import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function updateBaseCurrency(currency: string) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.username) {
      return { success: false, error: 'Not authenticated.' };
    }

    await prisma.user.update({
      where: { username: session.user.username },
      data: { baseCurrency: currency }
    });

    return { success: true };
  } catch (error) {
    console.error('Update base currency error:', error);
    return { success: false, error: 'Failed to update base currency.' };
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
