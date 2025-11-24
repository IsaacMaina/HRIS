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

    if (!session || !session.user || session.user.role !== 'FINANCE') {
      return new Response(JSON.stringify({ error: 'Unauthorized - Only Finance users can update payroll status' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const params = await context.params; // Await the params promise
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Payroll entry ID is required' }), {
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
    const validStatuses = ['PAID', 'PENDING', 'FAILED'];
    if (!validStatuses.includes(newStatus.toUpperCase())) {
      return new Response(JSON.stringify({ error: 'Invalid status value' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let updatedPayrollEntry;

    await prisma.$transaction(async (tx) => {
      // Fetch the payroll entry to get details before update
      const payrollEntry = await tx.payslip.findUnique({
        where: { id },
        include: {
          employee: {
            include: {
              user: true
            }
          }
        }
      });

      if (!payrollEntry) {
        throw new Error('Payroll entry not found');
      }

      // Get the employee who is performing the status update
      const updatingEmployee = await tx.employee.findFirst({
        where: { userId: session.user.id }
      });

      if (!updatingEmployee) {
        throw new Error('Updating employee not found');
      }

      // Update the payroll entry status
      updatedPayrollEntry = await tx.payslip.update({
        where: { id },
        data: {
          paid: newStatus.toUpperCase() === 'PAID', // Convert to boolean for the 'paid' field
        },
      });

      // Log the activity
      await tx.activity.create({
        data: {
          employeeId: updatingEmployee.id,
          actionType: 'UPDATE',
          description: `Updated payroll status for ${payrollEntry.employee.user.name} from ${payrollEntry.paid ? 'PAID' : 'PENDING'} to ${newStatus.toUpperCase()}`,
          module: 'PAYROLL',
          details: {
            targetPayslipId: payrollEntry.id,
            targetEmployeeId: payrollEntry.employeeId,
            action: 'UPDATE_PAYROLL_STATUS'
          }
        }
      });

      // Create a notification for the employee with details
      if (newStatus.toUpperCase() === 'PAID') {
        await tx.notification.create({
          data: {
            title: 'Salary Paid',
            message: `Your salary for ${payrollEntry.month.toLocaleString('default', { month: 'long' })} ${payrollEntry.month.getFullYear()} has been paid.`,
            type: 'SALARY_PAID',
            recipientId: payrollEntry.employee.userId,
            details: {
              module: 'PAYROLL',
              action: 'SALARY_PAID',
              changes: [
                { field: 'status', oldValue: 'PENDING', newValue: 'PAID' },
                { field: 'month', oldValue: payrollEntry.month.toISOString(), newValue: payrollEntry.month.toISOString() },
                { field: 'netPay', oldValue: payrollEntry.netPay, newValue: payrollEntry.netPay }
              ],
              targetEmployeeName: payrollEntry.employee.user.name,
              targetEmployeeId: payrollEntry.employeeId,
            }
          },
        });
      }
    });

    if (!updatedPayrollEntry) {
      throw new Error('Payroll entry update failed');
    }

    return new Response(JSON.stringify({ 
      message: 'Payroll status updated successfully',
      payrollEntry: {
        id: updatedPayrollEntry.id,
        status: updatedPayrollEntry.paid ? 'PAID' : 'PENDING',
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating payroll status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to update payroll status';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}