import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authconfig';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// This route can be used for different payout operations
export async function GET(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'FINANCE')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit');
    const offset = searchParams.get('offset');
    const status = searchParams.get('status');
    
    const whereClause: any = {};
    if (status && status !== 'ALL') {
      whereClause.status = status;
    }

    const payouts = await prisma.payout.findMany({
      where: whereClause,
      include: {
        employee: {
          include: {
            user: true,
          },
        },
      },
      take: limit ? parseInt(limit) : undefined,
      skip: offset ? parseInt(offset) : undefined,
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Format payouts to match the expected interface in the UI
    const formattedPayouts = payouts.map(payout => ({
      id: payout.id,
      ref: payout.ref,
      date: payout.createdAt.toISOString(),  // This will be formatted in the UI
      amount: payout.amount,
      status: payout.status,
      bank: payout.bank,
      employeeName: payout.employee.user.name || payout.employee.staffNo || 'Unknown Employee',
      employeeId: payout.employee.userId,
    }));

    return new Response(JSON.stringify(formattedPayouts), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching payouts:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

export async function POST(request: NextRequest) {
  // Check authentication
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== 'ADMIN' && session.user.role !== 'FINANCE')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await request.json();
    const { ref, employeeId, amount, type, bank, status = 'PENDING' } = body;

    if (!ref || !employeeId || !amount || !type || !bank) {
      return new Response(JSON.stringify({ 
        error: 'Reference, employee ID, amount, type, and bank are required' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Create a new payout record
    const payout = await prisma.payout.create({
      data: {
        ref,
        employeeId,
        amount,
        type,
        bank,
        status,
      },
    });

    return new Response(JSON.stringify(payout), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error creating payout:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}