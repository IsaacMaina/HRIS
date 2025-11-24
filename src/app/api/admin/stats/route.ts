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

export async function GET(request: NextRequest) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || (session.user.role !== 'ADMIN' && session.user.role !== 'HR')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Fetch the stats from the database
    const totalEmployees = await prisma.employee.count();

    // Count pending leaves
    const pendingLeaves = await prisma.leaveRequest.count({
      where: {
        status: 'PENDING',
      },
    });

    // Calculate this month's payroll - sum of net pay of payslips from this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date();
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);
    endOfMonth.setDate(0);
    endOfMonth.setHours(23, 59, 59, 999);

    const currentMonthPayslips = await prisma.payslip.aggregate({
      _sum: {
        netPay: true,
      },
      where: {
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
    });

    const thisMonthPayroll = currentMonthPayslips._sum.netPay || 0;

    // Count active contracts (employees with active contracts)
    const activeContracts = totalEmployees; // Assuming all employees have active contracts

    const stats = {
      totalEmployees,
      pendingLeaves,
      thisMonthPayroll: `KSH ${(thisMonthPayroll || 0).toLocaleString()}`,
      activeContracts,
    };

    return new Response(JSON.stringify(stats), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch stats' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}