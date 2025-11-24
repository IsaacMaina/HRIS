import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authconfig';
import { LeaveType } from '@prisma/client';

// GET /api/employee/leaves - Get employee leave requests
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });

    if (!employee) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
    }

    const leaves = await prisma.leaveRequest.findMany({
      where: { employeeId: employee.id },
      orderBy: {
        appliedAt: 'desc', // Sort by application date, newest first
      },
    });

    return NextResponse.json(leaves, { status: 200 });
  } catch (error) {
    console.error('Error fetching employee leave requests:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// POST /api/employee/leaves - Create a new leave request
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
      include: {
        user: true
      }
    });

    if (!employee) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
    }

    const { type, startDate, endDate, reason } = await req.json();

    if (!type || !startDate || !endDate) {
      return NextResponse.json({ message: 'Missing fields' }, { status: 400 });
    }

    const newLeaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        type: type as LeaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        // reason is not in the prisma model for leaveRequest
      },
    });

    // Log the activity
    await prisma.activity.create({
      data: {
        employeeId: employee.id,
        actionType: 'CREATE',
        description: `Applied for ${type} leave from ${startDate} to ${endDate}`,
        module: 'Leaves',
        details: {
          action: 'LEAVE_REQUEST_CREATED',
          targetLeaveId: newLeaveRequest.id,
          targetEmployeeName: employee.user?.name || 'Unknown Employee',
        }
      },
    });

    // Create a notification for admin/HR users about the new leave request
    const adminUsers = await prisma.user.findMany({
      where: {
        role: {
          in: ['ADMIN', 'HR']
        }
      }
    });

    for (const adminUser of adminUsers) {
      await prisma.notification.create({
        data: {
          title: 'New Leave Request',
          message: `${employee.user?.name || 'Employee'} has applied for ${type} leave from ${startDate} to ${endDate}`,
          type: 'LEAVE_REQUEST',
          recipientId: adminUser.id,
        }
      });
    }

    return NextResponse.json(newLeaveRequest, { status: 201 });
  } catch (error) {
    console.error('Error creating leave request:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
