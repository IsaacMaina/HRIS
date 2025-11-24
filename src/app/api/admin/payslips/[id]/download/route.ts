import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authconfig';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

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

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR' && session.user.role !== 'FINANCE')) {
      return new Response('Unauthorized', {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { id } = await params;

    // Fetch the payslip from the database
    const payslip = await prisma.payslip.findUnique({
      where: { id: id },
      include: {
        employee: {
          include: {
            user: true, // Include user to get employee name
          }
        }
      }
    });

    if (!payslip) {
      return new Response('Payslip not found', {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Generate PDF content for the payslip
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);
    const { width, height } = page.getSize();
    
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    
    // Title
    page.drawText('UNIVERSITY HRIS', {
      x: 50,
      y: height - 50,
      size: 20,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    page.drawText('Payslip', {
      x: 50,
      y: height - 80,
      size: 16,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Employee Information
    page.drawText(`Employee: ${payslip.employee.user.name}`, {
      x: 50,
      y: height - 120,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Staff No: ${payslip.employee.staffNo}`, {
      x: 50,
      y: height - 140,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText(`Department: ${payslip.employee.department}`, {
      x: 50,
      y: height - 160,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Period
    page.drawText(`Period: ${new Date(payslip.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}`, {
      x: 350,
      y: height - 120,
      size: 12,
      font: font,
      color: rgb(0, 0, 0),
    });

    // Earnings header
    page.drawText('EARNINGS', {
      x: 50,
      y: height - 200,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Earnings details
    page.drawText('Basic Salary:', {
      x: 70,
      y: height - 220,
      size: 11,
      font: font,
      color: rgb(0, 0, 0),
    });

    page.drawText(`KSH ${payslip.employee.salary.toFixed(2)}`, {
      x: 400,
      y: height - 220,
      size: 11,
      font: font,
      color: rgb(0, 0, 0),
    });

    if (payslip.deductions && typeof payslip.deductions === 'object' && 'additional' in payslip.deductions) {
      const additionalEarnings = payslip.employee.salary - payslip.grossSalary + (payslip.deductions.additional || 0);
      if (additionalEarnings > 0) {
        page.drawText('Additional Earnings:', {
          x: 70,
          y: height - 240,
          size: 11,
          font: font,
          color: rgb(0, 0, 0),
        });

        page.drawText(`KSH ${additionalEarnings.toFixed(2)}`, {
          x: 400,
          y: height - 240,
          size: 11,
          font: font,
          color: rgb(0, 0, 0),
        });
      }
    }

    // Gross salary
    page.drawText('Gross Salary:', {
      x: 70,
      y: height - 260,
      size: 11,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`KSH ${payslip.grossSalary.toFixed(2)}`, {
      x: 400,
      y: height - 260,
      size: 11,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Deductions header
    page.drawText('DEDUCTIONS', {
      x: 50,
      y: height - 290,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Deduction items
    let deductionY = height - 310;
    if (payslip.deductions && typeof payslip.deductions === 'object') {
      const deductions = payslip.deductions as any;
      
      if ('tax' in deductions && deductions.tax > 0) {
        page.drawText('Tax:', {
          x: 70,
          y: deductionY,
          size: 11,
          font: font,
          color: rgb(0, 0, 0),
        });

        page.drawText(`KSH ${deductions.tax.toFixed(2)}`, {
          x: 400,
          y: deductionY,
          size: 11,
          font: font,
          color: rgb(0, 0, 0),
        });
        deductionY -= 20;
      }

      if ('nhif' in deductions && deductions.nhif > 0) {
        page.drawText('NHIF:', {
          x: 70,
          y: deductionY,
          size: 11,
          font: font,
          color: rgb(0, 0, 0),
        });

        page.drawText(`KSH ${deductions.nhif.toFixed(2)}`, {
          x: 400,
          y: deductionY,
          size: 11,
          font: font,
          color: rgb(0, 0, 0),
        });
        deductionY -= 20;
      }

      if ('nssf' in deductions && deductions.nssf > 0) {
        page.drawText('NSSF:', {
          x: 70,
          y: deductionY,
          size: 11,
          font: font,
          color: rgb(0, 0, 0),
        });

        page.drawText(`KSH ${deductions.nssf.toFixed(2)}`, {
          x: 400,
          y: deductionY,
          size: 11,
          font: font,
          color: rgb(0, 0, 0),
        });
        deductionY -= 20;
      }

      if ('additional' in deductions && deductions.additional > 0) {
        page.drawText('Other Deductions:', {
          x: 70,
          y: deductionY,
          size: 11,
          font: font,
          color: rgb(0, 0, 0),
        });

        page.drawText(`KSH ${deductions.additional.toFixed(2)}`, {
          x: 400,
          y: deductionY,
          size: 11,
          font: font,
          color: rgb(0, 0, 0),
        });
        deductionY -= 20;
      }
    }

    // Net pay
    page.drawText('NET PAY:', {
      x: 70,
      y: deductionY - 20,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    page.drawText(`KSH ${payslip.netPay.toFixed(2)}`, {
      x: 400,
      y: deductionY - 20,
      size: 12,
      font: boldFont,
      color: rgb(0, 0, 0),
    });

    // Footer
    page.drawText('Generated by University HRIS', {
      x: 50,
      y: 50,
      size: 10,
      font: font,
      color: rgb(0.5, 0.5, 0.5),
    });

    // Serialize the PDF
    const pdfBytes = await pdfDoc.save();

    // Return the PDF as a response
    return new Response(pdfBytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="payslip_${payslip.employee.staffNo}_${new Date(payslip.month).getFullYear()}_${String(new Date(payslip.month).getMonth() + 1).padStart(2, '0')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating payslip PDF:', error);
    return new Response('Failed to generate payslip PDF', {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}