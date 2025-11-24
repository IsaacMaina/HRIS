import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authconfig';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const params = await context.params; // Await the params promise
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Payslip ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get employee associated with this user
    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });

    if (!employee) {
      return new Response(JSON.stringify({ error: 'Employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the specific payslip for this employee
    const payslip = await prisma.payslip.findUnique({
      where: { 
        id,
        employeeId: employee.id  // Ensure employee can only access their own payslips
      },
      include: {
        employee: {
          include: {
            user: true
          }
        }
      }
    });

    if (!payslip) {
      return new Response(JSON.stringify({ error: 'Payslip not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Parse deductions from JSON string if it's a string, otherwise return as is
    let parsedDeductions = payslip.deductions;
    if (typeof payslip.deductions === 'string') {
      try {
        parsedDeductions = JSON.parse(payslip.deductions);
      } catch (e) {
        console.error('Error parsing deductions:', e);
        parsedDeductions = {};
      }
    } else if (payslip.deductions === null) {
      parsedDeductions = {};
    }

    return new Response(JSON.stringify({
      id: payslip.id,
      employeeId: payslip.employeeId,
      employeeName: payslip.employee.user.name,
      staffNo: payslip.employee.staffNo,
      month: payslip.month,
      grossSalary: payslip.grossSalary,
      deductions: parsedDeductions,
      netPay: payslip.netPay,
      paid: payslip.paid,
      payoutRef: payslip.payoutRef,
      createdAt: payslip.createdAt,
      employee: payslip.employee,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching payslip:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}