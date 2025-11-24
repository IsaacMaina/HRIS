import { NextRequest } from 'next/server';
import { prisma } from '../../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../lib/authconfig';
import * as XLSX from 'xlsx';
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

interface PaymentTransaction {
  id: string;
  payoutRef: string;
  date: Date;
  amount: number;
  bank: string;
  status: string;
  employees: number;
}

async function getPaymentTransactions(): Promise<PaymentTransaction[]> {
  // Get recent payslips with payout references to show as payment transactions
  const payslips = await prisma.payslip.findMany({
    where: {
      payoutRef: { not: null } // Only include payslips that have been paid out
    },
    select: {
      id: true,
      payoutRef: true,
      createdAt: true,
      netPay: true,
      employee: {
        select: {
          bank: {
            select: {
              name: true
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 50 // Limit to last 50 transactions
  });

  // Group payslips by payout reference and date
  const groupedPayslips = payslips.reduce((acc, payslip) => {
    const ref = payslip.payoutRef || 'unknown';

    if (!acc[ref]) {
      acc[ref] = {
        id: payslip.id,
        payoutRef: ref,
        date: payslip.createdAt,
        amount: 0,
        bank: payslip.employee?.bank?.name || 'Unknown',
        status: 'completed', // Assuming all with payoutRef are completed
        employees: 0
      };
    }

    acc[ref].amount += payslip.netPay;
    acc[ref].employees += 1;

    return acc;
  }, {} as Record<string, PaymentTransaction>);

  return Object.values(groupedPayslips).sort((a, b) => b.date.getTime() - a.date.getTime());
}

export async function GET(req: NextRequest) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || (session.user.role !== 'FINANCE' && session.user.role !== 'ADMIN')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const searchParams = req.nextUrl.searchParams;
    const format = searchParams.get('format') || 'pdf';

    const payments = await getPaymentTransactions();

    if (format === 'pdf') {
      const doc = new jsPDF();
      const tableColumn = ["Transaction ID", "Date", "Amount", "Bank", "Employees", "Status"];
      const tableRows = payments.map(payment => [
        payment.payoutRef,
        payment.date.toLocaleDateString(),
        `KSH ${payment.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
        payment.bank,
        payment.employees,
        payment.status.charAt(0).toUpperCase() + payment.status.slice(1)
      ]);

      autoTable(doc, {
        head: [tableColumn],
        body: tableRows,
      });

      const pdfBlob = new Blob([doc.output('blob')], { type: 'application/pdf' });

      return new Response(pdfBlob, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename=payment-report.pdf',
        },
      });
    } else if (format === 'excel') {
      const worksheet = XLSX.utils.json_to_sheet(payments.map(payment => ({
        "Transaction ID": payment.payoutRef,
        "Date": payment.date.toLocaleDateString(),
        "Amount": payment.amount,
        "Bank": payment.bank,
        "Employees": payment.employees,
        "Status": payment.status.charAt(0).toUpperCase() + payment.status.slice(1)
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Payment Report');
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const excelBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      return new Response(excelBlob, {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': 'attachment; filename=payment-report.xlsx',
        },
      });
    } else if (format === 'doc') {
      const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
        "xmlns:w='urn:schemas-microsoft-com:office:word' " +
        "xmlns='http://www.w3.org/TR/REC-html40'>" +
        "<head><meta charset='utf-8'><title>Export HTML to Word Document</title></head><body>";
      const footer = "</body></html>";
      let html = header;
      html += '<table>';
      html += '<thead><tr>';
      html += '<th>Transaction ID</th><th>Date</th><th>Amount</th><th>Bank</th><th>Employees</th><th>Status</th>';
      html += '</tr></thead>';
      html += '<tbody>';
      payments.forEach(payment => {
        html += '<tr>';
        html += `<td>${payment.payoutRef}</td>`;
        html += `<td>${payment.date.toLocaleDateString()}</td>`;
        html += `<td>KSH ${payment.amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>`;
        html += `<td>${payment.bank}</td>`;
        html += `<td>${payment.employees}</td>`;
        html += `<td>${payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}</td>`;
        html += '</tr>';
      });
      html += '</tbody></table>';
      html += footer;

      const docBlob = new Blob([html], { type: 'application/msword' });

      return new Response(docBlob, {
        headers: {
          'Content-Type': 'application/msword',
          'Content-Disposition': 'attachment; filename=payment-report.doc',
        },
      });
    } else {
      return new Response(JSON.stringify({ error: 'Invalid format. Use pdf, excel, or doc.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error('Error exporting payments:', error);
    return new Response(JSON.stringify({ error: 'Failed to export payments' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}