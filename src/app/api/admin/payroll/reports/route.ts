import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authconfig';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== 'ADMIN') {
    return new Response(JSON.stringify({ error: 'Unauthorized - Only Admin users can access payroll reports' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    // Get all payslips to generate reports
    const payslips = await prisma.payslip.findMany({
      select: {
        id: true,
        month: true,
        grossSalary: true,
        deductions: true,
        netPay: true,
        createdAt: true
      },
      orderBy: { month: 'desc' },
      take: 20 // Get the last 20 months of data
    });

    // Group payslips by month and calculate totals
    const groupedPayslips = payslips.reduce((acc, payslip) => {
      const monthKey = payslip.month.toISOString().substring(0, 7); // YYYY-MM format

      if (!acc[monthKey]) {
        acc[monthKey] = {
          id: monthKey,
          month: new Date(payslip.month.getFullYear(), payslip.month.getMonth(), 1),
          totalEmployees: 0,
          grossPayroll: 0,
          deductions: 0,
          netPayroll: 0,
          status: 'processed' // Assuming all in the database are processed
        };
      }

      acc[monthKey].totalEmployees += 1;
      acc[monthKey].grossPayroll += payslip.grossSalary;

      // Parse deductions if it's a JSON string, otherwise calculate as the difference
      let deductionForThisPayslip = 0;
      if (typeof payslip.deductions === 'string') {
        try {
          const parsedDeductions = JSON.parse(payslip.deductions);
          deductionForThisPayslip = Object.values(parsedDeductions).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
        } catch {
          // If parsing fails, calculate as the difference between gross and net
          deductionForThisPayslip = payslip.grossSalary - payslip.netPay;
        }
      } else if (typeof payslip.deductions === 'object') {
        deductionForThisPayslip = Object.values(payslip.deductions).reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0);
      } else {
        // Calculate as the difference between gross and net
        deductionForThisPayslip = payslip.grossSalary - payslip.netPay;
      }

      acc[monthKey].deductions += deductionForThisPayslip;
      acc[monthKey].netPayroll += payslip.netPay;

      return acc;
    }, {} as Record<string, { id: string; month: Date; totalEmployees: number; grossPayroll: number; deductions: number; netPayroll: number; status: string }>);

    const payrollReports = Object.values(groupedPayslips).sort((a, b) => b.month.getTime() - a.month.getTime());

    return new Response(JSON.stringify(payrollReports), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching payroll reports:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}