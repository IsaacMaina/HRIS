import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
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

// GET /api/activities - Get all activities for logged-in employee
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    // Find the employee record by userId instead of relying on user.employeeId
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });

    if (!employee) {
      return NextResponse.json({ message: 'No employee record found' }, { status: 401 });
    }

    const activities = await prisma.activity.findMany({
      where: { employeeId: employee.id },
      orderBy: { timestamp: 'desc' },
      take: 5, // Limit to 5 recent activities
    });

    return NextResponse.json(activities, { status: 200 });
  } catch (error) {
    console.error('Error fetching activities:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
