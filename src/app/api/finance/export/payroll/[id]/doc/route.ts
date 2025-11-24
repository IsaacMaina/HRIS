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

    // Create the document content in HTML format
    const header = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta charset="utf-8">
    <title>Payroll Report - ${month.toLocaleString('default', { month: 'long', year: 'numeric' })}</title>
    <!--[if gte mso 9]>
    <xml>
        <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>90</w:Zoom>
            <w:DoNotPromptForConvert/>
            <w:DoNotShowInsertOptions/>
        </w:WordDocument>
    </xml>
    <![endif]-->
    <style>
        table {
            border-collapse: collapse;
            width: 100%;
        }
        th, td {
            border: 1px solid #333;
            padding: 8px;
            text-align: left;
        }
        th {
            background-color: #f2f2f2;
        }
    </style>
</head>
<body>
    <h1>Payroll Report - ${month.toLocaleString('default', { month: 'long', year: 'numeric' })}</h1>
    <table>
        <thead>
            <tr>
                <th>Employee Name</th>
                <th>Staff No.</th>
                <th>Gross Pay</th>
                <th>Deductions</th>
                <th>Net Pay</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>`;

    let tableRows = '';
    payslips.forEach(payslip => {
      const deductions = payslip.grossSalary - payslip.netPay;
      tableRows += `
            <tr>
                <td>${payslip.employee.user.name || 'N/A'}</td>
                <td>${payslip.employee.staffNo || 'N/A'}</td>
                <td>KSH ${payslip.grossSalary.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td>KSH ${deductions.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td>KSH ${payslip.netPay.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                <td>${payslip.paid ? 'Paid' : 'Pending'}</td>
            </tr>`;
    });

    const footer = `
        </tbody>
    </table>
</body>
</html>`;

    const htmlDoc = header + tableRows + footer;

    // Return the document as a response
    return new Response(htmlDoc, {
      status: 200,
      headers: {
        'Content-Type': 'application/msword',
        'Content-Disposition': `attachment; filename=payroll-report-${id}.doc`,
      },
    });
  } catch (error) {
    console.error('Error generating DOC:', error);
    return new Response(JSON.stringify({ error: 'Failed to generate DOC' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}