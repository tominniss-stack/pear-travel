"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { sendInviteEmail } from "@/lib/email";

export async function getAllUsers() {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') throw new Error('Forbidden');

  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      username: true,
      email: true,
      role: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' }
  });

  return users;
}

export async function adminCreateUser(data: any): Promise<{ success: boolean; error?: string; user?: any }> {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') throw new Error('Forbidden');

  const hashedPassword = await bcrypt.hash(data.password, 12);

  try {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        username: data.username,
        email: data.email,
        password: hashedPassword,
        role: data.role || "USER",
        onboardingComplete: false,
      }
    });

    if (data.email) {
      await sendInviteEmail(data.email, data.name, data.username, data.password);
    }

    const { password: _password, ...sanitizedUser } = user;

    return { success: true, user: sanitizedUser };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { success: false, error: 'A user with this username or email already exists.' };
    }
    return { success: false, error: 'An unexpected error occurred while creating the user.' };
  }
}

export async function adminDeleteUser(id: string) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== 'ADMIN') throw new Error('Forbidden');

  if (session.user.id === id) {
    throw new Error('Cannot delete your own account');
  }

  await prisma.user.delete({
    where: { id }
  });

  return { success: true };
}
