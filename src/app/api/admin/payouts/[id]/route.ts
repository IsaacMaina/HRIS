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
      return new Response(JSON.stringify({ error: 'Payout transaction ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the specific payout transaction from the database
    const payoutTransaction = await prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true, // Include user to get employee name
          }
        }
      },
    });

    if (!payoutTransaction) {
      return new Response(JSON.stringify({ error: 'Payout transaction not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Format the payout transaction to match what the frontend expects
    const formattedPayout = {
      id: payoutTransaction.id,
      ref: payoutTransaction.payoutRef || 'N/A',
      date: payoutTransaction.createdAt.toISOString(),
      amount: payoutTransaction.netPay,
      status: payoutTransaction.paid ? 'COMPLETED' : 'PENDING',
      bank: payoutTransaction.employee.bank?.name || 'N/A',
      employeeName: payoutTransaction.employee.user.name || 'Unknown Employee',
      employeeId: payoutTransaction.employee.staffNo || 'N/A',
    };

    return new Response(JSON.stringify(formattedPayout), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching payout transaction:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch payout transaction' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function PUT(
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

    const { ref, amount, status, bank } = await request.json();

    if (!ref || amount === undefined || !status || !bank) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
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

    // Get the employee who is performing the update
    const updatingEmployee = await prisma.employee.findFirst({
      where: { userId: session.user.id }
    });

    if (!updatingEmployee) {
      return new Response(JSON.stringify({ error: 'Updating employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update the payout transaction
    const updatedPayoutTransaction = await prisma.payslip.update({
      where: { id },
      data: {
        payoutRef: ref,
        netPay: amount,
        deductions: {}, // Ensure deductions field is included
        paid: status === 'COMPLETED',
      },
    });

    // Log the activity
    await prisma.activity.create({
      data: {
        employeeId: updatingEmployee?.id,
        actionType: 'UPDATE',
        description: `Updated payout transaction for ${updatedPayoutTransaction.employeeId}`,
        module: 'PAYOUT',
        details: {
          targetPayslipId: updatedPayoutTransaction.id,
          targetEmployeeId: updatedPayoutTransaction.employeeId,
          action: 'UPDATE_PAYOUT'
        }
      }
    });

    return new Response(JSON.stringify({ 
      message: 'Payout transaction updated successfully',
      payoutTransaction: {
        id: updatedPayoutTransaction.id,
        ref: updatedPayoutTransaction.payoutRef || 'N/A',
        date: updatedPayoutTransaction.createdAt.toISOString(),
        amount: updatedPayoutTransaction.netPay,
        status: updatedPayoutTransaction.paid ? 'COMPLETED' : 'PENDING',
        bank: updatedPayoutTransaction.employee.bank?.name || 'N/A',
        employeeName: updatedPayoutTransaction.employee.user.name || 'Unknown Employee',
        employeeId: updatedPayoutTransaction.employee.staffNo || 'N/A',
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating payout transaction:', error);
    return new Response(JSON.stringify({ error: 'Failed to update payout transaction' }), {
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
      return new Response(JSON.stringify({ error: 'Payout transaction ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the payout transaction to get details before deletion
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
        description: `Deleted payout transaction for ${payoutTransaction.employee.user.name}`,
        module: 'PAYOUT',
        details: {
          targetPayslipId: payoutTransaction.id,
          targetEmployeeId: payoutTransaction.employeeId,
          action: 'DELETE_PAYOUT'
        }
      }
    });

    // Delete the payout transaction from the database
    await prisma.payslip.delete({
      where: { id },
    });

    return new Response(JSON.stringify({ message: 'Payout transaction deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting payout transaction:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete payout transaction' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}