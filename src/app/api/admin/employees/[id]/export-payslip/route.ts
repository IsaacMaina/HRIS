import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authconfig';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, Packer } from 'docx';

// Extend the session type to include custom properties
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const params = await context.params; // Await the params promise
    const { id } = params;

    if (!id) {
      return new Response(JSON.stringify({ error: 'Employee ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const requestBody = await request.json();
    const { payslipData } = requestBody;

    // Fetch the employee details
    const employeeDetails = await prisma.employee.findUnique({
      where: { id },
      include: {
        user: true
      }
    });

    if (!employeeDetails) {
      return new Response(JSON.stringify({ error: 'Employee not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Calculate payslip values based on the existing code logic
    const salary = employeeDetails.salary;
    const nhifRate = employeeDetails.nhifRate || 0;
    const nssfRate = employeeDetails.nssfRate || 0;
    const taxRate = 0.3; // Example tax rate (30%)
    
    const additionalEarnings = parseFloat(payslipData.additionalEarnings) || 0;
    const additionalDeductions = parseFloat(payslipData.additionalDeductions) || 0;

    const nhifAmount = salary * nhifRate;
    const nssfAmount = salary * nssfRate;
    const taxAmount = salary * taxRate;

    const grossSalary = salary + additionalEarnings;
    const totalDeductions = nhifAmount + nssfAmount + taxAmount + additionalDeductions;
    const netPay = grossSalary - totalDeductions;

    // Create a Word document with payslip details
    const doc = new Document({
      sections: [{
        properties: {},
        children: [
          new Paragraph({
            text: "SALARY PAYSLIP",
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `${employeeDetails.user.name || 'Unknown Employee'} - Staff No: ${employeeDetails.staffNo || 'N/A'}`,
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Period: ${new Date(0, parseInt(payslipData.month) - 1).toLocaleString('default', { month: 'long' })} ${payslipData.year}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "\n" }),
          
          // Earnings section
          new Paragraph({
            text: "EARNINGS",
            heading: HeadingLevel.HEADING_3,
          }),
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Description", bold: true })],
                    width: { size: 5000, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Amount (KSH)", bold: true })],
                    width: { size: 2000, type: WidthType.PERCENTAGE }
                  })
                ]
              }),
              // Base Salary
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Base Salary" })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      text: Number(salary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                      alignment: AlignmentType.RIGHT 
                    })],
                  })
                ]
              }),
              // Additional Earnings
              ...(additionalEarnings > 0 ? [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "Additional Earnings" })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        text: Number(additionalEarnings).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                        alignment: AlignmentType.RIGHT 
                      })],
                    })
                  ]
                })
              ] : []),
              // Total Earnings
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "GROSS SALARY", bold: true })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      text: Number(grossSalary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                      bold: true,
                      alignment: AlignmentType.RIGHT 
                    })],
                  })
                ]
              })
            ],
          }),

          // Deductions section
          new Paragraph({ text: "\n" }),
          new Paragraph({
            text: "DEDUCTIONS",
            heading: HeadingLevel.HEADING_3,
          }),
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Description", bold: true })],
                    width: { size: 5000, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Amount (KSH)", bold: true })],
                    width: { size: 2000, type: WidthType.PERCENTAGE }
                  })
                ]
              }),
              // Tax
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Tax (30%)" })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      text: Number(taxAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                      alignment: AlignmentType.RIGHT 
                    })],
                  })
                ]
              }),
              // NSSF
              ...(nssfAmount > 0 ? [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "NSSF" })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        text: Number(nssfAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                        alignment: AlignmentType.RIGHT 
                      })],
                    })
                  ]
                })
              ] : []),
              // NHIF
              ...(nhifAmount > 0 ? [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "NHIF" })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        text: Number(nhifAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                        alignment: AlignmentType.RIGHT 
                      })],
                    })
                  ]
                })
              ] : []),
              // Additional Deductions
              ...(additionalDeductions > 0 ? [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "Additional Deductions" })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        text: Number(additionalDeductions).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                        alignment: AlignmentType.RIGHT 
                      })],
                    })
                  ]
                })
              ] : []),
              // Total Deductions
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "TOTAL DEDUCTIONS", bold: true })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      text: Number(totalDeductions).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                      bold: true,
                      alignment: AlignmentType.RIGHT 
                    })],
                  })
                ]
              })
            ],
          }),

          // Net Pay
          new Paragraph({ text: "\n" }),
          new Table({
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "NET PAY", bold: true })],
                    shading: { fill: "E6E6FA" } // Light lavender background
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      text: Number(netPay).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                      bold: true,
                    })],
                  })
                ]
              })
            ],
          }),

          // Additional information
          new Paragraph({ text: "\n" }),
          new Paragraph({
            children: [
              new TextRun({ text: "Generated on: ", bold: true }),
              new TextRun(new Date().toLocaleString()),
            ]
          }),
          new Paragraph({
            children: [
              new TextRun({ text: "Processed by: ", bold: true }),
              new TextRun(session.user.name || session.user.email || 'System'),
            ]
          })
        ]
      }]
    });

    // Convert document to buffer
    const buffer = await Packer.toBuffer(doc);

    // Get the employee who is performing the export
    const exportingEmployee = await prisma.employee.findFirst({
      where: { userId: session.user.id }
    });

    // Log the export activity
    if (exportingEmployee) {
      await prisma.activity.create({
        data: {
          employeeId: exportingEmployee.id,
          actionType: 'EXPORT',
          description: `Exported payslip for ${employeeDetails.user.name} (${employeeDetails.staffNo}) as Word document`,
          module: 'PAYROLL',
          details: {
            targetEmployeeId: employeeDetails.id,
            action: 'EXPORT_PAYSLIP_DOC'
          }
        }
      });
    }

    // Return the Word document as a download
    const fileName = `payslip_${employeeDetails.staffNo || 'unknown'}_${payslipData.month}_${payslipData.year}.docx`;

    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting payslip as Word:', error);
    return new Response(JSON.stringify({ error: 'Failed to export payslip as Word document' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}