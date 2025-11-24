import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authconfig';

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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = await params;

    // Fetch the specific activity from the database
    const activity = await prisma.activity.findUnique({
      where: {
        id: id,
      },
      include: {
        employee: {
          include: {
            user: true, // Include user to get employee name
          }
        }
      },
    });

    if (!activity) {
      return new Response(JSON.stringify({ error: 'Activity not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Format the activity to match what the frontend expects
    const formattedActivity = {
      id: activity.id,
      actionType: activity.actionType,
      description: activity.description,
      module: activity.module,
      timestamp: activity.timestamp.toISOString(),
      employeeName: activity.employee.user.name || 'Unknown Employee',
      employeeId: activity.employeeId,
      details: activity.details || undefined,
    };

    return new Response(JSON.stringify(formattedActivity), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching activity:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch activity' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}