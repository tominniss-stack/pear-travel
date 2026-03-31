'use server';

import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function registerUser(prevState: any, formData: FormData) {
  const name = formData.get('name') as string;
  const username = formData.get('username') as string;
  const password = formData.get('password') as string;
  const confirmPassword = formData.get('confirmPassword') as string;

  // 1. Basic Validation
  if (!username || !password || !name) {
    return { error: 'Please fill in all required fields.' };
  }

  if (password.length < 6) {
    return { error: 'Password must be at least 6 characters long.' };
  }

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match.' };
  }

  try {
    // 2. Check if username is already taken
    const existingUser = await prisma.user.findUnique({
      where: { username: username.toLowerCase() }
    });

    if (existingUser) {
      return { error: 'That username is already taken. Please choose another.' };
    }

    // 3. Hash the password securely
    const hashedPassword = await bcrypt.hash(password, 12);

    // 4. Create the User in the database
    await prisma.user.create({
      data: {
        name,
        username: username.toLowerCase(),
        password: hashedPassword,
        role: 'USER'
      }
    });

    return { success: true };
  } catch (error) {
    console.error('Registration error:', error);
    return { error: 'Something went wrong while creating your account.' };
  }
}

export async function registerAction(username: string, password: string) {
  const formData = new FormData();
  formData.append('name', username);
  formData.append('username', username);
  formData.append('password', password);
  formData.append('confirmPassword', password);
  return registerUser(null, formData);
}