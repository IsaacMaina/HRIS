import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest, { params }: { params: { month: string } }) {
  const { month } = params;

  try {
    const employees = await prisma.employee.findMany({
      where: {
        payslips: {
          some: {
            month: {
              gte: new Date(month),
              lt: new Date(new Date(month).setMonth(new Date(month).getMonth() + 1)),
            },
          },
        },
      },
      include: {
        user: true,
        bank: true,
      },
    });

    return NextResponse.json(employees);
  } catch (error) {
    console.error('Error fetching employees for payroll:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
