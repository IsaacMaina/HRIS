import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/authconfig';
import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, Table, TableRow, TableCell, WidthType, VerticalAlign, Packer } from 'docx';

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

export async function GET(
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
      return new Response(JSON.stringify({ error: 'Payslip ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the payslip with associated employee data
    const payslip = await prisma.payslip.findUnique({
      where: { id },
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
            text: `${payslip.employee.user.name || 'Unknown Employee'} - Staff No: ${payslip.employee.staffNo || 'N/A'}`,
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({
            text: `Period: ${new Date(payslip.month).toLocaleString('default', { month: 'long', year: 'numeric' })}`,
            alignment: AlignmentType.CENTER,
          }),
          new Paragraph({ text: "\n" }),
          
          // Earnings table
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
                    width: { size: 5000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Amount (KSH)", bold: true })],
                    width: { size: 2000, type: WidthType.DXA }
                  })
                ]
              }),
              // Basic Salary
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ text: "Basic Salary" })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      text: Number(payslip.grossSalary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                      alignment: AlignmentType.RIGHT 
                    })],
                  })
                ]
              }),
              // Allowances
              ...(payslip.houseAllowance ? [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "House Allowance" })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        text: Number(payslip.houseAllowance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                        alignment: AlignmentType.RIGHT 
                      })],
                    })
                  ]
                })
              ] : []),
              ...(payslip.transportAllowance ? [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "Transport Allowance" })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        text: Number(payslip.transportAllowance).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
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
                    children: [new Paragraph({ text: "TOTAL EARNINGS", bold: true })],
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      text: Number(payslip.grossSalary).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                      bold: true,
                      alignment: AlignmentType.RIGHT 
                    })],
                  })
                ]
              })
            ],
          }),

          // Deductions table
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
                    width: { size: 5000, type: WidthType.DXA }
                  }),
                  new TableCell({
                    children: [new Paragraph({ text: "Amount (KSH)", bold: true })],
                    width: { size: 2000, type: WidthType.DXA }
                  })
                ]
              }),
              // Tax
              ...(payslip.tax ? [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "Tax (PAYE)" })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        text: Number(payslip.tax).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                        alignment: AlignmentType.RIGHT 
                      })],
                    })
                  ]
                })
              ] : []),
              // NSSF
              ...(payslip.nssf ? [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "NSSF" })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        text: Number(payslip.nssf).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                        alignment: AlignmentType.RIGHT 
                      })],
                    })
                  ]
                })
              ] : []),
              // NHIF
              ...(payslip.nhif ? [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "NHIF" })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        text: Number(payslip.nhif).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                        alignment: AlignmentType.RIGHT 
                      })],
                    })
                  ]
                })
              ] : []),
              // Additional deductions
              ...(payslip.cooperative ? [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "Cooperative" })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        text: Number(payslip.cooperative).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                        alignment: AlignmentType.RIGHT 
                      })],
                    })
                  ]
                })
              ] : []),
              ...(payslip.loan ? [
                new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ text: "Loan" })],
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        text: Number(payslip.loan).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
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
                      text: Number(
                        (payslip.tax || 0) + 
                        (payslip.nssf || 0) + 
                        (payslip.nhif || 0) + 
                        (payslip.cooperative || 0) + 
                        (payslip.loan || 0)
                      ).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
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
                      text: Number(payslip.netPay).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }), 
                      bold: true,
                      size: 24
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

    // Get the employee who is exporting the payslip
    const exportingEmployee = await prisma.employee.findFirst({
      where: { userId: session.user.id }
    });

    // Log the export activity
    if (exportingEmployee) {
      await prisma.activity.create({
        data: {
          employeeId: exportingEmployee.id,
          actionType: 'EXPORT',
          description: `Exported payslip for ${payslip.employee.user.name} (${payslip.employee.staffNo}) as Word document`,
          module: 'PAYROLL',
          details: {
            targetPayslipId: payslip.id,
            targetEmployeeId: payslip.employeeId,
            action: 'EXPORT_PAYSLIP_DOC'
          }
        }
      });
    }

    // Return the Word document as a download
    const fileName = `payslip_${payslip.employee.staffNo || 'unknown'}_${new Date(payslip.month).getFullYear()}_${String(new Date(payslip.month).getMonth() + 1).padStart(2, '0')}.docx`;

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