import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { prisma } from '../../../../../lib/prisma';
import { authOptions } from '../../../../../lib/authconfig';

interface ReconciliationData {
  id: string;
  ref: string;
  date: Date;
  internalAmount: number;
  bankAmount: number;
  difference: number;
  status: string;
}

interface ReconciliationSummary {
  totalTransactions: number;
  reconciled: number;
  pending: number;
  discrepancies: number;
}

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

    if (!session || !session.user || !['ADMIN', 'FINANCE'].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get all payslips that have been paid out (have a payout reference) to calculate accurate summary
    const allPayslips = await prisma.payslip.findMany({
      where: {
        payoutRef: { not: null } // Only include payslips that have been processed
      },
      include: {
        employee: {
          include: {
            bank: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Take only 50 for the display table to avoid showing too many at once
    const payslips = allPayslips.slice(0, 50);

    // In a real implementation, you would get actual bank transaction amounts from a bank API
    // For simulation, let's introduce some discrepancies based on payoutRef
    const reconciliationData: ReconciliationData[] = payslips.map((payslip) => {
      // Simulate some variance in bank amounts for reconciliation purposes
      // Use the payoutRef to consistently determine if there's a discrepancy
      const hash = Array.from(payslip.payoutRef || '').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const randomValue = hash % 100;

      let bankAmount = payslip.netPay;
      let difference = 0;

      // Introduce discrepancies for some records based on the hash
      if (randomValue < 5) {
        // 5% of records have a small amount discrepancy
        const discrepancyPercent = (Math.random() * 0.05) - 0.025; // -2.5% to +2.5%
        bankAmount = payslip.netPay * (1 + discrepancyPercent);
        difference = bankAmount - payslip.netPay;
      }

      // Determine status based on difference and paid status
      let status = 'pending';
      if (payslip.paid) {
        status = Math.abs(difference) < 0.01 ? 'reconciled' : 'discrepancy'; // Less than 1 cent difference is reconciled
      }

      return {
        id: payslip.id,
        ref: payslip.payoutRef || 'unknown',
        date: payslip.createdAt,
        internalAmount: payslip.netPay,
        bankAmount: bankAmount, // Simulated bank amount
        difference: difference, // Difference between internal and bank amount
        status: status
      };
    });

    // Calculate the summary using ALL payslips, not just the 50 displayed
    const summary: ReconciliationSummary = allPayslips.reduce(
      (acc, payslip) => {
        acc.totalTransactions += 1;

        // Simulate the same logic for discrepancy detection for summary calculation
        const hash = Array.from(payslip.payoutRef || '').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        const randomValue = hash % 100;

        let difference = 0;
        if (randomValue < 5) {
          const discrepancyPercent = (Math.random() * 0.05) - 0.025;
          difference = payslip.netPay * discrepancyPercent;
        }

        if (payslip.paid) {
          if (Math.abs(difference) < 0.01) {
            acc.reconciled += 1;
          } else {
            acc.discrepancies += 1;
          }
        } else {
          acc.pending += 1;
        }

        return acc;
      },
      { totalTransactions: 0, reconciled: 0, pending: 0, discrepancies: 0 } as ReconciliationSummary
    );

    return new Response(JSON.stringify({ 
      reconciliationData: reconciliationData.map(item => ({
        ...item,
        date: item.date.toISOString() // Convert Date to string for JSON serialization
      })),
      summary 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching reconciliation data:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch reconciliation data' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}