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
      return new Response(JSON.stringify({ error: 'Payout transaction ID is required' }), {
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
    const validStatuses = ['PENDING', 'COMPLETED', 'FAILED'];
    if (!validStatuses.includes(newStatus)) {
      return new Response(JSON.stringify({ error: 'Invalid status value' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the payout transaction to get details before update
    const payoutTransaction = await prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true
          }
        }
      }
    });

    if (!payoutTransaction) {
      return new Response(JSON.stringify({ error: 'Payout transaction not found' }), {
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

    // Update the payout transaction status
    const updatedPayoutTransaction = await prisma.payslip.update({
      where: { id },
      data: {
        paid: newStatus === 'COMPLETED', // Convert status to boolean for the 'paid' field
      },
    });

    // Log the activity
    await prisma.activity.create({
      data: {
        employeeId: updatingEmployee?.id,
        actionType: 'UPDATE',
        description: `Updated payout status for ${payoutTransaction.employee.user.name} from ${payoutTransaction.paid ? 'COMPLETED' : 'PENDING'} to ${newStatus}`,
        module: 'PAYOUT',
        details: {
          targetPayslipId: payoutTransaction.id,
          targetEmployeeId: payoutTransaction.employeeId,
          action: 'UPDATE_PAYOUT_STATUS'
        }
      }
    });

    // Fetch updated data to return in the response
    const updatedData = await prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true,
            bank: true
          }
        }
      }
    });

    return new Response(JSON.stringify({ 
      message: 'Payout status updated successfully',
      payoutTransaction: {
        id: updatedData?.id || '',
        ref: updatedData?.payoutRef || 'N/A',
        date: updatedData?.createdAt.toISOString() || new Date().toISOString(),
        amount: updatedData?.netPay || 0,
        status: updatedData?.paid ? 'COMPLETED' : 'PENDING',
        bank: updatedData?.employee.bank?.name || 'N/A',
        employeeName: updatedData?.employee.user.name || 'Unknown Employee',
        employeeId: updatedData?.employee.staffNo || 'N/A',
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating payout status:', error);
    return new Response(JSON.stringify({ error: 'Failed to update payout status' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}