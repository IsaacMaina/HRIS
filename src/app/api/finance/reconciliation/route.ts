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

// This is a mock function to simulate checking payment status with a bank
async function checkBankPaymentStatus(payoutRef: string): Promise<'SUCCESS' | 'FAILED'> {
  // In a real application, this would involve an API call to a payment gateway or bank
  // For simulation, we'll randomly fail some payments
  return Math.random() > 0.2 ? 'SUCCESS' : 'FAILED';
}

export async function POST(request: NextRequest) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || session.user.role !== 'FINANCE') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { paymentReferences } = await request.json();

    if (!paymentReferences || !Array.isArray(paymentReferences)) {
      return new Response(JSON.stringify({ error: 'paymentReferences is required and must be an array' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const reconciliationIssues: { payoutRef: string; reason: string }[] = [];

    for (const payoutRef of paymentReferences) {
      const paymentStatus = await checkBankPaymentStatus(payoutRef);

      if (paymentStatus === 'FAILED') {
        reconciliationIssues.push({ payoutRef, reason: 'Payment failed at the bank' });

        // Find all finance users to notify them
        const financeUsers = await prisma.user.findMany({
          where: {
            role: 'FINANCE',
          },
        });

        // Create notifications for each finance user
        for (const user of financeUsers) {
          await prisma.notification.create({
            data: {
              title: 'Payment Reconciliation Issue',
              message: `Payment with reference ${payoutRef} has failed. Please investigate.`,
              type: 'RECONCILIATION_ISSUE',
              recipientId: user.id,
            },
          });
        }
      }
    }

    if (reconciliationIssues.length > 0) {
      return new Response(JSON.stringify({
        message: 'Reconciliation process completed with issues.',
        issues: reconciliationIssues,
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: 'Reconciliation process completed successfully.' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error during payment reconciliation:', error);
    return new Response(JSON.stringify({ error: 'Failed to perform payment reconciliation' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
