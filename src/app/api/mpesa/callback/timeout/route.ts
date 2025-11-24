// src/app/api/mpesa/callback/timeout/route.ts
import { NextRequest } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    console.log('M-Pesa Timeout Callback received:', JSON.stringify(payload, null, 2));

    // Process STK Push timeout
    if (payload && payload.Body && payload.Body.stkCallback) {
      const { MerchantRequestID, CheckoutRequestID } = payload.Body.stkCallback;

      console.log(`STK Timeout received - Request ID: ${MerchantRequestID}`);

      // Update payout status in database to failed due to timeout
      const payout = await prisma.payout.findFirst({
        where: {
          OR: [
            { transactionId: MerchantRequestID },
            { transactionId: CheckoutRequestID }
          ]
        }
      });

      if (payout) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'FAILED',
          }
        });

        console.log(`STK Payout marked as FAILED due to timeout`);
      }
    }
    // Handle B2C timeout
    else if (payload && payload.OriginatorConversationID) {
      const { OriginatorConversationID, ConversationID, TransactionID } = payload;

      console.log(`B2C Timeout received - Conversation ID: ${ConversationID || OriginatorConversationID}`);

      // Update payout status in database to failed due to timeout
      const payout = await prisma.payout.findFirst({
        where: {
          OR: [
            { transactionId: ConversationID },
            { transactionId: OriginatorConversationID },
            { transactionId: TransactionID }
          ]
        }
      });

      if (payout) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'FAILED',
          }
        });

        console.log(`B2C Payout marked as FAILED due to timeout`);
      }
    }
    // Handle general transaction status timeout
    else if (payload && payload.TransactionID) {
      const { TransactionID, ConversationID } = payload;

      console.log(`Transaction Status Timeout received - Transaction ID: ${TransactionID}`);

      // Update payout status in database to failed due to timeout
      const payout = await prisma.payout.findFirst({
        where: {
          OR: [
            { transactionId: TransactionID },
            { transactionId: ConversationID }
          ]
        }
      });

      if (payout) {
        await prisma.payout.update({
          where: { id: payout.id },
          data: {
            status: 'FAILED',
          }
        });

        console.log(`Transaction Status Payout marked as FAILED due to timeout`);
      }
    }

    // Return success response to Safaricom
    return new Response(JSON.stringify({ "ResultCode": 0, "ResultDesc": "Accepted" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error processing timeout callback:', error);
    // Still return success to Safaricom to avoid retry attempts
    return new Response(JSON.stringify({ "ResultCode": 0, "ResultDesc": "Accepted" }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}