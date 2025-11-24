import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/authconfig';
import { initiateMpesaPayment } from '@/lib/daraja';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

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
    const { phone, amount, remarks } = body;

    if (!phone || !amount || !remarks) {
      return new Response(JSON.stringify({ error: 'Phone, amount, and remarks are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Process M-Pesa payment
    const response = await initiateMpesaPayment(
      amount,
      phone,
      remarks
    );

    return new Response(JSON.stringify({ 
      message: 'M-Pesa payment initiated successfully',
      conversationId: response.ConversationID,
      response
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing M-Pesa payment:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}