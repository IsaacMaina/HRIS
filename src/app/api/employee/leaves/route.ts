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

    // Get current year's leave allocation
    const currentYear = new Date().getFullYear();
    const currentAllocation = await prisma.leaveAllocation.findUnique({
      where: {
        employeeId_year: {
          employeeId: employee.id,
          year: currentYear
        }
      }
    });

    // Include leave allocation information in the response
    const response = {
      leaves,
      leaveAllocation: currentAllocation || null,
      currentYear
    };

    return NextResponse.json(response, { status: 200 });
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

    // For Annual Leave, check if there are enough available days
    if (type === 'ANNUAL') {
      const startDateObj = new Date(startDate);
      const endDateObj = new Date(endDate);
      const timeDiff = endDateObj.getTime() - startDateObj.getTime();
      const requestedDays = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates

      const leaveYear = startDateObj.getFullYear();

      // Get or create the leave allocation for this employee and year
      let leaveAllocation = await prisma.leaveAllocation.findUnique({
        where: {
          employeeId_year: {
            employeeId: employee.id,
            year: leaveYear
          }
        }
      });

      if (!leaveAllocation) {
        // Create a new allocation if none exists for this year
        leaveAllocation = await prisma.leaveAllocation.create({
          data: {
            employeeId: employee.id,
            year: leaveYear,
            totalDays: 30, // Default to 30 days
            usedDays: 0,
            remainingDays: 30
          }
        });
      }

      // Check if there are enough remaining days
      if (leaveAllocation.remainingDays < requestedDays) {
        return NextResponse.json({
          message: `Not enough leave days available. You have ${leaveAllocation.remainingDays} days remaining, but requested ${requestedDays} days.`
        }, { status: 400 });
      }
    }

    const newLeaveRequest = await prisma.leaveRequest.create({
      data: {
        employeeId: employee.id,
        type: type as LeaveType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        reason: reason || null, // Add reason field if provided, otherwise null
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
