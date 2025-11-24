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

    if (!session || !session.user || session.user.role !== 'FINANCE') {
      return new Response(JSON.stringify({ error: 'Unauthorized - Only Finance users can view payroll details' }), {
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

    // Fetch the specific payroll entry from the database
    const payrollEntry = await prisma.payslip.findUnique({
      where: { id },
      include: {
        employee: {
          include: {
            user: true, // Include user to get employee name
          }
        }
      },
    });

    if (!payrollEntry) {
      return new Response(JSON.stringify({ error: 'Payroll entry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Format the payroll entry to match what the frontend expects
    const formattedPayrollEntry = {
      id: payrollEntry.id,
      employeeId: payrollEntry.employeeId,
      employeeName: payrollEntry.employee.user.name || 'Unknown Employee',
      staffNo: payrollEntry.employee.staffNo || 'N/A',
      grossSalary: payrollEntry.grossSalary,
      deductions: payrollEntry.deductions,
      netPay: payrollEntry.netPay,
      month: payrollEntry.month.toISOString(),
      status: payrollEntry.paid ? 'PAID' : 'PENDING',
      paid: payrollEntry.paid,
    };

    return new Response(JSON.stringify(formattedPayrollEntry), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching payroll entry:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch payroll entry' }), {
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

    if (!session || !session.user || session.user.role !== 'FINANCE') {
      return new Response(JSON.stringify({ error: 'Unauthorized - Only Finance users can update payroll details' }), {
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

    const { employeeId, month, grossSalary, deductions, netPay, paid } = await request.json();

    if (!employeeId || !month || grossSalary === undefined || netPay === undefined) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the payroll entry to get details before update
    const payrollEntry = await prisma.payslip.findUnique({
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
      return new Response(JSON.stringify({ error: 'Payroll entry not found' }), {
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

    // Update the payroll entry
    const updatedPayrollEntry = await prisma.payslip.update({
      where: { id },
      data: {
        employeeId,
        month: new Date(month),
        grossSalary,
        deductions: deductions || {},
        netPay,
        paid,
      },
    });

    // Log the activity
    await prisma.activity.create({
      data: {
        employeeId: updatingEmployee?.id,
        actionType: 'UPDATE',
        description: `Updated payroll entry for ${updatedPayrollEntry.employeeId}`,
        module: 'PAYROLL',
        details: {
          targetPayslipId: updatedPayrollEntry.id,
          targetEmployeeId: employeeId,
          action: 'UPDATE_PAYROLL'
        }
      }
    });

    return new Response(JSON.stringify({
      message: 'Payroll entry updated successfully',
      payrollEntry: {
        id: updatedPayrollEntry.id,
        employeeId: updatedPayrollEntry.employeeId,
        employeeName: updatedPayrollEntry.employee.user.name || 'Unknown Employee',
        staffNo: updatedPayrollEntry.employee.staffNo || 'N/A',
        grossSalary: updatedPayrollEntry.grossSalary,
        deductions: updatedPayrollEntry.deductions,
        netPay: updatedPayrollEntry.netPay,
        month: updatedPayrollEntry.month.toISOString(),
        status: updatedPayrollEntry.paid ? 'PAID' : 'PENDING',
        paid: updatedPayrollEntry.paid,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating payroll entry:', error);
    return new Response(JSON.stringify({ error: 'Failed to update payroll entry' }), {
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

    if (!session || !session.user || session.user.role !== 'FINANCE') {
      return new Response(JSON.stringify({ error: 'Unauthorized - Only Finance users can delete payroll entries' }), {
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

    // Fetch the payroll entry to get details before deletion
    const payrollEntry = await prisma.payslip.findUnique({
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
      return new Response(JSON.stringify({ error: 'Payroll entry not found' }), {
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
        description: `Deleted payroll entry for ${payrollEntry.employee.user.name}`,
        module: 'PAYROLL',
        details: {
          targetPayslipId: payrollEntry.id,
          targetEmployeeId: payrollEntry.employeeId,
          action: 'DELETE_PAYROLL'
        }
      }
    });

    // Delete the payroll entry from the database
    await prisma.payslip.delete({
      where: { id },
    });

    return new Response(JSON.stringify({ message: 'Payroll entry deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting payroll entry:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete payroll entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}