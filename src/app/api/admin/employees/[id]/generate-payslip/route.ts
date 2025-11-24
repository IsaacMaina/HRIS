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

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || !session.user.id || (session.user.role !== 'ADMIN' && session.user.role !== 'HR' && session.user.role !== 'FINANCE')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = await params;

    // Parse the request body to get payslip details
    const body = await request.json();
    const { month, year, additionalEarnings = 0, additionalDeductions = 0 } = body;

    const employee = await prisma.employee.findUnique({
      where: { id: id },
      include: {
        user: true,
      }
    });

    if (!employee) {
      return new Response(JSON.stringify({ error: 'Employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    let formattedPayslip;

    await prisma.$transaction(async (tx) => {
      // Calculate deductions based on salary and rates
      const nhifAmount = employee.salary * employee.nhifRate;
      const nssfAmount = employee.salary * employee.nssfRate;
      const taxRate = 0.3; // Example tax rate (30%)
      const taxAmount = employee.salary * taxRate;

      // Calculate gross and net pay
      const grossSalary = employee.salary + additionalEarnings;
      const totalDeductions = nhifAmount + nssfAmount + taxAmount + additionalDeductions;
      const netPay = grossSalary - totalDeductions;

      // Create payslip in the database
      const payslip = await tx.payslip.create({
        data: {
          employeeId: employee.id,
          month: new Date(parseInt(year), parseInt(month) - 1, 1),
          grossSalary: grossSalary,
          netPay: netPay,
          deductions: {
            tax: taxAmount,
            nhif: nhifAmount,
            nssf: nssfAmount,
            additional: additionalDeductions,
          },
          fileUrl: '', // Will be updated below
          paid: false,
          payoutRef: `PAY-${year}-${month}-${employee.staffNo}`.toUpperCase(),
        },
      });

      // Update fileUrl to point to the specific payslip download route
      const updatedPayslip = await tx.payslip.update({
        where: { id: payslip.id },
        data: {
          fileUrl: `/api/admin/payslips/${payslip.id}/download`
        },
      });

      // Log the activity
      const sessionEmployee = await tx.employee.findFirst({
        where: { userId: session.user?.id }
      });

      await tx.activity.create({
        data: {
          employeeId: sessionEmployee?.id,
          actionType: 'CREATE',
          description: `Generated payslip for ${employee.user.name} for ${year}-${month}`,
          module: 'PAYROLL',
          details: {
            targetEmployeeId: employee.id,
            targetEmployeeName: employee.user.name,
            action: 'GENERATE_PAYSLIP',
            payslipId: updatedPayslip.id,
            month: month,
            year: year
          }
        }
      });

      // Create a notification for the employee
      await tx.notification.create({
        data: {
          title: 'New Payslip Generated',
          message: `Your payslip for ${new Date(0, month - 1).toLocaleString('default', { month: 'long' })} ${year} is now available.`,
          type: 'PAYSLIP_GENERATED',
          recipientId: employee.userId,
        },
      });

      formattedPayslip = {
        id: updatedPayslip.id,
        employeeId: employee.id,
        employeeName: employee.user.name,
        month: updatedPayslip.month.toISOString(),
        grossSalary: updatedPayslip.grossSalary,
        netPay: updatedPayslip.netPay,
        deductions: updatedPayslip.deductions,
        paid: updatedPayslip.paid,
        fileUrl: updatedPayslip.fileUrl,
        payoutRef: updatedPayslip.payoutRef,
      };
    });

    return new Response(JSON.stringify(formattedPayslip), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error generating payslip:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate payslip' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}