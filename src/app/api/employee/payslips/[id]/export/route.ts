import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authconfig';
import { prisma } from '@/lib/prisma';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fs from 'fs/promises';
import { createWorker } from 'tesseract.js';
import { Document as DocxDocument, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType } from 'docx';
import * as Excel from 'excel4node';

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

    // Get URL parameters for format
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'pdf';

    // Parse deductions from JSON string if it's a string, otherwise return as is
    let parsedDeductions = payslip.deductions;
    if (typeof payslip.deductions === 'string' || typeof payslip.deductions === 'number') {
      try {
        parsedDeductions = JSON.parse(payslip.deductions);
      } catch (e) {
        console.error('Error parsing deductions:', e);
        parsedDeductions = {};
      }
    } else if (payslip.deductions === null) {
      parsedDeductions = {};
    }

    // Calculate total deductions
    let totalDeductions = 0;
    if (parsedDeductions && typeof parsedDeductions === 'object') {
      totalDeductions = Object.values(parsedDeductions).reduce(
        (sum, value) => sum + (typeof value === 'number' ? value : 0),
        0
      );
    }

    // Calculate net pay
    const netPay = payslip.grossSalary - totalDeductions;

    switch (format.toLowerCase()) {
      case 'pdf':
        // Generate PDF payslip
        const pdfDoc = await PDFDocument.create();

        // Embed fonts
        const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
        const helveticaOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

        const page = pdfDoc.addPage([600, 800]);
        const { width, height } = page.getSize();

        // Title
        page.drawText('UNIVERSITY PAYSLIP', {
          x: 50,
          y: height - 50,
          size: 20,
          font: helveticaBoldFont,
          color: rgb(0, 0.4, 0), // Dark green
        });

        // Company info
        page.drawText('University HR Management System', {
          x: 50,
          y: height - 80,
          size: 12,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
        page.drawText('P.O. Box 12345, Nairobi, Kenya', {
          x: 50,
          y: height - 95,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // Employee Information
        page.drawText('Employee Information:', {
          x: 50,
          y: height - 130,
          size: 12,
          font: helveticaBoldFont,
          color: rgb(0, 0, 0),
        });

        page.drawText(`Name: ${payslip.employee.user.name}`, {
          x: 70,
          y: height - 150,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        page.drawText(`Staff No: ${payslip.employee.staffNo}`, {
          x: 70,
          y: height - 165,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        if (payslip.employee.position) {
          page.drawText(`Position: ${payslip.employee.position}`, {
            x: 70,
            y: height - 180,
            size: 10,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
        }
        if (payslip.employee.department) {
          page.drawText(`Department: ${payslip.employee.department}`, {
            x: 70,
            y: height - 195,
            size: 10,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
        }

        // Period information
        page.drawText(`Period: ${new Date(payslip.month).toLocaleString('default', { month: 'long', year: 'numeric' })}`, {
          x: width - 200,
          y: height - 130,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        page.drawText(`Generated: ${new Date().toLocaleString()}`, {
          x: width - 200,
          y: height - 145,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // Earnings and Deductions titles
        page.drawText('EARNINGS', {
          x: 50,
          y: height - 230,
          size: 12,
          font: helveticaBoldFont,
          color: rgb(0, 0, 0),
        });

        page.drawText('DEDUCTIONS', {
          x: width / 2 + 20,
          y: height - 230,
          size: 12,
          font: helveticaBoldFont,
          color: rgb(0, 0, 0),
        });

        // Earnings section
        let earnY = height - 250;
        page.drawText('Gross Salary:', {
          x: 70,
          y: earnY,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });
        page.drawText(new Intl.NumberFormat('en-KE', {
          style: 'currency',
          currency: 'KES',
        }).format(payslip.grossSalary), {
          x: width / 2 - 80,
          y: earnY,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        // Deductions section
        let dedY = height - 250;
        let totalDeductionsSum = 0;

        // Display each deduction
        if (parsedDeductions && typeof parsedDeductions === 'object') {
          for (const [deductionName, deductionValue] of Object.entries(parsedDeductions)) {
            const deductionValueNumber = typeof deductionValue === 'number' ? deductionValue : 0;
            totalDeductionsSum += deductionValueNumber;

            page.drawText(`${deductionName.replace(/([A-Z])/g, ' $1').trim()}:`, {
              x: width / 2 + 40,
              y: dedY,
              size: 10,
              font: helveticaFont,
              color: rgb(0, 0, 0),
            });
            page.drawText(new Intl.NumberFormat('en-KE', {
              style: 'currency',
              currency: 'KES',
            }).format(deductionValueNumber), {
              x: width - 80,
              y: dedY,
              size: 10,
              font: helveticaFont,
              color: rgb(0, 0, 0),
            });
            dedY -= 15;
          }
        }

        // Total earnings (same as gross salary)
        const totalY = dedY - 30;
        page.drawText('TOTAL:', {
          x: 70,
          y: totalY,
          size: 10,
          font: helveticaBoldFont,
          color: rgb(0, 0, 0),
        });
        page.drawText(new Intl.NumberFormat('en-KE', {
          style: 'currency',
          currency: 'KES',
        }).format(payslip.grossSalary), {
          x: width / 2 - 80,
          y: totalY,
          size: 10,
          font: helveticaBoldFont,
          color: rgb(0, 0, 0),
        });

        // Total deductions
        page.drawText('TOTAL DEDUCTIONS:', {
          x: width / 2 + 40,
          y: totalY,
          size: 10,
          font: helveticaBoldFont,
          color: rgb(0, 0, 0),
        });
        page.drawText(new Intl.NumberFormat('en-KE', {
          style: 'currency',
          currency: 'KES',
        }).format(totalDeductionsSum), {
          x: width - 80,
          y: totalY,
          size: 10,
          font: helveticaBoldFont,
          color: rgb(0, 0, 0),
        });

        // Net pay calculation
        const netPayY = totalY - 20;
        page.drawText('NET PAY:', {
          x: 70,
          y: netPayY,
          size: 12,
          font: helveticaBoldFont,
          color: rgb(0, 0, 0),
        });
        page.drawText(new Intl.NumberFormat('en-KE', {
          style: 'currency',
          currency: 'KES',
        }).format(netPay), {
          x: width / 2 - 80,
          y: netPayY,
          size: 12,
          font: helveticaBoldFont,
          color: rgb(0, 0, 0),
        });

        // Status and payment information
        const statusY = netPayY - 30;
        page.drawText(`Status: ${payslip.paid ? 'PAID' : 'PENDING'}`, {
          x: 50,
          y: statusY,
          size: 10,
          font: helveticaFont,
          color: rgb(0, 0, 0),
        });

        if (payslip.payoutRef) {
          page.drawText(`Payment Ref: ${payslip.payoutRef}`, {
            x: 50,
            y: statusY - 15,
            size: 10,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
        }

        // Footer
        page.drawText('This is a computer-generated payslip', {
          x: 50,
          y: 50,
          size: 8,
          font: helveticaOblique,
          color: rgb(0.5, 0.5, 0.5),
        });

        // Serialize the PDF to bytes
        const pdfBytes = await pdfDoc.save();

        // Return the PDF as a response
        return new Response(pdfBytes, {
          status: 200,
          headers: {
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=payslip_${payslip.id}_${new Date().toISOString().slice(0, 7)}.pdf`,
          },
        });

      case 'doc':
        // Parse deductions from JSON string if it's a string, otherwise return as is
        let parsedDeductions = payslip.deductions;
        if (typeof payslip.deductions === 'string' || typeof payslip.deductions === 'number') {
          try {
            parsedDeductions = JSON.parse(payslip.deductions);
          } catch (e) {
            console.error('Error parsing deductions:', e);
            parsedDeductions = {};
          }
        } else if (payslip.deductions === null) {
          parsedDeductions = {};
        }

        // Calculate total deductions
        let totalDeductionsForDocx = 0;
        if (parsedDeductions && typeof parsedDeductions === 'object') {
          totalDeductionsForDocx = Object.values(parsedDeductions).reduce(
            (sum, value) => sum + (typeof value === 'number' ? value : 0),
            0
          );
        }

        // Calculate net pay
        const netPay = payslip.grossSalary - totalDeductionsForDocx;

        // Generate DOCX payslip using docx library
        const doc = new DocxDocument({
          sections: [{
            properties: {},
            children: [
              new Paragraph({
                text: 'UNIVERSITY PAYSLIP',
                heading: true,
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph({
                text: 'University HR Management System\nP.O. Box 12345, Nairobi, Kenya',
                alignment: AlignmentType.CENTER,
              }),
              new Paragraph(''),
              new Paragraph({
                text: 'Employee Information:',
                heading: true,
              }),
              new Paragraph({
                text: `Name: ${payslip.employee.user.name}`,
              }),
              new Paragraph({
                text: `Staff No: ${payslip.employee.staffNo}`,
              }),
              ...(payslip.employee.position ? [new Paragraph({
                text: `Position: ${payslip.employee.position}`,
              })] : []),
              ...(payslip.employee.department ? [new Paragraph({
                text: `Department: ${payslip.employee.department}`,
              })] : []),
              new Paragraph({
                text: `Period: ${new Date(payslip.month).toLocaleString('default', { month: 'long', year: 'numeric' })}`,
              }),
              new Paragraph({
                text: `Generated: ${new Date().toLocaleString()}`,
              }),
              new Paragraph(''),
              new Paragraph({
                text: 'SUMMARY',
                heading: true,
              }),
              new Table({
                rows: [
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph('EARNINGS')],
                      }),
                      new TableCell({
                        children: [new Paragraph('DEDUCTIONS')],
                      }),
                    ],
                  }),
                  new TableRow({
                    children: [
                      new TableCell({
                        children: [new Paragraph(`Gross Salary: ${new Intl.NumberFormat('en-KE', {
                          style: 'currency',
                          currency: 'KES',
                        }).format(payslip.grossSalary)}`)],
                      }),
                      new TableCell({
                        children: [new Paragraph(`Total Deductions: ${new Intl.NumberFormat('en-KE', {
                          style: 'currency',
                          currency: 'KES',
                        }).format(totalDeductionsForDocx)}`)],
                      }),
                    ],
                  }),
                ],
              }),
              new Paragraph({
                children: [
                  new TextRun({
                    text: `Net Pay: ${new Intl.NumberFormat('en-KE', {
                      style: 'currency',
                      currency: 'KES',
                    }).format(netPay)}`,
                    bold: true,
                  })
                ],
                heading: true,
              }),
              new Paragraph({
                text: `Status: ${payslip.paid ? 'PAID' : 'PENDING'}`,
              }),
              ...(payslip.payoutRef ? [new Paragraph({
                text: `Payment Ref: ${payslip.payoutRef}`,
              })] : []),
            ],
          }],
        });

        const buffer = await doc.getBase64();
        // Convert base64 to buffer
        const docBuffer = Buffer.from(buffer, 'base64');

        return new Response(docBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'Content-Disposition': `attachment; filename=payslip_${payslip.id}_${new Date().toISOString().slice(0, 7)}.docx`,
          },
        });

      case 'excel':
        // Generate Excel payslip using excel4node library
        const workbook = new Excel.Workbook();
        const worksheet = workbook.addWorksheet('Payslip');

        // Add data to worksheet
        worksheet.cell(1, 1).string('UNIVERSITY PAYSLIP').style({
          font: { color: '#006837', bold: true, size: 14 }
        });
        worksheet.cell(2, 1).string('University HR Management System');
        worksheet.cell(3, 1).string('P.O. Box 12345, Nairobi, Kenya');

        worksheet.cell(5, 1).string('Employee Information').style({
          font: { color: '#004B2E', bold: true, size: 12 }
        });
        worksheet.cell(6, 1).string('Name:');
        worksheet.cell(6, 2).string(payslip.employee.user.name);
        worksheet.cell(7, 1).string('Staff No:');
        worksheet.cell(7, 2).string(payslip.employee.staffNo);

        let row = 8;
        if (payslip.employee.position) {
          worksheet.cell(row, 1).string('Position:');
          worksheet.cell(row, 2).string(payslip.employee.position);
          row++;
        }
        if (payslip.employee.department) {
          worksheet.cell(row, 1).string('Department:');
          worksheet.cell(row, 2).string(payslip.employee.department);
          row++;
        }

        worksheet.cell(row, 1).string('Period:');
        worksheet.cell(row, 2).string(new Date(payslip.month).toLocaleString('default', { month: 'long', year: 'numeric' }));
        row++;

        worksheet.cell(row, 1).string('Generated:');
        worksheet.cell(row, 2).string(new Date().toLocaleString());
        row += 2;

        worksheet.cell(row, 1).string('EARNINGS').style({
          font: { color: '#004B2E', bold: true, size: 12 }
        });
        worksheet.cell(row, 2).string('DEDUCTIONS').style({
          font: { color: '#004B2E', bold: true, size: 12 }
        });
        row++;

        worksheet.cell(row, 1).string(`Gross Salary: ${new Intl.NumberFormat('en-KE', {
          style: 'currency',
          currency: 'KES',
        }).format(payslip.grossSalary)}`);

        // Add deductions
        let totalDeductionsExcel = 0;
        if (parsedDeductions && typeof parsedDeductions === 'object') {
          for (const [deductionName, deductionValue] of Object.entries(parsedDeductions)) {
            const deductionValueNumber = typeof deductionValue === 'number' ? deductionValue : 0;
            totalDeductionsExcel += deductionValueNumber;

            worksheet.cell(row, 2).string(`${deductionName.replace(/([A-Z])/g, ' $1').trim()}: ${new Intl.NumberFormat('en-KE', {
              style: 'currency',
              currency: 'KES',
            }).format(deductionValueNumber)}`);
            row++;
          }
        }

        worksheet.cell(row, 1).string(`Total Deductions: ${new Intl.NumberFormat('en-KE', {
          style: 'currency',
          currency: 'KES',
        }).format(totalDeductionsExcel)}`).style({
          font: { color: '#004B2E', bold: true, size: 12 }
        });

        row += 2;
        worksheet.cell(row, 1).string(`Net Pay: ${new Intl.NumberFormat('en-KE', {
          style: 'currency',
          currency: 'KES',
        }).format(netPay)}`).style({
          font: { color: '#004B2E', bold: true, size: 12 }
        });
        row++;

        worksheet.cell(row, 1).string(`Status: ${payslip.paid ? 'PAID' : 'PENDING'}`);
        row++;

        if (payslip.payoutRef) {
          worksheet.cell(row, 1).string(`Payment Ref: ${payslip.payoutRef}`);
        }

        const excelBuffer = await new Promise<Buffer>((resolve, reject) => {
          workbook.write('payslip.xlsx', (err, buffer) => {
            if (err) {
              reject(err);
            } else {
              resolve(buffer as Buffer);
            }
          });
        });

        return new Response(excelBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'Content-Disposition': `attachment; filename=payslip_${payslip.id}_${new Date().toISOString().slice(0, 7)}.xlsx`,
          },
        });

      default:
        return new Response(JSON.stringify({ error: 'Invalid format. Supported formats: pdf, doc, excel' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
    }
  } catch (error) {
    console.error('Error exporting payslip:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}