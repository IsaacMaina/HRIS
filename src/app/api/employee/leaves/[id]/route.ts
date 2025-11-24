import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authconfig';
import { LeaveStatus } from '@prisma/client';

// GET /api/employee/leaves/[id] - Get specific leave request
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
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

    const leave = await prisma.leaveRequest.findUnique({
      where: { 
        id: params.id,
        employeeId: employee.id, // Ensure the employee can only access their own leaves
      },
    });

    if (!leave) {
      return NextResponse.json({ message: 'Leave request not found' }, { status: 404 });
    }

    return NextResponse.json(leave, { status: 200 });
  } catch (error) {
    console.error('Error fetching leave request:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH /api/employee/leaves/[id] - Update a specific leave request
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
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

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { 
        id: params.id,
        employeeId: employee.id,
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ message: 'Leave request not found' }, { status: 404 });
    }

    // Prevent updating leave requests that are already approved or rejected
    if (leaveRequest.status !== 'PENDING') {
      return NextResponse.json({ message: 'Cannot update a leave request that is not pending' }, { status: 400 });
    }

    const { startDate, endDate, type, reason } = await req.json();
    const updates: any = {};

    if (startDate) updates.startDate = new Date(startDate);
    if (endDate) updates.endDate = new Date(endDate);
    if (type) updates.type = type;

    const updatedLeave = await prisma.leaveRequest.update({
      where: { id: params.id },
      data: updates,
    });

    // Log the activity
    await prisma.activity.create({
      data: {
        employeeId: employee.id,
        actionType: 'UPDATE',
        description: `Updated ${type || leaveRequest.type} leave request from ${startDate || leaveRequest.startDate} to ${endDate || leaveRequest.endDate}`,
        module: 'Leaves',
      },
    });

    return NextResponse.json(updatedLeave, { status: 200 });
  } catch (error) {
    console.error('Error updating leave request:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}

// DELETE /api/employee/leaves/[id] - Delete a specific leave request
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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

    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { 
        id: params.id,
        employeeId: employee.id,
      },
    });

    if (!leaveRequest) {
      return NextResponse.json({ message: 'Leave request not found' }, { status: 404 });
    }

    // Prevent deleting leave requests that are already approved or rejected
    if (leaveRequest.status !== 'PENDING') {
      return NextResponse.json({ message: 'Cannot delete a leave request that is not pending' }, { status: 400 });
    }

    await prisma.leaveRequest.delete({
      where: { id: params.id },
    });

    // Log the activity
    await prisma.activity.create({
      data: {
        employeeId: employee.id,
        actionType: 'DELETE',
        description: `Deleted ${leaveRequest.type} leave request from ${leaveRequest.startDate} to ${leaveRequest.endDate}`,
        module: 'Leaves',
      },
    });

    return NextResponse.json({ message: 'Leave request deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('Error deleting leave request:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}