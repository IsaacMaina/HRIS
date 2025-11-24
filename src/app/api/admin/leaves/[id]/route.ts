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
  context: { params: Promise<{ id: string }> }
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

    const params = await context.params; // Await the params promise
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Leave request ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the leave request with employee details
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true
          }
        }
      }
    });

    if (!leaveRequest) {
      return new Response(JSON.stringify({ error: 'Leave request not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Format the leave request to match what the frontend expects
    const formattedLeaveRequest = {
      id: leaveRequest.id,
      employeeName: leaveRequest.employee.user.name || 'Unknown Employee',
      staffNo: leaveRequest.employee.staffNo || 'N/A',
      type: leaveRequest.type,
      startDate: leaveRequest.startDate.toISOString(),
      endDate: leaveRequest.endDate.toISOString(),
      status: leaveRequest.status.toLowerCase(), // Convert to lowercase to match UI expectations
      appliedAt: leaveRequest.appliedAt.toISOString(),
      reason: leaveRequest.reason || 'No reason provided',
    };

    return new Response(JSON.stringify(formattedLeaveRequest), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching leave request:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch leave request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const params = await context.params; // Await the params promise
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Leave request ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the leave request to get details before deletion
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true
          }
        }
      }
    });

    if (!leaveRequest) {
      return new Response(JSON.stringify({ error: 'Leave request not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the employee who is performing the deletion
    const deletingEmployee = await prisma.employee.findFirst({
      where: { userId: session.user.id }
    });

    if (!deletingEmployee) {
      return new Response(JSON.stringify({ error: 'Deleting employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Log the activity before deletion
    await prisma.activity.create({
      data: {
        employeeId: deletingEmployee?.id,
        actionType: 'DELETE',
        description: `Deleted leave request for ${leaveRequest.employee.user.name}`,
        module: 'LEAVE',
        details: {
          targetLeaveId: leaveRequest.id,
          targetEmployeeId: leaveRequest.employeeId,
          action: 'DELETE_LEAVE_REQUEST'
        }
      }
    });

    // Delete the leave request from the database
    await prisma.leaveRequest.delete({
      where: { id },
    });

    return new Response(JSON.stringify({ message: 'Leave request deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting leave request:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete leave request' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
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

    const params = await context.params; // Await the params promise
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Leave request ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { status: newStatus } = await request.json();

    if (!newStatus) {
      return new Response(JSON.stringify({ error: 'Status is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Validate the new status value
    const validStatuses = ['APPROVED', 'REJECTED', 'PENDING'];
    if (!validStatuses.includes(newStatus.toUpperCase())) {
      return new Response(JSON.stringify({ error: 'Invalid status value' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the leave request to get details before update
    const leaveRequest = await prisma.leaveRequest.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true
          }
        }
      }
    });

    if (!leaveRequest) {
      return new Response(JSON.stringify({ error: 'Leave request not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get the employee who is performing the status update
    const updatingEmployee = await prisma.employee.findFirst({
      where: { userId: session.user.id }
    });

    if (!updatingEmployee) {
      return new Response(JSON.stringify({ error: 'Updating employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update the leave request status
    const updatedLeaveRequest = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: newStatus.toUpperCase() as any, // Convert to uppercase to match enum
      },
    });

    // Log the activity
    await prisma.activity.create({
      data: {
        employeeId: updatingEmployee?.id,
        actionType: 'UPDATE',
        description: `Updated leave request status for ${leaveRequest.employee.user.name} from ${leaveRequest.status} to ${newStatus.toUpperCase()}`,
        module: 'LEAVE',
        details: {
          targetLeaveId: leaveRequest.id,
          targetEmployeeId: leaveRequest.employeeId,
          action: 'UPDATE_LEAVE_STATUS'
        }
      }
    });

    // Create a notification for the employee with details
    await prisma.notification.create({
      data: {
        title: `Leave Request ${newStatus}`,
        message: `Your leave request from ${leaveRequest.startDate.toDateString()} to ${leaveRequest.endDate.toDateString()} has been ${newStatus.toLowerCase()}.`,
        type: 'LEAVE_STATUS_UPDATE',
        recipientId: leaveRequest.employee.user.id,
      },
    });

    return new Response(JSON.stringify({
      message: 'Leave request status updated successfully',
      leaveRequest: {
        id: updatedLeaveRequest.id,
        employeeName: leaveRequest.employee.user.name || 'Unknown Employee',
        staffNo: leaveRequest.employee.staffNo || 'N/A',
        type: updatedLeaveRequest.type,
        startDate: updatedLeaveRequest.startDate.toISOString(),
        endDate: updatedLeaveRequest.endDate.toISOString(),
        status: updatedLeaveRequest.status.toLowerCase(), // Convert to lowercase to match UI expectations
        appliedAt: updatedLeaveRequest.appliedAt.toISOString(),
        reason: updatedLeaveRequest.reason || 'No reason provided',
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating leave request status:', error);
    return new Response(JSON.stringify({ error: 'Failed to update leave request status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}