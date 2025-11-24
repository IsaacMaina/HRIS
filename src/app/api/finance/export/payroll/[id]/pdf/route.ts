import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authconfig';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    // This is a simplified version - in a real app, the id would represent a specific payroll period
    // For now, we'll use the id to filter payslips from a specific month range
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

    // Create a new PDF
    const doc = new jsPDF();

    // Add title
    doc.setFontSize(18);
    doc.text(`Payroll Report - ${month.toLocaleString('default', { month: 'long', year: 'numeric' })}`, 14, 20);

    // Define table column headers
    const tableColumn = [
      'Employee Name',
      'Staff No.',
      'Gross Pay',
      'Deductions',
      'Net Pay',
      'Status'
    ];

    // Format data for the table
    const tableRows = payslips.map(payslip => [
      payslip.employee.user.name || 'N/A',
      payslip.employee.staffNo || 'N/A',
      `KSH ${payslip.grossSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      `KSH ${(payslip.grossSalary - payslip.netPay).toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      `KSH ${payslip.netPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}`,
      payslip.paid ? 'Paid' : 'Pending'
    ]);

    // Add table to the PDF
    (doc as any).autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
    });

    // Generate the PDF as ArrayBuffer
    const pdfOutput = doc.output('arraybuffer');

    // Return the PDF as a response
    return new Response(pdfOutput, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename=payroll-report-${id}.pdf`,
      },
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate PDF' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}