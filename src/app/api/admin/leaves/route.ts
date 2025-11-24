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

export async function POST(request: NextRequest) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { employeeId, leaveType, startDate, endDate, reason } = await request.json();

    if (!employeeId || !leaveType || !startDate || !endDate || !reason) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the employee who is creating the leave request
    const creatingEmployee = await prisma.employee.findFirst({
      where: { userId: session.user.id }
    });

    if (!creatingEmployee) {
      return new Response(JSON.stringify({ error: 'Creating employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const targetEmployee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true },
    });

    if (!targetEmployee) {
      return new Response(JSON.stringify({ error: 'Target employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let leaveRequestId: string;

    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx) => {
      // Create the leave request
      const leaveRequest = await tx.leaveRequest.create({
        data: {
          type: leaveType,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          status: 'PENDING',
          employeeId: employeeId,
          appliedAt: new Date(),
          reason: reason,
        },
      });

      leaveRequestId = leaveRequest.id;

      // Log the activity
      await tx.activity.create({
        data: {
          employeeId: creatingEmployee.id,
          actionType: 'CREATE',
          description: `Created leave request for employee ${targetEmployee.user.name}`,
          module: 'LEAVE',
          details: {
            targetLeaveId: leaveRequest.id,
            targetEmployeeId: employeeId,
            action: 'CREATE_LEAVE_REQUEST'
          }
        }
      });

      // Find all admin and HR users to notify them
      const adminsAndHr = await tx.user.findMany({
        where: {
          OR: [
            { role: 'ADMIN' },
            { role: 'HR' },
          ],
        },
      });

      // Create notifications for each admin/HR user
      for (const user of adminsAndHr) {
        await tx.notification.create({
          data: {
            title: 'New Leave Request',
            message: `A new leave request has been submitted by ${targetEmployee.user.name} and is awaiting approval.`,
            type: 'LEAVE_REQUEST',
            recipientId: user.id,
          },
        });
      }
    });

    return new Response(JSON.stringify({
      message: 'Leave request created successfully',
      leaveRequestId: leaveRequestId
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating leave request:', error);
    return new Response(JSON.stringify({ error: 'Failed to create leave request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
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

    // Fetch leave requests from the database, sorted by creation date (newest first)
    const leaveRequests = await prisma.leaveRequest.findMany({
      include: {
        employee: {
          include: {
            user: true, // Include user to get employee name
          }
        }
      },
      orderBy: {
        appliedAt: 'desc' // Sort by application date, newest first
      },
    });

    // Format the leave requests to match what the frontend expects
    const formattedLeaveRequests = leaveRequests.map(leave => ({
      id: leave.id,
      employeeName: leave.employee.user.name || 'Unknown Employee',
      staffNo: leave.employee.staffNo || 'N/A',
      type: leave.type,
      startDate: leave.startDate.toISOString(),
      endDate: leave.endDate.toISOString(),
      status: leave.status,
      appliedAt: leave.appliedAt.toISOString(),
      reason: leave.reason || 'No reason provided',
    }));

    return new Response(JSON.stringify(formattedLeaveRequests), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching leave requests:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch leave requests' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}