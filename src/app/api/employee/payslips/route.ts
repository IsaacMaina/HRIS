import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authconfig';

// GET /api/employee/payslips - Get employee payslips
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user || !session.user.id) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const employee = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });

    if (!employee) {
      return NextResponse.json({ message: 'Employee not found' }, { status: 404 });
    }

    const payslips = await prisma.payslip.findMany({
      where: { employeeId: employee.id },
      orderBy: {
        createdAt: 'desc', // Sort by creation date (newest first)
      },
    });

    return NextResponse.json(payslips, { status: 200 });
  } catch (error) {
    console.error('Error fetching employee payslips:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
