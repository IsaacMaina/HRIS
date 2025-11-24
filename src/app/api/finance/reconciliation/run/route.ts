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
// In a real system, this would be a fast API call to the payment provider
async function checkBankPaymentStatus(payoutRef: string): Promise<'SUCCESS' | 'FAILED' | 'PENDING'> {
  // In a real application, this would involve an API call to a payment gateway or bank
  // For simulation, we'll determine status based on the payoutRef to make it consistent
  // This ensures that the same payoutRef will always return the same status for consistency
  const hash = Array.from(payoutRef).reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const randomValue = hash % 100;

  if (randomValue < 70) {
    return 'SUCCESS'; // 70% success rate
  } else if (randomValue < 85) {
    return 'PENDING'; // 15% pending
  } else {
    return 'FAILED'; // 15% failure rate
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the session to verify user is authenticated
    const session = await getServerSession(authOptions as any) as CustomSession;

    if (!session || !session.user || !['ADMIN', 'FINANCE'].includes(session.user.role)) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get all payout references that haven't been reconciled yet
    const pendingPayouts = await prisma.payout.findMany({
      where: {
        status: 'PROCESSING', // or any other non-final status
      },
      select: {
        ref: true,
      }
    });

    // Also get payslips that have payout references but may not have corresponding payout records
    const payslipsWithPayoutRef = await prisma.payslip.findMany({
      where: {
        payoutRef: { not: null },
      },
      select: {
        payoutRef: true,
      }
    });

    // Combine all unique payout references to check
    const allPayoutRefs = [
      ...pendingPayouts.map(p => p.ref),
      ...payslipsWithPayoutRef.map(p => p.payoutRef as string)
    ].filter((ref, index, self) => self.indexOf(ref) === index); // Remove duplicates

    // Check all payment statuses in parallel for better performance
    const paymentStatusPromises = allPayoutRefs.map(payoutRef =>
      checkBankPaymentStatus(payoutRef).then(status => ({ payoutRef, status }))
    );

    const paymentStatusResults = await Promise.all(paymentStatusPromises);

    // Group all payout refs by status to update them in batches instead of individually
    const payoutsByStatus: Record<string, string[]> = {
      SUCCESS: [],
      FAILED: [],
      PENDING: []
    };

    for (const { payoutRef, status } of paymentStatusResults) {
      payoutsByStatus[status].push(payoutRef);
    }

    // Update payouts by status in batches to reduce database operations
    await prisma.$transaction([
      prisma.payout.updateMany({
        where: { ref: { in: payoutsByStatus.SUCCESS } },
        data: { status: 'SUCCESS' }
      }),
      prisma.payout.updateMany({
        where: { ref: { in: payoutsByStatus.FAILED } },
        data: { status: 'FAILED' }
      }),
      prisma.payout.updateMany({
        where: { ref: { in: payoutsByStatus.PENDING } },
        data: { status: 'PENDING' }
      })
    ]);

    // Update payslips based on reconciliation results
    await prisma.$transaction([
      prisma.payslip.updateMany({
        where: { payoutRef: { in: payoutsByStatus.SUCCESS } },
        data: { paid: true }
      }),
      prisma.payslip.updateMany({
        where: { payoutRef: { in: payoutsByStatus.FAILED } },
        data: { paid: false }
      })
    ]);

    // Handle failed payments: create notifications
    const reconciliationIssues = [];
    if (payoutsByStatus.FAILED.length > 0) {
      const financeUsers = await prisma.user.findMany({
        where: {
          role: 'FINANCE',
        },
      });

      // Create notifications for failed payments in batch
      const notificationPromises = [];
      for (const payoutRef of payoutsByStatus.FAILED) {
        reconciliationIssues.push({ payoutRef, reason: 'Payment failed at the bank' });

        for (const user of financeUsers) {
          notificationPromises.push(
            prisma.notification.create({
              data: {
                title: 'Payment Reconciliation Issue',
                message: `Payment with reference ${payoutRef} has failed. Please investigate.`,
                type: 'RECONCILIATION_ISSUE',
                recipientId: user.id,
              },
            })
          );
        }
      }

      if (notificationPromises.length > 0) {
        await Promise.all(notificationPromises);
      }
    }

    // Get full details for pending and discrepancy items for better reporting
    const successfulResults = paymentStatusResults.filter(r => r.status === 'SUCCESS');
    const pendingResults = paymentStatusResults.filter(r => r.status === 'PENDING');
    const failedResults = paymentStatusResults.filter(r => r.status === 'FAILED');

    // Log the reconciliation activity
    if (session.user.id) {
      const sessionEmployee = await prisma.employee.findFirst({
        where: { userId: session.user.id }
      });

      if (sessionEmployee) {
        await prisma.activity.create({
          data: {
            employeeId: sessionEmployee.id,
            actionType: 'UPDATE',
            description: `Ran reconciliation for ${allPayoutRefs.length} transactions`,
            module: 'RECONCILIATION',
            details: {
              action: 'RUN_RECONCILIATION',
              totalTransactions: allPayoutRefs.length,
              issuesFound: reconciliationIssues.length,
              successful: successfulResults.length,
              pending: pendingResults.length,
              failed: failedResults.length,
            }
          }
        });
      }
    }

    return new Response(JSON.stringify({
      message: 'Reconciliation process completed successfully.',
      totalProcessed: allPayoutRefs.length,
      results: paymentStatusResults,
      issues: reconciliationIssues,
      summary: {
        total: allPayoutRefs.length,
        successful: successfulResults.length,
        pending: pendingResults.length,
        failed: failedResults.length,
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error during reconciliation:', error);
    return new Response(JSON.stringify({ error: 'Failed to perform reconciliation' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}