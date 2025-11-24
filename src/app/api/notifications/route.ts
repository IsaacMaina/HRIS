import { NextResponse } from 'next/server';
import { prisma } from '../../../lib/prisma'; // Import prisma client from root lib directory
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/authconfig';

// GET /api/notifications - Get all notifications for logged-in user
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const notifications = await prisma.notification.findMany({
      where: { recipientId: session.user.id },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(notifications, { status: 200 });
  } catch (error: any) {
    console.error('Error fetching notifications:', error);

    // Handle specific Prisma errors
    if (error.code === 'P2024') { // Timeout error
      return NextResponse.json({ message: 'Database timeout, please try again' }, { status: 408 });
    } else if (error.code === 'P1001') { // Connection error
      return NextResponse.json({ message: 'Unable to connect to database' }, { status: 503 });
    } else if (error.code === 'P1017') { // Connection closed
      return NextResponse.json({ message: 'Database connection closed, please try again' }, { status: 503 });
    }

    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/notifications - Create new notification (called by backend events)
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { title, message, type, recipientId } = await req.json();

    if (!title || !message || !type || !recipientId) {
      return NextResponse.json({ message: 'Missing required fields' }, { status: 400 });
    }

    const notification = await prisma.notification.create({
      data: {
        title,
        message,
        type,
        recipientId,
      },
    });

    return NextResponse.json(notification, { status: 201 });
  } catch (error: any) {
    console.error('Error creating notification:', error);

    // Handle specific Prisma errors
    if (error.code === 'P2024') { // Timeout error
      return NextResponse.json({ message: 'Database timeout, please try again' }, { status: 408 });
    } else if (error.code === 'P1001') { // Connection error
      return NextResponse.json({ message: 'Unable to connect to database' }, { status: 503 });
    } else if (error.code === 'P1017') { // Connection closed
      return NextResponse.json({ message: 'Database connection closed, please try again' }, { status: 503 });
    }

    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
