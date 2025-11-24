import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authconfig';

// PATCH /api/notifications/:id/read - Mark one as read
export async function PATCH(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const notification = await prisma.notification.update({
      where: { id, recipientId: session.user.id },
      data: { isRead: true },
    });

    if (!notification) {
      return NextResponse.json({ message: 'Notification not found or unauthorized' }, { status: 404 });
    }

    return NextResponse.json(notification, { status: 200 });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
