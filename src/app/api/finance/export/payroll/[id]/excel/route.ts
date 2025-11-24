import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authconfig';
import * as XLSX from 'xlsx';

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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || (session.user.role !== 'FINANCE' && session.user.role !== 'ADMIN')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = await params;

    // Fetch the payroll data for the given month
    const month = new Date(id + '-01'); // Parse the month-year string
    const startOfMonth = new Date(month.getFullYear(), month.getMonth(), 1);
    const endOfMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0);

    const payslips = await prisma.payslip.findMany({
      where: {
        month: {
          gte: startOfMonth,
          lt: endOfMonth,
        },
      },
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
    });

    // Format data for Excel
    const excelData = payslips.map(payslip => {
      const deductions = payslip.grossSalary - payslip.netPay;
      return {
        'Employee Name': payslip.employee.user.name || 'N/A',
        'Staff No.': payslip.employee.staffNo || 'N/A',
        'Gross Pay': payslip.grossSalary,
        'Deductions': deductions,
        'Net Pay': payslip.netPay,
        'Status': payslip.paid ? 'Paid' : 'Pending'
      };
    });

    // Create a new workbook
    const workbook = XLSX.utils.book_new();
    
    // Create a worksheet
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    
    // Add the worksheet to the workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Payroll Report');
    
    // Write the workbook and convert to buffer
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Return the Excel file as a response
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename=payroll-report-${id}.xlsx`,
      },
    });
  } catch (error) {
    console.error('Error generating Excel:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate Excel' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}