import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authconfig';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as XLSX from 'xlsx';
import { Document as DocxDocument, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, VerticalAlign } from 'docx';
import fs from 'fs/promises';
import { Readable } from 'stream';
import { PassThrough } from 'stream';

// Extend the session type to include our custom properties
interface CustomSession {
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    employeeId?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions) as CustomSession;

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';
    const idsParam = searchParams.get('ids'); // IDs for multiple payslips
    const payslipId = searchParams.get('payslipId'); // ID for single payslip

    // Determine which payslip(s) to export
    let payslips: any[] = [];

    if (payslipId) {
      // Single payslip export
      const payslip = await prisma.payslip.findUnique({
        where: { id: payslipId },
        include: {
          employee: {
            include: {
              user: true,
            }
          }
        }
      });

      if (!payslip) {
        return NextResponse.json({ error: 'Payslip not found' }, { status: 404 });
      }

      // Check if payslip belongs to current user
      const employee = await prisma.employee.findUnique({
        where: { userId: session.user.id }
      });

      if (!employee || payslip.employeeId !== employee.id) {
        return NextResponse.json({ error: 'Forbidden - Access to payslip denied' }, { status: 403 });
      }

      payslips = [payslip];
    } else if (idsParam) {
      // Multiple payslips export
      const ids = idsParam.split(',');
      payslips = await prisma.payslip.findMany({
        where: {
          id: { in: ids },
        },
        include: {
          employee: {
            include: {
              user: true,
            }
          }
        }
      });

      // Verify that all requested payslips belong to the current user
      const employee = await prisma.employee.findUnique({
        where: { userId: session.user.id }
      });

      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      const authorizedPayslips = payslips.filter(pay => pay.employeeId === employee.id);
      if (authorizedPayslips.length !== ids.length) {
        return NextResponse.json({ error: 'Some payslips not found or not authorized' }, { status: 403 });
      }

      payslips = authorizedPayslips;
    } else {
      // Export all payslips for the current employee
      const employee = await prisma.employee.findUnique({
        where: { userId: session.user.id }
      });

      if (!employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      payslips = await prisma.payslip.findMany({
        where: { employeeId: employee.id },
        include: {
          employee: {
            include: {
              user: true,
            }
          }
        },
        orderBy: { month: 'desc' } // Order by newest first
      });
    }

    if (payslips.length === 0) {
      return NextResponse.json({ error: 'No payslips found' }, { status: 404 });
    }

    switch (format.toLowerCase()) {
      case 'pdf':
        return await generatePdf(payslips);
      case 'excel':
      case 'xlsx':
        return await generateExcel(payslips);
      case 'doc':
      case 'docx':
        return await generateDocx(payslips);
      default:
        return NextResponse.json({ error: 'Unsupported format. Use pdf, excel, or doc.' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error generating payslip export:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function generatePdf(payslips: any[]) {
  const pdfLibModule = await import('pdf-lib');
  const { PDFDocument, StandardFonts, rgb } = pdfLibModule;

  // Create a new PDF document
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([600, 800]);
  const { width, height } = page.getSize();

  // Embed fonts
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Title
  page.drawText('Payslips Report', {
    x: 50,
    y: height - 50,
    size: 20,
    font: helveticaBold,
  });

  // Generation info
  page.drawText(`Generated: ${new Date().toLocaleString()}`, {
    x: 50,
    y: height - 70,
    size: 10,
    font: helveticaFont,
  });

  // Draw table header
  const tableTop = height - 120;
  const rowHeight = 20;
  let currentY = tableTop;

  // Headers
  const headers = ['Month', 'Gross Salary', 'Deductions', 'Net Pay', 'Status'];
  const colWidths = [width * 0.2, width * 0.2, width * 0.2, width * 0.2, width * 0.2];

  // Header row background
  page.drawRectangle({
    x: 50,
    y: currentY - rowHeight,
    width: width - 100,
    height: rowHeight,
    color: rgb(0.9, 0.9, 0.9), // Light gray
  });

  // Header text
  let xPosition = 60;
  for (let i = 0; i < headers.length; i++) {
    page.drawText(headers[i], {
      x: xPosition,
      y: currentY - 5,
      size: 10,
      font: helveticaBold,
    });
    xPosition += colWidths[i]; // Move to next column position
  }

  currentY -= rowHeight;

  // Draw data rows
  for (const payslip of payslips) {
    // Alternate row background
    if (payslips.indexOf(payslip) % 2 === 1) {
      page.drawRectangle({
        x: 50,
        y: currentY - rowHeight,
        width: width - 100,
        height: rowHeight,
        color: rgb(0.95, 0.95, 0.95), // Slightly lighter gray
      });
    }

    const rowData = [
      new Date(payslip.month).toLocaleString('default', { month: 'long', year: 'numeric' }),
      `KSH ${payslip.grossSalary.toLocaleString()}`,
      `KSH ${(payslip.deductions || 0).toLocaleString()}`,
      `KSH ${payslip.netPay.toLocaleString()}`,
      payslip.paid ? 'PAID' : 'PENDING'
    ];

    xPosition = 60; // Reset to start of row
    for (let i = 0; i < rowData.length; i++) {
      page.drawText(String(rowData[i]), {
        x: xPosition,
        y: currentY - 5,
        size: 9,
        font: helveticaFont,
      });
      xPosition += colWidths[i]; // Move to next column position
    }

    currentY -= rowHeight;

    // Check if we need a new page
    if (currentY < 100) {
      const newPage = pdfDoc.addPage([600, 800]);
      currentY = newPage.getSize().height - 120;
    }
  }

  // Serialize the PDF
  const pdfBytes = await pdfDoc.save();

  // Return the PDF as a response
  return new Response(pdfBytes, {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename=payslips_${new Date().toISOString().slice(0, 10)}.pdf`,
    },
  });
}

async function generateExcel(payslips: any[]) {
  // Create the worksheet data
  const worksheetData = payslips.map(payslip => ({
    'Month': new Date(payslip.month).toLocaleString('default', { month: 'long', year: 'numeric' }),
    'Gross Salary': payslip.grossSalary,
    'Deductions': payslip.deductions || 0,
    'Net Pay': payslip.netPay,
    'Status': payslip.paid ? 'PAID' : 'PENDING',
  }));

  const worksheet = XLSX.utils.json_to_sheet(worksheetData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Payslips');

  // Generate the buffer
  const buffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' });

  return new Response(Buffer.from(buffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=payslips_${new Date().toISOString().slice(0, 10)}.xlsx`,
    },
  });
}

async function generateDocx(payslips: any[]) {
  const doc = new DocxDocument({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          text: 'Payslips Report',
          heading: HeadingLevel.HEADING_1,
        }),
        new Paragraph({
          text: `Generated: ${new Date().toLocaleString()}`,
        }),
        new Table({
          rows: [
            // Header row
            new TableRow({
              children: [
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'Month', bold: true })] })],
                  width: { size: 20, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'Gross Salary', bold: true })] })],
                  width: { size: 20, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'Deductions', bold: true })] })],
                  width: { size: 20, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'Net Pay', bold: true })] })],
                  width: { size: 20, type: WidthType.PERCENTAGE },
                }),
                new TableCell({
                  children: [new Paragraph({ children: [new TextRun({ text: 'Status', bold: true })] })],
                  width: { size: 20, type: WidthType.PERCENTAGE },
                }),
              ],
            }),
            // Data rows
            ...payslips.map(payslip =>
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph(new Date(payslip.month).toLocaleString('default', { month: 'long', year: 'numeric' }))],
                    verticalAlign: VerticalAlign.CENTER,
                  }),
                  new TableCell({
                    children: [new Paragraph(`KSH ${payslip.grossSalary.toLocaleString()}`)],
                    verticalAlign: VerticalAlign.CENTER,
                  }),
                  new TableCell({
                    children: [new Paragraph(`KSH ${(payslip.deductions || 0).toLocaleString()}`)],
                    verticalAlign: VerticalAlign.CENTER,
                  }),
                  new TableCell({
                    children: [new Paragraph(`KSH ${payslip.netPay.toLocaleString()}`)],
                    verticalAlign: VerticalAlign.CENTER,
                  }),
                  new TableCell({
                    children: [new Paragraph(payslip.paid ? 'PAID' : 'PENDING')],
                    verticalAlign: VerticalAlign.CENTER,
                  }),
                ],
              })
            ),
          ],
        }),
      ],
    }],
  });

  // Generate buffer using docx
  const buffer = await doc.getBase64();
  const blob = Buffer.from(buffer, 'base64');

  return new Response(blob, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename=payslips_${new Date().toISOString().slice(0, 10)}.docx`,
    },
  });
}