import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authconfig';
import { processBulkPayroll, reconcilePayroll } from '@/lib/payroll';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'FINANCE' && session.user.role !== 'REPORT')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get('month');

    if (!month) {
      return new Response(JSON.stringify({ error: 'Month is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get payroll summary for the specified month
    const payrollSummary = await prisma.payslip.findMany({
      where: {
        month: {
          gte: new Date(new Date(month).getFullYear(), new Date(month).getMonth(), 1),
          lt: new Date(new Date(month).getFullYear(), new Date(month).getMonth() + 1, 1),
        },
      },
      include: {
        employee: {
          include: {
            user: true,
            bank: true,
          },
        },
      },
    });

    // Convert to PayrollReport format
    const groupedPayrolls = payrollSummary.reduce((acc, payslip) => {
      const monthKey = payslip.month.toISOString().substring(0, 7); // YYYY-MM format

      if (!acc[monthKey]) {
        acc[monthKey] = {
          id: monthKey,
          month: new Date(payslip.month.getFullYear(), payslip.month.getMonth(), 1),
          totalEmployees: 0,
          grossPayroll: 0,
          deductions: 0,
          netPayroll: 0,
          status: 'processed' // Assuming processed since they have payslips
        };
      }

      acc[monthKey].totalEmployees += 1;
      acc[monthKey].grossPayroll += payslip.grossSalary;

      // Calculate deductions as the difference between gross and net
      const deductionForThisPayslip = payslip.grossSalary - payslip.netPay;
      acc[monthKey].deductions += deductionForThisPayslip;

      acc[monthKey].netPayroll += payslip.netPay;

      return acc;
    }, {} as Record<string, { id: string; month: Date; totalEmployees: number; grossPayroll: number; deductions: number; netPayroll: number; status: string }>);

    const payrollReports = Object.values(groupedPayrolls).sort((a, b) => b.month.getTime() - a.month.getTime());

    return new Response(JSON.stringify(payrollReports), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching payroll summary:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'FINANCE') {
    return new Response(JSON.stringify({ error: 'Unauthorized - Only Finance users can process payroll' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { employees, month, description } = body;

    if (!employees || !Array.isArray(employees) || employees.length === 0) {
      return new Response(JSON.stringify({ error: 'Employees array is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!month) {
      return new Response(JSON.stringify({ error: 'Month is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Process bulk payroll
    const results = await processBulkPayroll(
      employees,
      new Date(month),
      description || 'Monthly Salary Payment'
    );

    // Count successful and failed payments
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    return new Response(JSON.stringify({
      message: `Payroll processing initiated for ${employees.length} employees`,
      summary: {
        total: employees.length,
        successful,
        failed,
      },
      results,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing payroll:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}