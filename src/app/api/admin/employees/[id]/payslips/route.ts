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
  { params }: { params: { id: string } }
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

    const { id } = params;

    // Fetch the payslips for the specific employee from the database
    const payslips = await prisma.payslip.findMany({
      where: {
        employeeId: id,
      },
      take: 10, // Limit to 10 recent payslips
      orderBy: {
        month: 'desc',
      },
    });

    // Format the payslips data to match what the frontend expects
    const formattedPayslips = payslips.map(payslip => ({
      id: payslip.id,
      month: payslip.month.toISOString(),
      grossSalary: payslip.grossSalary,
      netPay: payslip.netPay,
      paid: payslip.paid,
      fileUrl: payslip.fileUrl || '',
    }));

    return new Response(JSON.stringify(formattedPayslips), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching employee payslips:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch payslips' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}