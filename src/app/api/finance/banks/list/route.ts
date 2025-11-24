import { NextRequest } from 'next/server';
import { prisma } from '../../../../../lib/prisma';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '../../../../../lib/authconfig';

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

    if (!session || !session.user || !session.user.id || (session.user.role !== 'ADMIN' && session.user.role !== 'FINANCE')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get all banks from the database
    const banks = await prisma.bank.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        accounts: {
          select: {
            id: true
          }
        }
      }
    });

    // Calculate employee count for each bank by counting employees linked to the bank
    const banksWithEmployeeCount = await Promise.all(
      banks.map(async (bank) => {
        const employeeCount = await prisma.employee.count({
          where: {
            bankId: bank.id
          }
        });

        return {
          id: bank.id,
          name: bank.name,
          code: bank.code,
          status: 'active', // Assuming all banks in the db are active (could be extended with a status field)
          employeeCount: employeeCount
        };
      })
    );

    return new Response(JSON.stringify({ banks: banksWithEmployeeCount }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching banks:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch banks' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}