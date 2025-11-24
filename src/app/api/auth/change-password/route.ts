import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authconfig';
import bcrypt from 'bcryptjs';

// Extend the session type to include our custom properties
interface CustomSession {
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export async function POST(request: NextRequest) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { oldPassword, newPassword } = await request.json();

    if (!oldPassword || !newPassword) {
      return new Response(JSON.stringify({ error: 'Old and new passwords are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user || !user.password) {
      return new Response(JSON.stringify({ error: 'User not found or password not set' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, user.password);

    if (!isPasswordValid) {
      return new Response(JSON.stringify({ error: 'Invalid old password' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { password: hashedPassword },
      });

      await tx.notification.create({
        data: {
          title: 'Password Changed',
          message: 'Your password has been changed successfully.',
          type: 'PASSWORD_CHANGE',
          recipientId: user.id,
        },
      });
    });

    return new Response(JSON.stringify({ message: 'Password changed successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return new Response(JSON.stringify({ error: 'Failed to change password' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
