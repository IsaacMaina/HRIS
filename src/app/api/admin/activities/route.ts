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

export async function GET(request: NextRequest) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch activities from the database, joined with employee data to get employee names
    const activities = await prisma.activity.findMany({
      take: 10, // Get last 10 activities
      orderBy: {
        timestamp: 'desc',
      },
      include: {
        employee: {
          include: {
            user: true, // Include user to get employee name
          }
        }
      },
    });

    // Format the activities to match what the frontend expects
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      actionType: activity.actionType,
      description: activity.description,
      module: activity.module,
      timestamp: activity.timestamp.toISOString(),
      employeeName: activity.employee.user.name || 'Unknown Employee',
      employeeId: activity.employeeId,
      details: activity.details || undefined,
    }));

    return new Response(JSON.stringify(formattedActivities), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching admin activities:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch activities' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}