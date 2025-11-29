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

    // Create a notification for the employee with details
    await prisma.notification.create({
      data: {
        title: `Leave Request ${newStatus}`,
        message: `Your leave request from ${leaveRequest.startDate.toDateString()} to ${leaveRequest.endDate.toDateString()} has been ${newStatus.toLowerCase()}.`,
        type: 'LEAVE_STATUS_UPDATE',
        recipientId: leaveRequest.employee.userId,
      },
    });

    // Find all admin and HR users to notify them of the status change
    const adminsAndHr = await prisma.user.findMany({
      where: {
        OR: [
          { role: 'ADMIN' },
          { role: 'HR' },
        ],
        id: { not: session.user.id } // Don't notify the person who made the change
      },
    });

    // Create notifications for each admin/HR user
    for (const user of adminsAndHr) {
      await prisma.notification.create({
        data: {
          title: `Leave Request ${newStatus}`,
          message: `${leaveRequest.employee.user.name}'s leave request from ${leaveRequest.startDate.toDateString()} to ${leaveRequest.endDate.toDateString()} has been ${newStatus.toLowerCase()}.`,
          type: 'LEAVE_STATUS_UPDATE',
          recipientId: user.id,
        }
      });
    }

    // If this is a status change from APPROVED to PENDING/REJECTED (or vice versa), adjust the leave allocation
    if (leaveRequest.status === 'APPROVED' && newStatus.toUpperCase() !== 'APPROVED') {
      // Previously approved leave is now pending or rejected - need to restore the days
      const startDate = new Date(leaveRequest.startDate);
      const endDate = new Date(leaveRequest.endDate);
      const timeDiff = endDate.getTime() - startDate.getTime();
      const daysToRestore = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates

      // Get the year for the leave allocation
      const leaveYear = startDate.getFullYear();

      // Get the leave allocation for this employee and year
      const leaveAllocation = await prisma.leaveAllocation.findUnique({
        where: {
          employeeId_year: {
            employeeId: leaveRequest.employeeId,
            year: leaveYear
          }
        }
      });

      if (leaveAllocation) {
        // Restore the days to the allocation
        await prisma.leaveAllocation.update({
          where: {
            employeeId_year: {
              employeeId: leaveRequest.employeeId,
              year: leaveYear
            }
          },
          data: {
            usedDays: {
              decrement: daysToRestore
            },
            remainingDays: {
              increment: daysToRestore
            }
          }
        });
      }
    } else if (leaveRequest.status !== 'APPROVED' && newStatus.toUpperCase() === 'APPROVED') {
      // Previously not approved leave is now approved - need to deduct the days
      const startDate = new Date(leaveRequest.startDate);
      const endDate = new Date(leaveRequest.endDate);
      const timeDiff = endDate.getTime() - startDate.getTime();
      const daysToDeduct = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates

      // Get the year for the leave allocation
      const leaveYear = startDate.getFullYear();

      // Get or create the leave allocation for this employee and year
      let leaveAllocation = await prisma.leaveAllocation.findUnique({
        where: {
          employeeId_year: {
            employeeId: leaveRequest.employeeId,
            year: leaveYear
          }
        }
      });

      if (!leaveAllocation) {
        // Create a new allocation if none exists for this year
        leaveAllocation = await prisma.leaveAllocation.create({
          data: {
            employeeId: leaveRequest.employeeId,
            year: leaveYear,
            totalDays: 30, // Default to 30 days
            usedDays: 0,
            remainingDays: 30
          }
        });
      }

      // Deduct the days from the allocation
      await prisma.leaveAllocation.update({
        where: {
          employeeId_year: {
            employeeId: leaveRequest.employeeId,
            year: leaveYear
          }
        },
        data: {
          usedDays: {
            increment: daysToDeduct
          },
          remainingDays: {
            decrement: daysToDeduct
          }
        }
      });
    }

    // Update the leave request status
    const updatedLeaveRequest = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: newStatus.toUpperCase() as any, // Convert to uppercase to match enum
      },
      include: {
        employee: true
      }
    });

    // Log the activity
    await prisma.activity.create({
      data: {
        employeeId: updatingEmployee.id,
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

    if (!updatedLeaveRequest) {
      // This should not happen if the transaction is successful
      throw new Error('Leave request update failed');
    }

    return new Response(JSON.stringify({ 
      message: 'Leave request status updated successfully',
      leaveRequest: {
        id: updatedLeaveRequest.id,
        status: updatedLeaveRequest.status.toLowerCase(),
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating leave request status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update leave request status';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}